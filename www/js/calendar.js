/* =============================================
   js/calendar.js — Calendrier mensuel
   ============================================= */
/* Grille d'un mois (utilisée par le calendrier ET le mini-calendrier de l'accueil) */
function calGridHtml(year, month) {
  var u   = getUser();
  var cl  = getCycleLen();
  var pd  = getEstimatedPeriodDur();
  var today = todayStr();
  var mStr  = year + '-' + String(month+1).padStart(2,'0');

  /* Collecte des événements */
  var periodDays={}, rapportDays={}, medDays={}, symDays={}, tempDays={}, weightDays={}, thoughtDays={}, dischargeDays={};
  if (u) {
    (u.periods||[]).forEach(function(p) {
      if (!p.start) return;
      var end = p.end || addDays(p.start, pd-1);
      var cur = p.start;
      while (cur <= end) { if (cur.startsWith(mStr)) periodDays[cur]=true; cur=addDays(cur,1); }
    });
    (u.rapports||[]).filter(function(r){ return r.date&&r.date.startsWith(mStr)&&!r.protected; }).forEach(function(r){ rapportDays[r.date]=true; });
    (u.medications||[]).filter(function(m){ return m.date&&m.date.startsWith(mStr); }).forEach(function(m){ medDays[m.date]=true; });
    (u.symptoms||[]).filter(function(s){ return s.date&&s.date.startsWith(mStr); }).forEach(function(s){ symDays[s.date]=true; });
    (u.temperatures||[]).filter(function(t){ return t.date&&t.date.startsWith(mStr); }).forEach(function(t){ tempDays[t.date]=true; });
    (u.weights||[]).filter(function(w){ return w.date&&w.date.startsWith(mStr); }).forEach(function(w){ weightDays[w.date]=true; });
    (u.thoughts||[]).filter(function(th){ return th.date&&th.date.startsWith(mStr); }).forEach(function(th){ thoughtDays[th.date]=true; });
    (u.discharge||[]).filter(function(d){ return d.date&&d.date.startsWith(mStr); }).forEach(function(d){ dischargeDays[d.date]=true; });
  }

  /* Grille */
  var html = '<div class="cal-grid" role="grid">';
  DAYS_FR_SHORT.forEach(function(d){ html+='<div class="cal-dlbl">'+d+'</div>'; });

  var firstDow = new Date(year,month,1).getDay();
  var offset   = firstDow===0?6:firstDow-1;
  var dim      = new Date(year,month+1,0).getDate();
  var prevDim  = new Date(year,month,0).getDate();

  for (var i=offset-1;i>=0;i--) html+='<div class="cal-day out">'+(prevDim-i)+'</div>';

  for (var d=1;d<=dim;d++) {
    var ds   = mStr+'-'+String(d).padStart(2,'0');
    // Utiliser la période appropriée pour chaque date pour maintenir la cohérence historique
    var zone = u && u.periods && u.periods.length ? getZoneForDate(ds, u.periods, cl) : null;
    var calCls = periodDays[ds]?'zp':(zone?ZONE_INFO[zone].calCls:'');
    /* Règles PRÉVUES (non enregistrées) : style pointillé pour les distinguer */
    if (!periodDays[ds] && zone === 'period') calCls = ds > today ? 'zp zp-pred' : ''; /* passé non enregistré : pas de règles ce jour-là */
    var isT  = ds===today;
    /* Repère visuel en plus de la couleur (daltonisme) */
    var mark = periodDays[ds] ? '<i class="ti ti-droplet-filled cal-mark" aria-hidden="true"></i>'
             : zone === 'danger' ? '<i class="ti ti-alert-triangle cal-mark" aria-hidden="true"></i>' : '';
    var aria = fmtDate(ds) + (periodDays[ds] ? ' : règles' : zone ? ' : ' + (calCls.indexOf('zp-pred')!==-1 ? 'règles prévues' : ZONE_INFO[zone].lbl) : '');
    var dots = '';
    if (rapportDays[ds]) dots+='<div class="edot edot-r"></div>';
    if (medDays[ds])     dots+='<div class="edot edot-m"></div>';
    if (symDays[ds])     dots+='<div class="edot edot-s"></div>';
    if (tempDays[ds])    dots+='<div class="edot edot-t"></div>';
    if (weightDays[ds])   dots+='<div class="edot edot-w"></div>';
    if (thoughtDays[ds])  dots+='<div class="edot edot-th"></div>';
    if (dischargeDays[ds]) dots+='<div class="edot edot-d"></div>';
    html+='<button class="cal-day '+calCls+(isT?' today':'')+'" onclick="openDayDetail(\''+ds+'\')" aria-label="'+aria+'">'+mark+d
      +(dots?'<div class="edots">'+dots+'</div>':'')+'</button>';
  }

  var rem=(offset+dim)%7; if(rem>0){ for(var r=1;r<=7-rem;r++) html+='<div class="cal-day out">'+r+'</div>'; }
  html+='</div>';
  return html;
}

