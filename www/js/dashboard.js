/* =============================================
   js/dashboard.js — Tableau de bord
   ============================================= */
function renderAccueil() {
  var u     = getUser(); if (!u) return '';
  var lp    = getLastPeriod();
  var today = todayStr();
  var cl    = getCycleLen();
  var main  = '', side = '';

  if (lp) {
    var dup  = getDaysUntilPeriod(lp.start, cl);
    var pred = getPredictedNextPeriod();

    /* Carte principale : anneau du cycle + phase + prochaines règles
       (fusion des anciennes cartes « phase », « règles en cours » et chiffres) */
    main += renderCycleHero(u, lp, cl, dup, pred);

    /* 7 prochains jours */
    main += renderWeeklyStrip();

    /* Mini-calendrier du mois (grand écran uniquement : sur mobile, onglet Calendrier) */
    main += '<div class="desktop-only">' + renderMiniMonth() + '</div>';

    /* Médicament : règles décalées */
    if (pred && pred.hasDelay) {
      main += infoAlert('ti-pill', 'Règles possiblement décalées',
        'Suite à la prise de contraceptif d\'urgence — attendues vers le <strong>' + fmtShort(pred.date) + '</strong>.', '#6c3483');
    }
    /* Test de grossesse */
    if (shouldRecommendTest()) {
      main += '<div class="test-banner">'
        + '<div class="test-banner-title"><i class="ti ti-flask" aria-hidden="true"></i> Test de grossesse recommandé</div>'
        + '<div class="test-banner-desc">Vos règles ont plus de 7 jours de retard. Un test urinaire (disponible en pharmacie) vous donnera une réponse fiable.</div>'
        + '</div>';
    }
  } else {
    main += '<div class="card" style="text-align:center;padding:28px 20px;">'
      + '<i class="ti ti-calendar-heart" style="font-size:48px;color:var(--primary);opacity:0.4;display:block;margin-bottom:12px;" aria-hidden="true"></i>'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:6px;">Commencez votre suivi</div>'
      + '<div style="font-size:13px;color:var(--text-3);margin-bottom:16px;line-height:1.5;">Enregistrez vos dernières règles pour activer le calendrier et les estimations.</div>'
      + '<button class="btn btn-primary" onclick="openModal(\'logPeriod\')">'
      + '<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer mes règles</button>'
      + '</div>';
  }

  /* Risque grossesse (uniquement les rapports du cycle en cours) */
  var risk = calcRisk();
  if (risk && risk.level !== 'none' && risk.level !== 'faible') {
    var high = risk.level === 'eleve' || risk.level === 'tres_eleve';
    main += '<div class="risk-banner ' + (high ? 'risk-high' : 'risk-med') + '">'
      + '<div class="risk-title"><i class="ti ' + (high ? 'ti-alert-circle' : 'ti-alert-triangle') + '" aria-hidden="true"></i>'
      + (risk.level === 'tres_eleve' ? 'Risque de grossesse très élevé'
        : risk.level === 'eleve'     ? 'Risque de grossesse élevé'
        :                              'Risque modéré — contraceptif pris après') + '</div>'
      + '<div class="risk-desc">'
      + (risk.events.length ? risk.events.length + ' rapport(s) non protégé(s) en période fertile depuis vos dernières règles. ' : '')
      + (risk.daysLate > 5 ? 'Règles en retard de <strong>' + risk.daysLate + ' jours</strong>. ' : '')
      + (high ? 'Faites un test de grossesse si les règles ne reviennent pas.' : '')
      + '</div></div>';
  }

  /* Actions rapides (sur ordinateur ; sur mobile → bouton « + ») */
  main += '<div class="desktop-only"><div class="sec-title">Actions rapides</div>' + quickAddGrid(true) + '</div>';

  /* ---- Colonne secondaire ---- */
  if (lp) side += renderCycleNumbers(lp, cl);
  if (lp) side += renderReliabilityBadge();

  /* Ovulation (fenêtre du cycle EN COURS, pas du tout premier cycle) */
  if (lp) {
    var cs = currentCycleStart(lp.start, cl);
    var ovWindow = getOvulationWindow(cs, cl);
    var daysToOv = diffDays(today, ovWindow.peak);
    if (daysToOv >= -2 && daysToOv <= 2) {
      var ovMsg = daysToOv === 0 ? 'Vous êtes probablement en ovulation aujourd\'hui.'
                 : daysToOv > 0 ? 'Ovulation prévue dans ' + daysToOv + ' jour' + (daysToOv > 1 ? 's' : '')
                 : 'Ovulation il y a ' + Math.abs(daysToOv) + ' jour' + (Math.abs(daysToOv) > 1 ? 's' : '');
      side += '<div class="card" style="border-left:3px solid #e91e63;">'
        + '<div style="display:flex;align-items:flex-start;gap:10px;">'
        + '<i class="ti ti-flower" style="font-size:20px;color:#e91e63;flex-shrink:0;margin-top:1px;" aria-hidden="true"></i>'
        + '<div style="flex:1;">'
        + '<div style="font-size:13px;font-weight:700;color:#e91e63;">Période d\'ovulation</div>'
        + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;line-height:1.4;">' + ovMsg
        + ' · Fenêtre fertile du ' + fmtShort(ovWindow.start) + ' au ' + fmtShort(ovWindow.end) + '</div></div></div></div>';
    }
  }

  /* Conseil du jour */
  var dailyTip = getDailyTip();
  if (dailyTip) {
    side += '<div class="card tip-card">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;">'
      + '<i class="ti ti-lightbulb" style="font-size:20px;color:#00b894;flex-shrink:0;margin-top:1px;" aria-hidden="true"></i>'
      + '<div style="flex:1;">'
      + '<div style="font-size:13px;font-weight:700;color:#00b894;">Conseil du jour</div>'
      + '<div style="font-size:12.5px;font-weight:600;margin-top:2px;line-height:1.4;">' + esc(dailyTip.title) + '</div>'
      + '<div style="font-size:12px;color:var(--text-3);margin-top:4px;line-height:1.45;">' + esc(dailyTip.content.substring(0, 140)) + '…</div>'
      + '<button class="link-btn" onclick="go(\'conseils\')">Tous les conseils</button></div></div></div>';
  }

  /* Activité récente */
  side += '<div class="sec-title">Activité récente</div>'
    + '<div class="card card-sm">' + renderRecentActivity() + '</div>';

  return '<div class="dash-grid"><div class="dash-main">' + main + '</div><div class="dash-side">' + side + '</div></div>';
}

