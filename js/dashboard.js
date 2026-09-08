/* =============================================
   js/dashboard.js — Tableau de bord
   ============================================= */
function renderAccueil() {
  var u     = getUser(); if (!u) return '';
  var lp    = getLastPeriod();
  var today = todayStr();
  var cl    = getCycleLen();
  var html  = '';

  if (lp) {
    var zone = getZone(today, lp.start, cl);
    var zi   = ZONE_INFO[zone];
    var cd   = getCycleDay(today, lp.start, cl);
    var dup  = getDaysUntilPeriod(lp.start, cl);
    var pred = getPredictedNextPeriod();

    /* Phase card */
    html += '<div class="card ' + zi.cardCls + '">'
      + '<div class="flex-between" style="margin-bottom:12px;">'
      + '<div style="font-size:12px;color:var(--text-3);">'
      + new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}) + '</div>'
      + '<span class="zone-chip ' + zi.chipCls + '">' + zi.lbl + '</span>'
      + '</div>'
      + '<div class="phase-widget" style="background:transparent;padding:0;">'
      + '<div class="item-icon ' + ZONE_ICON_BG[zone] + '" style="width:48px;height:48px;border-radius:12px;">'
      + '<i class="ti ' + zi.icon + '" style="font-size:24px;" aria-hidden="true"></i>'
      + '</div>'
      + '<div><div class="phase-title" style="color:' + zi.color + '">' + zi.lbl + '</div>'
      + '<div class="phase-desc">' + zi.desc + '</div></div>'
      + '</div></div>';

    /* Fiabilité des prédictions */
    html += renderReliabilityBadge();

    /* Règles en cours : proposer de marquer la fin */
    html += renderActivePeriodPrompt();

    /* Stats */
    html += '<div class="stat-grid">'
      + statCard('Jour du cycle', cd, 'sur ' + cl + ' jours', '')
      + statCard(
          'Prochaines règles',
          dup >= 0 ? dup : Math.abs(dup),
          dup > 0 ? 'jours restants' : dup === 0 ? 'Attendues aujourd\'hui' : 'jours de retard',
          dup !== null && dup < 0 ? 'stat-val-late' : ''
        )
      + '</div>';

    /* Badge de retard plus visible */
    if (dup !== null && dup < 0) {
      var delayLevel = dup <= -7 ? 'critical' : dup <= -3 ? 'warning' : 'info';
      var delayColor = delayLevel === 'critical' ? '#922b21' : delayLevel === 'warning' ? '#b35000' : '#2471a3';
      var delayIcon = delayLevel === 'critical' ? 'ti-alert-circle' : delayLevel === 'warning' ? 'ti-alert-triangle' : 'ti-info-circle';
      var delayMessage = delayLevel === 'critical' ? 'Retard important — Consultez un médecin si persiste' : delayLevel === 'warning' ? 'Retard notable — Surveillez l\'évolution' : 'Léger retard — Normal possible';
      
      html += '<div class="card" style="border-left:4px solid ' + delayColor + ';background:' + (delayLevel === 'critical' ? '#fdecea' : delayLevel === 'warning' ? '#fef5e7' : '#eaf4fb') + ';padding:12px 14px;margin-bottom:12px;">'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<i class="ti ' + delayIcon + '" style="font-size:20px;color:' + delayColor + ';flex-shrink:0;" aria-hidden="true"></i>'
        + '<div style="flex:1;">'
        + '<div style="font-size:14px;font-weight:700;color:' + delayColor + ';">Règles en retard de ' + Math.abs(dup) + ' jour' + (Math.abs(dup) > 1 ? 's' : '') + '</div>'
        + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;">' + delayMessage + '</div>'
        + '</div></div></div>';
    }

    /* 7 prochains jours */
    html += renderWeeklyStrip();

    /* Médicament delay alert */
    if (pred && pred.hasDelay) {
      html += infoAlert('ti-pill', 'Règles possiblement décalées',
        'Suite à la prise de contraceptif d\'urgence — attendues vers le <strong>' + fmtShort(pred.date) + '</strong>.', '#6c3483');
    }

    /* Test de grossesse */
    if (shouldRecommendTest()) {
      html += '<div class="test-banner">'
        + '<div class="test-banner-title"><i class="ti ti-flask" aria-hidden="true"></i> Test de grossesse recommandé</div>'
        + '<div class="test-banner-desc">Vos règles ont plus de 7 jours de retard. Un test urinaire (disponible en pharmacie) vous donnera une réponse fiable.</div>'
        + '</div>';
    }
  } else {
    html += '<div class="card" style="text-align:center;padding:28px 20px;">'
      + '<i class="ti ti-calendar-heart" style="font-size:48px;color:var(--primary);opacity:0.4;display:block;margin-bottom:12px;" aria-hidden="true"></i>'
      + '<div style="font-size:15px;font-weight:600;margin-bottom:6px;">Commencez votre suivi</div>'
      + '<div style="font-size:13px;color:var(--text-3);margin-bottom:16px;line-height:1.5;">Enregistrez vos dernières règles pour activer le calendrier et les estimations.</div>'
      + '<button class="btn btn-primary" onclick="go(\'journal\')">'
      + '<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer mes règles</button>'
      + '</div>';
  }

  /* Risque grossesse */
  var risk = calcRisk();
  if (risk && risk.level !== 'none' && risk.level !== 'faible') {
    var high = risk.level === 'eleve' || risk.level === 'tres_eleve';
    html += '<div class="risk-banner ' + (high ? 'risk-high' : 'risk-med') + '">'
      + '<div class="risk-title"><i class="ti ' + (high ? 'ti-alert-circle' : 'ti-alert-triangle') + '" aria-hidden="true"></i>'
      + (risk.level === 'tres_eleve' ? 'Risque de grossesse très élevé'
        : risk.level === 'eleve'     ? 'Risque de grossesse élevé'
        :                              'Risque modéré — contraceptif pris après') + '</div>'
      + '<div class="risk-desc">'
      + (risk.events.length ? risk.events.length + ' rapport(s) non protégé(s) en période fertile. ' : '')
      + (risk.daysLate > 5 ? 'Règles en retard de <strong>' + risk.daysLate + ' jours</strong>. ' : '')
      + (high ? 'Faites un test de grossesse si les règles ne reviennent pas.' : '')
      + '</div></div>';
  }

  /* Informations ovulation */
  var ovWindow = getOvulationWindow(lp.start, cl);
  if (ovWindow) {
    var daysToOv = diffDays(todayStr(), ovWindow.peak);
    if (daysToOv >= -2 && daysToOv <= 2) {
      var ovMsg = daysToOv === 0 ? 'Vous êtes probablement en ovulation aujourd\'hui !' 
                 : daysToOv > 0 ? 'Ovulation prévue dans ' + daysToOv + ' jour' + (daysToOv > 1 ? 's' : '')
                 : 'Ovulation il y a ' + Math.abs(daysToOv) + ' jour' + (Math.abs(daysToOv) > 1 ? 's' : '');
      html += '<div class="card" style="border-left:3px solid #e91e63;background:#fce4ec;">'
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
    html += '<div class="card" style="border-left:3px solid #00b894;background:#e8f8f5;">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;">'
      + '<i class="ti ti-lightbulb" style="font-size:20px;color:#00b894;flex-shrink:0;margin-top:1px;" aria-hidden="true"></i>'
      + '<div style="flex:1;">'
      + '<div style="font-size:13px;font-weight:700;color:#00b894;">Conseil du jour</div>'
      + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;line-height:1.4;">' + esc(dailyTip.title) + '</div>'
      + '<div style="font-size:11px;color:var(--text-3);margin-top:4px;">' + esc(dailyTip.content.substring(0, 100)) + '...</div></div></div></div>';
  }

  /* Actions rapides */
  html += '<div class="sec-title">Actions rapides</div>'
    + '<div class="qa-grid">'
    + qaBtn('ti-droplet-filled', 'Règles',     "openModal('logPeriod')")
    + qaBtn('ti-heart',          'Rapport',    "openModal('logRapport')")
    + qaBtn('ti-mood-sad',       'Symptôme',   "openModal('logSymptom')")
    + qaBtn('ti-pill',           'Médicament', "openModal('logMed')")
    + qaBtn('ti-mood-happy',     'Humeur',     "openModal('logMood')")
    + qaBtn('ti-battery-charging','Énergie',   "openModal('logEnergy')")
    + qaBtn('ti-thermometer',   'Température',"openModal('logTemp')")
    + qaBtn('ti-scale',          'Poids',      "openModal('logWeight')")
    + qaBtn('ti-notebook',       'Pensée',    "openModal('logThought')")
    + qaBtn('ti-droplet',         'Pertes',     "openModal('logDischarge')")
    + '</div>';

  /* Activité récente */
  html += '<div class="sec-title">Activité récente</div>'
    + '<div class="card card-sm">' + renderRecentActivity() + '</div>';

  return html;
}