function renderCalendrier() {
  var u   = getUser();
  var lp  = getLastPeriod();
  var cl  = getCycleLen();
  var pd  = getEstimatedPeriodDur(); /* durée réellement observée si disponible, sinon réglage global */
  var today = todayStr();
  var year  = App.state.calYear;
  var month = App.state.calMonth;
  var mStr  = year + '-' + String(month+1).padStart(2,'0');

  /* En-tête */
  var html = '<div class="cal-head">'
    + '<button class="cal-nav-btn" onclick="calNav(-1)" aria-label="Mois précédent"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>'
    + '<div class="cal-month-label">' + MONTHS_FR[month] + ' ' + year
    + (mStr !== today.substring(0,7) ? ' <button class="link-btn" onclick="calToday()">Aujourd\'hui</button>' : '') + '</div>'
    + '<button class="cal-nav-btn" onclick="calNav(1)" aria-label="Mois suivant"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>'
    + '</div>';

  /* Grille */
  var anim = App.state.calAnim || ''; App.state.calAnim = null;
  html += '<div class="card cal-swipe" style="padding:14px;overflow:hidden;"><div class="' + anim + '">' + calGridHtml(year, month) + '</div></div>';

  /* Légende */
  html += '<div class="card card-sm"><div class="sec-title" style="margin-bottom:10px;">Légende</div>'
    + '<div class="legend">'
    + legSwatch('var(--z-period-bg)','var(--z-period-bd)','Règles')
    + '<div class="leg-item"><div class="leg-swatch leg-pred"></div>Règles prévues</div>'
    + legSwatch('var(--z-safe-bg)','var(--z-safe-bd)','Favorable')
    + legSwatch('var(--z-caution-bg)','var(--z-caution-bd)','Attention')
    + legSwatch('var(--z-danger-bg)','var(--z-danger-bd)','Risque grossesse')
    + '</div>'
    + '<div class="legend" style="margin-top:8px;">'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#1a7a4a;flex-shrink:0;"></div>Rapport (non protégé)</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#6c3483;flex-shrink:0;"></div>Médicament</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#e67e22;flex-shrink:0;"></div>Symptôme</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#e74c3c;flex-shrink:0;"></div>Température</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#9b59b6;flex-shrink:0;"></div>Poids</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#f39c12;flex-shrink:0;"></div>Pensée</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#3498db;flex-shrink:0;"></div>Pertes</div>'
    + '<div class="leg-item"><div style="box-shadow:inset 0 0 0 2px var(--primary);width:14px;height:14px;border-radius:4px;flex-shrink:0;"></div>Aujourd\'hui</div>'
    + '<div class="leg-item"><i class="ti ti-droplet-filled" style="font-size:12px;color:var(--z-period-tx);" aria-hidden="true"></i>Règles enregistrées</div>'
    + '<div class="leg-item"><i class="ti ti-alert-triangle" style="font-size:12px;color:var(--z-danger-tx);" aria-hidden="true"></i>Jour à risque</div>'
    + '</div><div style="font-size:12px;color:var(--text-3);margin-top:10px;"><i class="ti ti-hand-finger" aria-hidden="true"></i> Touchez un jour pour voir le détail ou ajouter une saisie'
    + '</div></div>';

  if (!lp) html+='<div class="card" style="text-align:center;">'
    +'<div style="font-size:13px;color:var(--text-3);margin-bottom:12px;">Enregistrez vos règles pour voir les zones sur le calendrier.</div>'
    +'<button class="btn btn-soft" onclick="go(\'journal\')"><i class="ti ti-plus" aria-hidden="true"></i> Enregistrer mes règles</button></div>';

  return html;
}

function legSwatch(bg,bd,lbl){
  return '<div class="leg-item"><div class="leg-swatch" style="background:'+bg+';border:1px solid '+bd+';"></div>'+lbl+'</div>';
}
function calNav(dir){
  App.state.calAnim = dir > 0 ? 'cal-next' : 'cal-prev';
  App.state.calMonth+=dir;
  if(App.state.calMonth>11){App.state.calMonth=0;App.state.calYear++;}
  if(App.state.calMonth<0){App.state.calMonth=11;App.state.calYear--;}
  render();
}
function calToday(){
  var n=new Date(); App.state.calYear=n.getFullYear(); App.state.calMonth=n.getMonth(); render();
}

/* Mini-calendrier du mois en cours (tableau de bord, grand écran) */
function renderMiniMonth() {
  var n = new Date();
  return '<div class="sec-title sec-title-row">Ce mois-ci · ' + MONTHS_FR[n.getMonth()]
    + '<button class="link-btn" onclick="go(\'calendrier\')">Calendrier complet</button></div>'
    + '<div class="card mini-month">' + calGridHtml(n.getFullYear(), n.getMonth()) + '</div>';
}