/* ---- Mon cycle en chiffres ---- */
function renderCycleNumbers(lp, cl) {
  var hist = getCycleHistory();
  var lens = hist.filter(function(c) { return c.cycleLen; }).map(function(c) { return c.cycleLen; });
  var durs = hist.filter(function(c) { return c.periodLen; }).map(function(c) { return c.periodLen; });
  var cs   = currentCycleStart(lp.start, cl);
  var ov   = getOvulationWindow(cs, cl);
  var today = todayStr();
  if (ov.peak < today) ov = getOvulationWindow(addDays(cs, cl), cl); /* ovulation passée → celle du prochain cycle */
  var tile = function(val, lbl) { return '<div class="num-tile"><div class="num-val">' + val + '</div><div class="num-lbl">' + lbl + '</div></div>'; };
  return '<div class="sec-title sec-title-row">Mon cycle en chiffres<button class="link-btn" onclick="go(\'stats\')">Statistiques</button></div>'
    + '<div class="card num-card">'
    + tile(lens.length ? Math.round(avg(lens)) + ' j' : cl + ' j', lens.length ? 'cycle moyen' : 'cycle (réglage)')
    + tile(durs.length ? (Math.round(avg(durs) * 10) / 10) + ' j' : getEstimatedPeriodDur() + ' j', 'durée des règles')
    + tile(fmtShort(ov.peak), 'prochaine ovulation')
    + tile(hist.length, 'cycle' + (hist.length > 1 ? 's' : '') + ' suivi' + (hist.length > 1 ? 's' : ''))
    + '</div>';
}

