/* =============================================
   js/stats.js — Statistiques et graphiques
   ============================================= */

/* Historique des cycles, du plus ancien au plus récent.
   periodLen : durée RÉELLE des règles (null si fin inconnue ou estimée)
   cycleLen  : jours jusqu'aux règles suivantes (null pour le cycle en cours) */
function getCycleHistory() {
  var u = getUser(); if (!u) return [];
  var ps = (u.periods || []).filter(function(p) { return p.start; })
    .slice().sort(function(a, b) { return a.start < b.start ? -1 : 1; });
  return ps.map(function(p, i) {
    var next = ps[i + 1];
    var cl = next ? diffDays(p.start, next.start) : null;
    return {
      start: p.start, end: p.end || null, flow: p.flow || null, notes: p.notes || null,
      periodLen: p.end && !p.endEstimated ? diffDays(p.start, p.end) + 1 : null,
      cycleLen: cl && cl >= 15 && cl <= 60 ? cl : null
    };
  });
}

function avg(arr) { return arr.length ? arr.reduce(function(a, b) { return a + b; }, 0) / arr.length : null; }

/* Phase simplifiée pour les regroupements */
function phaseOf(dateStr) {
  var u = getUser(); if (!u || !u.periods || !u.periods.length) return null;
  var z = getZoneForDate(dateStr, u.periods, getCycleLen());
  if (!z) return null;
  return z === 'safe1' || z === 'safe2' ? 'safe' : z;
}
var PHASES = [
  { id: 'period',  lbl: 'Règles',     color: CHART_PAL_SCREEN.period },
  { id: 'safe',    lbl: 'Favorable',  color: CHART_PAL_SCREEN.safe },
  { id: 'caution', lbl: 'Attention',  color: CHART_PAL_SCREEN.caution },
  { id: 'danger',  lbl: 'Fertile',    color: CHART_PAL_SCREEN.danger }
];

/* Symptômes × phase : [{symptom, total, counts:{period,safe,caution,danger}}] */
function getSymptomsByPhase() {
  var u = getUser(); if (!u) return [];
  var map = {};
  (u.symptoms || []).forEach(function(s) {
    var ph = phaseOf(s.date); if (!ph) return;
    (s.items || []).forEach(function(it) {
      map[it] = map[it] || { symptom: it, total: 0, counts: { period: 0, safe: 0, caution: 0, danger: 0 } };
      map[it].counts[ph]++; map[it].total++;
    });
  });
  return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return b.total - a.total; });
}

/* Humeur moyenne par phase */
function getMoodByPhase() {
  var u = getUser(); if (!u) return [];
  var acc = {};
  (u.moods || []).forEach(function(m) {
    var ph = phaseOf(m.date); if (!ph || typeof m.value !== 'number') return;
    acc[ph] = acc[ph] || []; acc[ph].push(m.value);
  });
  return PHASES.filter(function(p) { return acc[p.id]; }).map(function(p) {
    return { label: p.lbl, value: Math.round(avg(acc[p.id]) * 10) / 10, color: p.color };
  });
}

/* Température basale : points récents + détection de la hausse post-ovulatoire
   (règle « 3 au-dessus des 6 » : 3 jours consécutifs au-dessus du maximum des
   6 jours précédents, le 3e au moins 0,2 °C au-dessus). */
function getTemperatureAnalysis(days) {
  var u = getUser(); if (!u) return null;
  var since = addDays(todayStr(), -(days || 60));
  var pts = (u.temperatures || [])
    .filter(function(t) { return t.date && t.date >= since && !isNaN(parseFloat(t.value)); })
    .map(function(t) { return { date: t.date, value: parseFloat(t.value) }; })
    .sort(function(a, b) { return a.date < b.date ? -1 : 1; });
  /* une mesure par jour (la dernière) */
  var byDay = {}; pts.forEach(function(p) { byDay[p.date] = p; });
  pts = Object.keys(byDay).sort().map(function(k) { return byDay[k]; });
  if (pts.length < 3) return { points: pts, shift: null };
  var shift = null;
  for (var i = 6; i + 2 < pts.length; i++) {
    var base = Math.max.apply(null, pts.slice(i - 6, i).map(function(p) { return p.value; }));
    if (pts[i].value > base && pts[i + 1].value > base && pts[i + 2].value >= base + 0.2) {
      shift = { date: pts[i].date, ovulation: addDays(pts[i].date, -1), cover: base };
    }
  }
  return { points: pts, shift: shift };
}