/* ---- Indicateur de fiabilité des prédictions ---- */
function renderReliabilityBadge() {
  var r = computeCycleReliability();
  var iconMap  = { high:'ti-shield-check', medium:'ti-shield-half', low:'ti-shield-exclamation' };
  var colorMap = { high:'var(--z-safe-tx)', medium:'var(--z-caution-tx)', low:'var(--text-2)' };
  var bgMap    = { high:'var(--z-safe-bg)', medium:'var(--z-caution-bg)', low:'var(--bg)' };
  var bdMap    = { high:'var(--z-safe-bd)', medium:'var(--z-caution-bd)', low:'var(--border)' };
  return '<div class="card card-sm" style="background:'+bgMap[r.level]+';border-color:'+bdMap[r.level]+';display:flex;align-items:flex-start;gap:10px;">'
    + '<i class="ti '+iconMap[r.level]+'" style="font-size:19px;color:'+colorMap[r.level]+';flex-shrink:0;margin-top:1px;" aria-hidden="true"></i>'
    + '<div><div style="font-size:13px;font-weight:700;color:'+colorMap[r.level]+';">'+r.label+'</div>'
    + '<div style="font-size:12px;color:var(--text-3);margin-top:2px;line-height:1.4;">'+r.desc
    + (r.avgLen ? ' Cycle moyen observé : <strong>'+r.avgLen+' jours</strong>.' : '')
    + '</div></div></div>';
}