/* Début du cycle en cours (si plusieurs cycles prévus sont passés sans saisie) */
function currentCycleStart(lastStart, cl) {
  var d = diffDays(lastStart, todayStr());
  return d >= 0 ? addDays(lastStart, Math.floor(d / cl) * cl) : lastStart;
}

/* ---- Carte principale du tableau de bord ---- */
function renderCycleHero(u, lp, cl, dup, pred) {
  var today = todayStr();
  var late  = dup !== null && dup < 0;
  /* En retard : on reste sur le cycle des dernières règles (pas de "nouveau cycle" inventé) */
  var cs    = late ? lp.start : currentCycleStart(lp.start, cl);
  var dayIx = diffDays(cs, today);                 /* 0 = J1 */
  var zones = [];
  for (var i = 0; i < cl; i++) zones.push(getZoneForDate(addDays(cs, i), u.periods, cl) || 'safe1');
  var zone  = late ? null : zones[Math.min(dayIx, cl - 1)];
  var zi    = zone ? ZONE_INFO[zone] : null;
  var ap    = getActivePeriod();

  var chip  = late ? '<span class="zone-chip zc-danger">Règles en retard</span>'
                   : '<span class="zone-chip ' + zi.chipCls + '"><i class="ti ' + zi.icon + '" aria-hidden="true"></i>' + zi.lbl + '</span>';
  var nextTxt = late
    ? 'Règles en retard de <strong>' + Math.abs(dup) + ' jour' + (Math.abs(dup) > 1 ? 's' : '') + '</strong>'
    : dup === 0 ? 'Règles attendues <strong>aujourd\'hui</strong>'
    : 'Prochaines règles dans <strong>' + dup + ' jour' + (dup > 1 ? 's' : '') + '</strong> · ' + fmtShort(pred ? pred.date : addDays(lp.start, cl));

  var action = '';
  if (ap) {
    var since = diffDays(ap.start, today) + 1;
    action = '<div class="hero-action"><div style="font-size:12px;color:var(--text-2);">'
      + (ap.endEstimated ? 'Fin des règles à confirmer' : 'Règles en cours depuis ' + since + ' jour' + (since > 1 ? 's' : ''))
      + '</div><button class="btn btn-sm btn-primary" onclick="openModal(\'endPeriod\')"><i class="ti ti-flag-2" aria-hidden="true"></i> Terminer mes règles</button></div>';
  }

  return '<div class="card hero-card ' + (zi ? zi.cardCls : 'z-danger') + (App.state.ringReplay ? ' ring-replay' : '') + '">'
    + '<div class="hero-ring-wrap">' + chartCycleRing(zones, late ? cl - 1 : dayIx, 132)
    + '<div class="hero-ring-center"><div class="hero-day" data-to="' + (dayIx + 1) + '">J' + (dayIx + 1) + '</div><div class="hero-day-sub">sur ' + cl + '</div></div></div>'
    + '<div class="hero-info">'
    + '<div class="hero-date">' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>'
    + chip
    + '<div class="hero-desc">' + (late ? 'Si vos règles ne reviennent pas, un test de grossesse peut vous rassurer.' : zi.desc) + '</div>'
    + '<div class="hero-next"><i class="ti ti-calendar-event" aria-hidden="true"></i> ' + nextTxt + '</div>'
    + action
    + '</div></div>';
}

