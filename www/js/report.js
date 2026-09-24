/* =============================================
   js/report.js — Rapport PDF pour le médecin
   =============================================
   jsPDF est embarqué dans www/vendor/ (fonctionne hors ligne, aucun CDN)
   et chargé seulement au moment de générer le rapport.
   ============================================= */

function loadJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = 'vendor/jspdf.umd.min.js';
    s.onload = function() { window.jspdf ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF absent')); };
    s.onerror = function() { reject(new Error('Chargement de jsPDF impossible')); };
    document.head.appendChild(s);
  });
}

var _reportBusy = false;
async function generateDoctorReport() {
  var u = getUser();
  if (!u) return;
  if (!u.periods || !u.periods.length) { showToast('Enregistrez au moins un cycle avant de générer le rapport.', 'err'); return; }
  if (_reportBusy) return;
  _reportBusy = true;
  showToast('Création du rapport…');
  try {
    var JsPDF = await loadJsPdf();
    var doc = await buildDoctorReport(JsPDF, u);
    var blob = doc.output('blob');
    await FileSaver.save('CycleCare-rapport-' + todayStr() + '.pdf', blob, 'application/pdf', 'Rapport CycleCare');
  } catch (e) {
    console.error(e);
    showToast('La création du rapport a échoué. Réessayez.', 'err');
  } finally {
    _reportBusy = false;
  }
}