/* ---- Invite à marquer la fin des règles si une période est en cours ---- */
function renderActivePeriodPrompt() {
  var ap = getActivePeriod();
  if (!ap) return '';
  var daysSince = diffDays(ap.start, todayStr()) + 1;
  return '<div class="card" style="border-left:3px solid var(--z-period-tx);background:var(--z-period-bg);">'
    + '<div style="display:flex;align-items:flex-start;gap:10px;">'
    + '<i class="ti ti-droplet-filled" style="font-size:20px;color:var(--z-period-tx);flex-shrink:0;margin-top:1px;" aria-hidden="true"></i>'
    + '<div style="flex:1;">'
    + '<div style="font-size:13px;font-weight:700;color:var(--z-period-tx);">Règles en cours depuis '+daysSince+' jour'+(daysSince>1?'s':'')+'</div>'
    + '<div style="font-size:12px;color:var(--text-2);margin-top:2px;margin-bottom:10px;line-height:1.4;">Début le '+fmtDate(ap.start)+'. Indiquez la date de fin dès qu\'elles s\'arrêtent — qu\'elles durent 3, 4, 5 jours ou plus.</div>'
    + '<button class="btn btn-sm btn-primary" onclick="openModal(\'endPeriod\')"><i class="ti ti-flag-2" aria-hidden="true"></i> Terminer mes règles</button>'
    + '</div></div></div>';
}

/* ---- Bande des 7 prochains jours ---- */
function renderWeeklyStrip() {
  var lp = getLastPeriod(); if (!lp) return '';
  var cl = getCycleLen();
  var todayD = todayStr();
  var cells = '';
  for (var i = 0; i < 7; i++) {
    var d    = addDays(todayD, i);
    var z    = getZone(d, lp.start, cl);
    var zi   = ZONE_INFO[z];
    var dObj = parseDateStr(d);
    var wd   = DAYS_FR_SHORT[(dObj.getDay() + 6) % 7];
    var isToday = d === todayD;
    cells += '<div class="week-day ' + zi.calCls + (isToday ? ' week-today' : '') + '">'
      + '<div class="week-day-lbl">' + (i === 0 ? 'Aujourd\'hui' : wd) + '</div>'
      + '<div class="week-day-num">' + dObj.getDate() + '</div>'
      + '<i class="ti ' + zi.icon + '" style="font-size:13px;" aria-hidden="true"></i>'
      + '</div>';
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