/* ---- Indicateur de fiabilité des prédictions ---- */
function renderReliabilityBadge() {
  var r = computeCycleReliability();
  var cl = getCycleLen();
  /* Suggestion : le cycle observé diffère du réglage d'au moins 2 jours */
  var suggest = r.avgLen && r.cycleCount >= 2 && Math.abs(r.avgLen - cl) >= 2 && r.avgLen >= 21 && r.avgLen <= 45;
  if (r.level === 'high' && !suggest) return ''; /* rien à signaler */
  var iconMap  = { high:'ti-shield-check', medium:'ti-shield-half', low:'ti-shield-exclamation' };
  var colorMap = { high:'var(--z-safe-tx)', medium:'var(--z-caution-tx)', low:'var(--text-2)' };
  var bgMap    = { high:'var(--z-safe-bg)', medium:'var(--z-caution-bg)', low:'var(--surface)' };
  var bdMap    = { high:'var(--z-safe-bd)', medium:'var(--z-caution-bd)', low:'var(--border)' };
  return '<div class="card card-sm" style="background:'+bgMap[r.level]+';border-color:'+bdMap[r.level]+';display:flex;align-items:flex-start;gap:10px;">'
    + '<i class="ti '+iconMap[r.level]+'" style="font-size:19px;color:'+colorMap[r.level]+';flex-shrink:0;margin-top:1px;" aria-hidden="true"></i>'
    + '<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:'+colorMap[r.level]+';">'+r.label+'</div>'
    + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;line-height:1.4;">'+r.desc+'</div>'
    + (suggest
      ? '<div class="suggest-row"><div style="font-size:12px;">Vos cycles durent en moyenne <strong>'+r.avgLen+' jours</strong>, le réglage est de '+cl+' jours.</div>'
        + '<button class="btn btn-sm btn-primary" onclick="useObservedCycle('+r.avgLen+')">Utiliser '+r.avgLen+' jours</button></div>'
      : '')
    + '</div></div>';
}
function useObservedCycle(n) {
  updateUser(function(u) { u.cycleLen = n; return u; });
  showToast('Durée du cycle réglée sur ' + n + ' jours. Calendrier mis à jour.');
  render();
}

/* ---- Bande des 7 prochains jours ---- */
function renderWeeklyStrip() {
  var lp = getLastPeriod(); if (!lp) return '';
  var cl = getCycleLen();
  var u = getUser();
  var todayD = todayStr();
  var cells = '';
  for (var i = 0; i < 7; i++) {
    var d    = addDays(todayD, i);
    // Utiliser la zone historique cohérente pour chaque jour
    var z    = u && u.periods && u.periods.length ? getZoneForDate(d, u.periods, cl) : getZone(d, lp.start, cl, getEstimatedPeriodDur());
    var zi   = ZONE_INFO[z];
    var dObj = parseDateStr(d);
    var wd   = DAYS_FR_SHORT[(dObj.getDay() + 6) % 7];
    var isToday = d === todayD;
    cells += '<button class="week-day ' + zi.calCls + (isToday ? ' week-today' : '') + '" onclick="openDayDetail(\'' + d + '\')" aria-label="' + fmtDate(d) + ' : ' + zi.lbl + '">'
      + '<div class="week-day-lbl">' + (i === 0 ? 'Aujourd\'hui' : wd) + '</div>'
      + '<div class="week-day-num">' + dObj.getDate() + '</div>'
      + '<i class="ti ' + zi.icon + '" style="font-size:13px;" aria-hidden="true"></i>'
      + '</button>';
  }
  return '<div class="sec-title">Les 7 prochains jours</div>'
    + '<div class="card card-sm"><div class="week-strip">' + cells + '</div></div>';
}

function statCard(label, val, sub, valCls) {
  return '<div class="stat-card"><div class="stat-label">' + label + '</div>'
    + '<div class="stat-val ' + (valCls||'') + '">' + val + '</div>'
    + '<div class="stat-sub">' + sub + '</div></div>';
}

function qaBtn(icon, label, onclick) {
  return '<div class="qa-btn" onclick="' + onclick + '" role="button" tabindex="0">'
    + '<i class="ti ' + icon + '" aria-hidden="true"></i>' + label + '</div>';
}