async function buildDoctorReport(JsPDF, u) {
  var doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  var PW = 210, M = 16, y = 0, CW = PW - 2 * M;
  var PRIMARY = [139, 34, 82], GREY = [110, 110, 110], LIGHT = [248, 240, 246];

  function ensure(h) { if (y + h > 280) { doc.addPage(); y = 18; } }
  /* keep : hauteur du contenu qui suit, pour ne jamais laisser un titre seul en bas de page */
  function h2(t, keep) {
    ensure(14 + (keep || 12)); y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor.apply(doc, PRIMARY);
    doc.text(t, M, y); y += 2;
    doc.setDrawColor(228, 216, 236); doc.setLineWidth(0.4); doc.line(M, y, PW - M, y); y += 6;
    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  }
  function para(t, color) {
    doc.setFontSize(10); doc.setTextColor.apply(doc, color || [30, 30, 30]);
    var lines = doc.splitTextToSize(t, CW);
    ensure(lines.length * 5); doc.text(lines, M, y); y += lines.length * 5;
    doc.setTextColor(30, 30, 30);
  }
  function table(head, rows, widths) {
    var rowH = 7;
    ensure(rowH * 2);
    doc.setFillColor.apply(doc, LIGHT); doc.rect(M, y - 5, CW, rowH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor.apply(doc, PRIMARY);
    var x = M; head.forEach(function(h, i) { doc.text(h, x + 2, y); x += widths[i]; });
    y += rowH; doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    rows.forEach(function(r) {
      var cells = r.map(function(c, i) { return doc.splitTextToSize(String(c == null ? '–' : c), widths[i] - 4); });
      var h = Math.max.apply(null, cells.map(function(c) { return c.length; })) * 4.3 + 2.7;
      ensure(h);
      var xx = M; cells.forEach(function(c, i) { doc.text(c, xx + 2, y); xx += widths[i]; });
      doc.setDrawColor(236, 228, 240); doc.line(M, y + h - 4.5, PW - M, y + h - 4.5);
      y += h;
    });
    y += 2;
  }
  async function chart(svgFn, w, h) {
    var png = await svgToPngDataUrl(svgFn(), w, h, 2);
    var hmm = CW * h / w;
    ensure(hmm + 4);
    doc.addImage(png, 'JPEG', M, y - 2, CW, hmm);
    y += hmm + 3;
  }

  /* ---- En-tête ---- */
  doc.setFillColor.apply(doc, PRIMARY); doc.rect(0, 0, PW, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('Rapport de suivi du cycle menstruel', M, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Patiente : ' + (u.name || '–') + '     Édité le ' + fmtDate(todayStr()) + '     CycleCare', M, 23);
  y = 40; doc.setTextColor(30, 30, 30);

  /* ---- Synthèse ---- */
  var hist = getCycleHistory();
  var lens = hist.filter(function(c) { return c.cycleLen; }).map(function(c) { return c.cycleLen; });
  var durs = hist.filter(function(c) { return c.periodLen; }).map(function(c) { return c.periodLen; });
  var rel = computeCycleReliability();
  var lp = getLastPeriod(), cl = getCycleLen();
  var next = getPredictedNextPeriod();
  var dup = getDaysUntilPeriod(lp.start, cl);

  h2('Synthèse');
  var summary = [
    ['Cycles enregistrés', String(hist.length) + (hist.length ? ' (depuis le ' + fmtDate(hist[0].start) + ')' : '')],
    ['Durée moyenne du cycle', lens.length ? Math.round(avg(lens)) + ' jours (min ' + Math.min.apply(null, lens) + ', max ' + Math.max.apply(null, lens) + ')' : 'données insuffisantes'],
    ['Régularité', rel.label + (rel.stdDev != null ? ' (écart-type ' + rel.stdDev.toFixed(1) + ' j)' : '')],
    ['Durée moyenne des règles', durs.length ? (Math.round(avg(durs) * 10) / 10) + ' jours' : 'non renseignée'],
    ['Dernières règles', fmtDate(lp.start) + (lp.end ? ' au ' + fmtDate(lp.end) : ' (en cours ou fin non renseignée)')],
    ['Prochaines règles estimées', next ? fmtDate(next.date) + (next.hasDelay ? ' (décalage possible : ' + next.medName + ')' : '') : '–'],
    ['Durée de cycle utilisée', cl + ' jours (réglage)']
  ];
  if (dup !== null && dup < 0) summary.push(['Retard actuel', Math.abs(dup) + ' jour(s)']);
  summary.forEach(function(r) {
    ensure(6);
    doc.setFont('helvetica', 'bold'); doc.text(r[0], M, y);
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(r[1], CW - 62), M + 62, y);
    y += 6;
  });

  /* ---- Derniers cycles ---- */
  h2('Derniers cycles');
  var lastCycles = hist.slice(-6).reverse();
  table(['Début', 'Fin', 'Règles', 'Cycle', 'Flux', 'Symptômes pendant le cycle'],
    lastCycles.map(function(c) {
      var endC = c.cycleLen ? addDays(c.start, c.cycleLen - 1) : todayStr();
      var syms = {};
      (u.symptoms || []).forEach(function(s) {
        if (s.date >= c.start && s.date <= endC) (s.items || []).forEach(function(i) { syms[i] = (syms[i] || 0) + 1; });
      });
      var top = Object.keys(syms).sort(function(a, b) { return syms[b] - syms[a]; }).slice(0, 4).join(', ');
      return [fmtShort(c.start), c.end ? fmtShort(c.end) : '–', c.periodLen ? c.periodLen + ' j' : '–',
              c.cycleLen ? c.cycleLen + ' j' : 'en cours', c.flow ? flowTxt(c.flow) : '–', top || '–'];
    }),
    [24, 22, 18, 20, 26, CW - 110]);

  /* ---- Graphiques ---- */
  if (lens.length >= 2) {
    h2('Longueur des cycles', 72);
    var items = hist.filter(function(c) { return c.cycleLen; }).slice(-12).map(function(c) {
      return { label: fmtShort(c.start), value: c.cycleLen, color: c.cycleLen < 21 || c.cycleLen > 35 ? CHART_PAL_PRINT.accent : null };
    });
    await chart(function() { return chartBars(items, { pal: CHART_PAL_PRINT, w: 640, h: 220, fixed: true, avg: Math.round(avg(lens)), band: [21, 35] }); }, 640, 220);
    para('Zone verte : longueur habituelle (21 à 35 jours). Ligne orange : moyenne.', GREY);
  }
  var ta = getTemperatureAnalysis(90);
  if (ta && ta.points.length >= 5) {
    h2('Température basale (90 derniers jours)', 72);
    await chart(function() {
      return chartLine(ta.points, { pal: CHART_PAL_PRINT, w: 640, h: 220, fixed: true,
        cover: ta.shift ? ta.shift.cover : null,
        marker: ta.shift ? { date: ta.shift.ovulation, label: 'ovulation probable' } : null });
    }, 640, 220);
    para(ta.shift ? 'Hausse thermique détectée le ' + fmtDate(ta.shift.date) + ' (règle 3 au-dessus des 6).'
                  : 'Pas de hausse thermique nette détectée sur la période.', GREY);
  }

  /* ---- Symptômes ---- */
  var sp = getSymptomsByPhase().slice(0, 10);
  if (sp.length) {
    h2('Symptômes les plus fréquents');
    table(['Symptôme', 'Total', 'Règles', 'Favorable', 'Attention', 'Fertile'],
      sp.map(function(s) { return [s.symptom, s.total, s.counts.period, s.counts.safe, s.counts.caution, s.counts.danger]; }),
      [CW - 110, 20, 22, 24, 22, 22]);
  }

  /* ---- Médicaments ---- */
  var sixMonths = addDays(todayStr(), -183);
  var meds = (u.medications || []).filter(function(m) { return m.date >= sixMonths; })
    .sort(function(a, b) { return a.date < b.date ? 1 : -1; });
  if (meds.length) {
    h2('Médicaments (6 derniers mois)');
    table(['Date', 'Médicament', 'Notes'],
      meds.map(function(m) { var info = MEDS_DATA[m.type] || {}; return [fmtDate(m.date), m.name || info.name || m.type, m.notes || '']; }),
      [34, 60, CW - 94]);
  }

  /* ---- Rapports non protégés (cycle en cours) ---- */
  var unprot = (u.rapports || []).filter(function(r) { return !r.protected && r.date >= lp.start; });
  if (unprot.length) {
    h2('Cycle en cours');
    para(unprot.length + ' rapport(s) non protégé(s) depuis le début des dernières règles (' + unprot.map(function(r) { return fmtShort(r.date); }).join(', ') + ').');
  }

  /* ---- Notes ---- */
  var notes = hist.filter(function(c) { return c.notes; }).slice(-5).reverse();
  if (notes.length) {
    h2('Notes de la patiente');
    notes.forEach(function(c) { para('• ' + fmtShort(c.start) + ' : ' + c.notes); });
  }

  /* ---- Pied de page sur chaque page ---- */
  var pages = doc.getNumberOfPages();
  for (var i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor.apply(doc, GREY);
    doc.text('Données saisies par la patiente dans CycleCare. Les phases du cycle sont des estimations et ne remplacent pas un avis médical.', M, 290);
    doc.text('Page ' + i + ' / ' + pages, PW - M, 290, { align: 'right' });
  }
  return doc;
}