/* =============================================
   ÉCRAN STATISTIQUES
   ============================================= */
function renderStats() {
  var u = getUser(); if (!u) return '';
  var hist = getCycleHistory();
  var lens = hist.filter(function(c) { return c.cycleLen; }).map(function(c) { return c.cycleLen; });
  var durs = hist.filter(function(c) { return c.periodLen; }).map(function(c) { return c.periodLen; });
  var rel  = computeCycleReliability();
  var html = '';

  /* Chiffres clés */
  html += '<div class="stat-grid">'
    + statCard('Cycle moyen', lens.length ? Math.round(avg(lens)) : '–', lens.length ? 'jours (' + lens.length + ' cycle' + (lens.length > 1 ? 's' : '') + ')' : 'pas encore de données', '')
    + statCard('Règles', durs.length ? Math.round(avg(durs) * 10) / 10 : '–', durs.length ? 'jours en moyenne' : 'indiquez la fin des règles', '')
    + statCard('Régularité', rel.stdDev != null ? '±' + rel.stdDev.toFixed(1) : '–', rel.label, '')
    + statCard('Cycles suivis', hist.length, 'depuis le ' + fmtShort(hist.length ? hist[0].start : todayStr()), '')
    + '</div>';

  /* Rapport médecin */
  html += '<div class="card report-cta">'
    + '<div style="flex:1;min-width:0;"><div style="font-weight:700;">Rapport pour votre médecin</div>'
    + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;">PDF : derniers cycles, durées, symptômes, température, médicaments.</div></div>'
    + '<button class="btn btn-primary btn-sm" onclick="generateDoctorReport()"><i class="ti ti-file-type-pdf" aria-hidden="true"></i> Générer</button>'
    + '</div>';

  /* Longueur des cycles */
  html += '<div class="sec-title">Longueur des cycles</div><div class="card">';
  if (lens.length) {
    var items = hist.filter(function(c) { return c.cycleLen; }).slice(-12).map(function(c) {
      var out = c.cycleLen < 21 || c.cycleLen > 35;
      return { label: fmtShort(c.start), value: c.cycleLen, color: out ? CHART_PAL_SCREEN.accent : null };
    });
    html += chartBars(items, { unit: '', avg: Math.round(avg(lens)), band: [21, 35], min: 0, label: 'Longueur des cycles' })
      + '<div class="chart-note"><span class="dot" style="background:var(--z-safe-bg)"></span> zone habituelle 21–35 jours'
      + ' · <span class="dot" style="background:' + CHART_PAL_SCREEN.accent + '"></span> hors de cette zone</div>';
  } else {
    html += empty('Enregistrez au moins 2 débuts de règles pour voir la longueur de vos cycles.');
  }
  html += '</div>';

  /* Durée des règles */
  html += '<div class="sec-title">Durée des règles</div><div class="card">';
  if (durs.length) {
    var ditems = hist.filter(function(c) { return c.periodLen; }).slice(-12).map(function(c) {
      return { label: fmtShort(c.start), value: c.periodLen, color: CHART_PAL_SCREEN.period };
    });
    html += chartBars(ditems, { unit: ' j', avg: Math.round(avg(durs) * 10) / 10, label: 'Durée des règles' });
  } else {
    html += empty('Indiquez la date de fin de vos règles (« Terminer mes règles ») pour suivre leur durée.');
  }
  html += '</div>';

  /* Température */
  var ta = getTemperatureAnalysis(60);
  html += '<div class="sec-title">Température basale (60 jours)</div><div class="card">';
  if (ta && ta.points.length >= 3) {
    html += chartLine(ta.points, {
      cover: ta.shift ? ta.shift.cover : null,
      marker: ta.shift ? { date: ta.shift.ovulation, label: 'ovulation probable' } : null,
      label: 'Température basale'
    });
    html += '<div class="chart-note">' + (ta.shift
      ? 'Hausse de température détectée le <strong>' + fmtShort(ta.shift.date) + '</strong> : l\'ovulation a probablement eu lieu vers le ' + fmtShort(ta.shift.ovulation)
      : 'Aucune hausse nette détectée. Mesurez chaque matin au réveil, avant de vous lever, pour une courbe fiable.') + '</div>';
  } else {
    html += empty('Enregistrez votre température au moins 3 matins pour voir la courbe.');
  }
  html += '</div>';

  /* Symptômes par phase */
  var sp = getSymptomsByPhase().slice(0, 8);
  html += '<div class="sec-title">Symptômes selon la phase</div><div class="card">';
  if (sp.length) {
    var maxC = Math.max.apply(null, sp.map(function(s) { return Math.max(s.counts.period, s.counts.safe, s.counts.caution, s.counts.danger); }));
    html += '<div class="heat-table" role="table"><div class="heat-row heat-head" role="row"><div role="columnheader"></div>'
      + PHASES.map(function(p) { return '<div role="columnheader"><span class="dot" style="background:' + p.color + '"></span>' + p.lbl + '</div>'; }).join('') + '</div>';
    sp.forEach(function(s) {
      html += '<div class="heat-row" role="row"><div class="heat-lbl" role="rowheader">' + esc(s.symptom) + '</div>'
        + PHASES.map(function(p) {
            var c = s.counts[p.id], a = c ? 0.18 + 0.82 * c / maxC : 0;
            return '<div role="cell" class="heat-cell" style="background:' + p.color + ';--a:' + a.toFixed(2) + ';" title="' + c + ' fois">' + (c || '') + '</div>';
          }).join('') + '</div>';
    });
    html += '</div><div class="chart-note">Nombre de jours où chaque symptôme a été noté, par phase du cycle.</div>';
  } else {
    html += empty('Enregistrez vos symptômes pour découvrir à quel moment du cycle ils apparaissent.');
  }
  html += '</div>';

  /* Humeur par phase */
  var mp = getMoodByPhase();
  if (mp.length) {
    html += '<div class="sec-title">Humeur moyenne selon la phase</div><div class="card">'
      + chartBars(mp, { unit: '', min: 0, h: 190, label: 'Humeur moyenne par phase' })
      + '<div class="chart-note">Sur 10. Basé sur ' + (u.moods || []).length + ' saisie(s) d\'humeur.</div></div>';
  }

  /* Retards */
  var delays = getPeriodDelays();
  html += '<div class="sec-title">Retards de règles</div>';
  if (!delays.length) {
    html += '<div class="card card-sm"><div style="font-size:13px;color:var(--text-3);">Aucun retard enregistré.</div></div>';
  } else {
    html += '<div class="card" style="padding:4px 14px;">'
      + '<div style="font-size:13px;font-weight:600;margin:10px 0 4px;">Retard moyen : ' + getAverageDelay() + ' jour(s)</div>';
    delays.slice(0, 6).forEach(function(d) {
      html += '<div class="list-item" style="padding:8px 0;">'
        + '<div class="item-icon item-icon-amber" style="width:32px;height:32px;border-radius:8px;font-size:16px;"><i class="ti ti-calendar-off" aria-hidden="true"></i></div>'
        + '<div style="flex:1;"><div class="item-label">Retard de ' + d.delay + ' jour' + (d.delay > 1 ? 's' : '') + '</div>'
        + '<div class="item-sub">Prévues le ' + fmtShort(d.expected) + ' · arrivées le ' + fmtShort(d.actual) + '</div></div></div>';
    });
    html += '</div>';
  }
  return html;
}