function infoAlert(icon, title, desc, color) {
  return '<div class="card" style="border-left:3px solid ' + color + ';">'
    + '<div class="flex-center gap-8"><i class="ti ' + icon + '" style="font-size:18px;color:' + color + ';" aria-hidden="true"></i>'
    + '<div><div style="font-size:13px;font-weight:600;color:' + color + '">' + title + '</div>'
    + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;">' + desc + '</div>'
    + '</div></div></div>';
}

function renderRecentActivity() {
  var u = getUser(); if (!u) return empty('Aucune activité.');
  var events = [];
  (u.periods||[]).forEach(function(p){ events.push({date:p.start,icon:'ti-droplet-filled',cls:'item-icon-pink',style:'',lbl:'Début des règles'}); });
  (u.rapports||[]).forEach(function(r){ events.push({date:r.date,icon:'ti-heart',cls:r.protected?'item-icon-green':'item-icon-red',style:'',lbl:r.protected?'Rapport protégé':'Rapport non protégé'}); });
  (u.medications||[]).forEach(function(m){ events.push({date:m.date,icon:'ti-pill',cls:'item-icon-purple',style:'',lbl:esc(m.name||m.type)}); });
  (u.symptoms||[]).forEach(function(s){ events.push({date:s.date,icon:'ti-mood-sad',cls:'item-icon-amber',style:'',lbl:esc((s.items||[]).slice(0,2).join(', '))}); });
  (u.moods||[]).forEach(function(m){ 
    var moodInfo=MOOD_OPTIONS.find(function(opt){return opt.val===m.value;})||{};
    events.push({date:m.date,icon:moodInfo.icon||'ti-mood-happy',cls:'',style:'background:'+moodInfo.color+';color:#fff;',lbl:moodInfo.lbl+' ('+m.value+'/10)'}); 
  });
  (u.energies||[]).forEach(function(e){ 
    var energyInfo=ENERGY_OPTIONS.find(function(opt){return opt.val===e.value;})||{};
    events.push({date:e.date,icon:energyInfo.icon||'ti-battery-charging',cls:'',style:'background:'+energyInfo.color+';color:#fff;',lbl:energyInfo.lbl+' ('+e.value+'/8)'}); 
  });
  (u.temperatures||[]).forEach(function(t){
    var tempColor = t.value > 37 ? '#e74c3c' : t.value > 36.5 ? '#f39c12' : '#27ae60';
    events.push({date:t.date,icon:'ti-thermometer',cls:'',style:'background:'+tempColor+';color:#fff;',lbl:t.value+'°C'});
  });
  (u.weights||[]).forEach(function(w){
    events.push({date:w.date,icon:'ti-scale',cls:'item-icon-purple',style:'',lbl:w.value+' kg'});
  });
  (u.thoughts||[]).forEach(function(th){
    events.push({date:th.date,icon:'ti-notebook',cls:'item-icon-amber',style:'',lbl:esc(th.text.substring(0,30)+'...')});
  });
  (u.discharge||[]).forEach(function(d){
    var typeInfo=DISCHARGE_OPTIONS.find(function(opt){return opt.val===d.type;})||{};
    events.push({date:d.date,icon:'ti-droplet',cls:'',style:'background:#3498db;color:#fff;',lbl:typeInfo.lbl});
  });
  events.sort(function(a,b){ return b.date.localeCompare(a.date); });
  if (!events.length) return empty('Commencez à enregistrer votre cycle.');
  return events.slice(0,6).map(function(e){
    var iconClass = e.cls ? e.cls : '';
    var iconStyle = e.style ? e.style : '';
    return '<div class="activity-item">'
      + '<div class="item-icon '+iconClass+'" style="'+iconStyle+'width:32px;height:32px;border-radius:8px;font-size:16px;">'
      + '<i class="ti ' + e.icon + '" aria-hidden="true"></i></div>'
      + '<div class="activity-label">' + e.lbl + '</div>'
      + '<div class="activity-date">' + fmtShort(e.date) + '</div></div>';
  }).join('');
}

function empty(msg) {
  return '<div class="empty"><div style="font-size:13px;">' + msg + '</div></div>';
}
