/* =============================================
   js/calendar.js — Calendrier mensuel
   ============================================= */
function renderCalendrier() {
  var u   = getUser();
  var lp  = getLastPeriod();
  var cl  = getCycleLen();
  var pd  = getEstimatedPeriodDur(); /* durée réellement observée si disponible, sinon réglage global */
  var today = todayStr();
  var year  = App.state.calYear;
  var month = App.state.calMonth;
  var mStr  = year + '-' + String(month+1).padStart(2,'0');

  /* Collecte des événements */
  var periodDays={}, rapportDays={}, medDays={}, symDays={};
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
  }

  /* En-tête */
  var html = '<div class="cal-head">'
    + '<button class="cal-nav-btn" onclick="calNav(-1)" aria-label="Mois précédent"><i class="ti ti-chevron-left" aria-hidden="true"></i></button>'
    + '<div class="cal-month-label">' + MONTHS_FR[month] + ' ' + year + '</div>'
    + '<button class="cal-nav-btn" onclick="calNav(1)" aria-label="Mois suivant"><i class="ti ti-chevron-right" aria-hidden="true"></i></button>'
    + '</div>';

  /* Grille */
  html += '<div class="card" style="padding:14px;"><div class="cal-grid" role="grid">';
  DAYS_FR_SHORT.forEach(function(d){ html+='<div class="cal-dlbl">'+d+'</div>'; });

  var firstDow = new Date(year,month,1).getDay();
  var offset   = firstDow===0?6:firstDow-1;
  var dim      = new Date(year,month+1,0).getDate();
  var prevDim  = new Date(year,month,0).getDate();

  for (var i=offset-1;i>=0;i--) html+='<div class="cal-day out">'+(prevDim-i)+'</div>';

  for (var d=1;d<=dim;d++) {
    var ds   = mStr+'-'+String(d).padStart(2,'0');
    var zone = lp?getZone(ds,lp.start,cl):null;
    var calCls = periodDays[ds]?'zp':(zone?ZONE_INFO[zone].calCls:'');
    var isT  = ds===today;
    var dots = '';
    if (rapportDays[ds]) dots+='<div class="edot edot-r"></div>';
    if (medDays[ds])     dots+='<div class="edot edot-m"></div>';
    if (symDays[ds])     dots+='<div class="edot edot-s"></div>';
    html+='<div class="cal-day '+calCls+(isT?' today':'')+'">'+d
      +(dots?'<div class="edots">'+dots+'</div>':'')+'</div>';
  }

  var rem=(offset+dim)%7; if(rem>0){ for(var r=1;r<=7-rem;r++) html+='<div class="cal-day out">'+r+'</div>'; }
  html+='</div></div>';

  /* Légende */
  html += '<div class="card card-sm"><div class="sec-title" style="margin-bottom:10px;">Légende</div>'
    + '<div class="legend">'
    + legSwatch('var(--z-period-bg)','var(--z-period-bd)','Règles')
    + legSwatch('var(--z-safe-bg)','var(--z-safe-bd)','Favorable')
    + legSwatch('var(--z-caution-bg)','var(--z-caution-bd)','Attention')
    + legSwatch('var(--z-danger-bg)','var(--z-danger-bd)','Risque grossesse')
    + '</div>'
    + '<div class="legend" style="margin-top:8px;">'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#1a7a4a;flex-shrink:0;"></div>Rapport (non protégé)</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#6c3483;flex-shrink:0;"></div>Médicament</div>'
    + '<div class="leg-item"><div style="width:8px;height:8px;border-radius:50%;background:#e67e22;flex-shrink:0;"></div>Symptôme</div>'
    + '<div class="leg-item"><div style="box-shadow:inset 0 0 0 2px var(--primary);width:14px;height:14px;border-radius:4px;flex-shrink:0;"></div>Aujourd\'hui</div>'
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
  App.state.calMonth+=dir;
  if(App.state.calMonth>11){App.state.calMonth=0;App.state.calYear++;}
  if(App.state.calMonth<0){App.state.calMonth=11;App.state.calYear--;}
  render();
}
