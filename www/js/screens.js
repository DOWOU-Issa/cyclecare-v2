/* =============================================
   js/screens.js — Journal, médicaments et pages secondaires
   ============================================= */
function renderJournal() {
  var tabs=[{id:'regles',lbl:'Règles',ico:'ti-droplet-filled'},{id:'rapports',lbl:'Rapports',ico:'ti-heart'},{id:'symptomes',lbl:'Symptômes',ico:'ti-mood-sad'}];
  var html='<div class="tab-row">'+tabs.map(function(t){
    return '<button class="tab-btn'+(App.state.journalTab===t.id?' active':'')+'" onclick="setJournalTab(\''+t.id+'\')">'
      +'<i class="ti '+t.ico+'" aria-hidden="true"></i>'+t.lbl+'</button>';
  }).join('')+'</div>';
  if(App.state.journalTab==='regles')    return html+renderReglesTab();
  if(App.state.journalTab==='rapports')  return html+renderRapportsTab();
  if(App.state.journalTab==='symptomes') return html+renderSymptomesTab();
  return html;
}

function renderReglesTab(){
  var u=getUser();
  var periods=(u&&u.periods||[]).slice().sort(function(a,b){ return a.start<b.start?1:-1; }); /* plus récent d'abord */
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logPeriod\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer des règles</button>'
    +'<div class="sec-title">Historique</div>';
  if(!periods.length) return html+'<div class="card">'+empty('Aucune règle enregistrée. Appuyez ci-dessus pour commencer.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  periods.slice(0,12).forEach(function(p){
    var dur=p.end?diffDays(p.start,p.end)+1:null;
    var startEsc=p.start.replace(/'/g,"\\'");
    html+='<div class="list-item"><div class="item-icon item-icon-pink"><i class="ti ti-droplet-filled" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(p.start)+'</div>'
      +'<div class="item-sub">'+(dur?'Durée : '+dur+' jour'+(dur>1?'s':''):'En cours — fin non renseignée')+(p.flow?' · Flux : '+flowTxt(p.flow):'')+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editPeriodEntry(\''+startEsc+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delPeriod(\''+startEsc+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderRapportsTab(){
  var u=getUser();var lp=getLastPeriod();var cl=getCycleLen();
  var raps=(u&&u.rapports||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logRapport\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer un rapport</button>'
    +'<div class="card" style="background:var(--z-safe-bg);border-color:var(--z-safe-bd);padding:11px 14px;margin-bottom:12px;">'
    +'<div style="font-size:13px;color:var(--z-safe-tx);line-height:1.5;">'
    +'<i class="ti ti-shield-check" style="font-size:16px;" aria-hidden="true"></i> '
    +'Le préservatif est la seule méthode protégeant à la fois contre la grossesse non désirée et les infections sexuellement transmissibles.</div></div>'
    +'<div class="sec-title">Historique</div>';
  if(!raps.length) return html+'<div class="card">'+empty('Aucun rapport enregistré.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  raps.slice(0,15).forEach(function(r){
    var ri=(u.rapports||[]).findIndex(function(x){return x.date===r.date&&x.protected===r.protected;});
    var zone=lp?getZone(r.date,lp.start,cl):null;var zi=zone?ZONE_INFO[zone]:null;
    var hasMed=(u.medications||[]).some(function(m){var d=diffDays(r.date,m.date);return d>=0&&d<=5&&(m.type==='norLevo'||m.type==='ellaOne');});
    html+='<div class="list-item"><div class="item-icon '+(r.protected?'item-icon-green':'item-icon-red')+'">'
      +'<i class="ti ti-heart" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(r.date)+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">'
      +'<span class="zone-chip '+(r.protected?'zc-safe':'zc-danger')+'">'+(r.protected?'Protégé':'Non protégé')+'</span>'
      +(zi?'<span class="zone-chip '+zi.chipCls+'">'+zi.lbl+'</span>':'')
      +(hasMed?'<span class="zone-chip" style="background:#eeebff;color:#4a3cab;border-color:#c5bff5;">Contraceptif pris</span>':'')
      +'</div></div>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delRapport('+ri+')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button></div>';
  });
  return html+'</div>';
}

function renderSymptomesTab(){
  var u=getUser();var syms=(u&&u.symptoms||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logSymptom\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer des symptômes</button>'
    +'<div class="sec-title">Historique</div>';
  if(!syms.length) return html+'<div class="card">'+empty('Aucun symptôme enregistré.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  syms.slice(0,12).forEach(function(s){
    var ri=(u.symptoms||[]).findIndex(function(x){return x.date===s.date;});
    html+='<div class="list-item"><div class="item-icon item-icon-amber"><i class="ti ti-mood-sad" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(s.date)+'</div>'
      +'<div class="item-sub">'+esc((s.items||[]).join(', '))+'</div></div>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delSymptom('+ri+')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button></div>';
  });
  return html+'</div>';
}

function flowTxt(v){return{tres_leger:'Très léger',leger:'Léger',normal:'Normal',abondant:'Abondant',tres_abondant:'Très abondant'}[v]||v;}
function delPeriod(startStr){
  updateUser(function(u){ u.periods=u.periods.filter(function(p){return p.start!==startStr;}); return u; });
  showToast('Entrée supprimée.'); render();
}
function editPeriodEntry(startStr){
  var u=getUser();
  var p=(u.periods||[]).find(function(x){ return x.start===startStr; });
  if(!p) return;
  openModal('logPeriod', p);
}
function delRapport(i){updateUser(function(u){u.rapports.splice(i,1);return u;});showToast('Entrée supprimée.');render();}
function delSymptom(i){updateUser(function(u){u.symptoms.splice(i,1);return u;});showToast('Entrée supprimée.');render();}

/* =============================================
   js/medications.js
   ============================================= */
function renderMedicaments(){
  var u=getUser();var lp=getLastPeriod();var cl=getCycleLen();
  var meds=((u&&u.medications)||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logMed\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer une prise de médicament</button>'
    +'<div class="sec-title">Informations — contraception d\'urgence</div>';

  ['norLevo','ellaOne','pilule'].forEach(function(k){
    var m=MEDS_DATA[k];
    html+='<div class="med-info-card" style="border-left-color:'+m.color+';background:'+m.bg+';">'
      +'<div class="med-info-header">'
      +'<div class="item-icon '+m.iconBg+'" style="width:40px;height:40px;border-radius:10px;font-size:20px;">'
      +'<i class="ti '+m.icon+'" aria-hidden="true"></i></div>'
      +'<div class="med-info-title" style="color:'+m.color+';">'+m.name+'</div></div>'
      +'<div class="med-row"><span class="med-row-label">Fenêtre : </span>'+m.window+'</div>'
      +'<div class="med-row"><span class="med-row-label">Efficacité : </span>'+m.efficacy+'</div>'
      +'<div class="med-row"><span class="med-row-label">Mécanisme : </span>'+m.mechanism+'</div>'
      +'<div class="med-row"><span class="med-row-label">Effets sur le cycle :</span>'
      +'<ul class="med-effects">'+m.effects.map(function(e){return'<li>'+e+'</li>';}).join('')+'</ul></div></div>';
  });

  html+='<div class="sec-title" style="margin-top:4px;">Mes prises de médicaments</div>';
  if(!meds.length) return html+'<div class="card">'+empty('Aucune prise enregistrée. Enregistrez vos prises pour suivre les effets sur votre cycle.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  meds.slice(0,10).forEach(function(m){
    var info=MEDS_DATA[m.type]||{};
    var pred=lp&&info.delayDays>0?addDays(addDays(lp.start,cl),info.delayDays):null;
    html+='<div class="list-item"><div class="item-icon '+(info.iconBg||'item-icon-purple')+'" style="width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti ti-pill" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+esc(m.name||info.name||m.type)+'</div>'
      +'<div class="item-sub">'+fmtDate(m.date)+(m.notes?' · '+esc(m.notes):'')+'</div>'
      +(pred?'<div style="font-size:12px;color:#6c3483;margin-top:3px;">Règles possibles vers le '+fmtShort(pred)+'</div>':'')
      +'</div></div>';
  });
  return html+'</div>';
}

/* =============================================
   js/tips.js
   ============================================= */
function renderConseils(){
  return TIPS_DATA.map(function(s){
    var open=App.state.openAcc===s.id;
    return '<button class="acc-btn" style="border-left-color:'+s.accentColor+';color:'+s.accentColor+';" '
      +'onclick="toggleAcc(\''+s.id+'\')" aria-expanded="'+open+'">'
      +'<span style="display:flex;align-items:center;gap:8px;">'
      +'<i class="ti '+s.icon+'" aria-hidden="true"></i>'+s.title+'</span>'
      +'<i class="ti '+(open?'ti-chevron-up':'ti-chevron-down')+'" style="color:var(--text-3);font-size:16px;flex-shrink:0;" aria-hidden="true"></i>'
      +'</button>'
      +(open?'<div class="acc-content">'+s.tips.map(function(tip){
        return '<div class="acc-tip">'
          +'<div class="acc-tip-header"><i class="ti '+(tip.icon||'ti-circle-check')+' acc-tip-icon" style="color:'+s.accentColor+'" aria-hidden="true"></i>'
          +'<div class="acc-tip-title" style="color:'+s.accentColor+'">'+tip.t+'</div></div>'
          +'<div class="acc-tip-desc">'+tip.d+'</div></div>';
      }).join('')+'</div>':'');
  }).join('');
}
function toggleAcc(id){App.state.openAcc=App.state.openAcc===id?null:id;render();}

/* =============================================
   js/settings.js
   ============================================= */
function renderParametres(){
  var u=getUser();var cl=(u&&u.cycleLen)||28;var pd=(u&&u.periodDur)||5;
  var init=((u&&u.name)||'?').charAt(0).toUpperCase();

  var html='<div class="profile-card"><div class="profile-avatar">'+init+'</div>'
    +'<div><div class="profile-name">'+esc((u&&u.name)||'')+'</div>'
    +'<div class="profile-email">'+esc((u&&u.email)||'')+'</div>'
    +'<div class="profile-since">Membre depuis '+fmtShort((u&&u.createdAt)||todayStr())
    +' · '+((u&&u.periods&&u.periods.length)||0)+' cycle(s) enregistré(s)</div>'
    +'</div></div>';

  /* Sync */
  html+='<div id="sync-status" class="sync-status sync-'+(App.state.syncStatus||'ok')+'">'
    +'<div class="sync-dot"></div>'
    +({ok:'Synchronisé avec Supabase',error:'Hors ligne — données sauvegardées localement',busy:'Synchronisation en cours...'}[App.state.syncStatus||'ok'])
    +'</div>';

  /* Paramètres cycle */
  html+='<div class="sec-title" style="margin-top:16px;">Paramètres du cycle</div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<div class="form-grp">'
    +'<label class="lbl" for="sl-cycle">Durée du cycle</label>'
    +'<div style="display:flex;align-items:center;gap:12px;">'
    +'<input type="range" id="sl-cycle" min="21" max="45" value="'+cl+'" step="1" '
    +'oninput="document.getElementById(\'cl-v\').textContent=this.value+\' j\'" />'
    +'<span id="cl-v" style="min-width:44px;font-size:16px;font-weight:700;color:var(--primary);">'+cl+' j</span>'
    +'</div><div style="font-size:12px;color:var(--text-3);margin-top:3px;">Normal entre 21 et 35 jours. Moyenne : 28 jours.</div></div>'
    +'<div class="form-grp" style="margin-bottom:0;">'
    +'<label class="lbl" for="sl-period">Durée des règles</label>'
    +'<div style="display:flex;align-items:center;gap:12px;">'
    +'<input type="range" id="sl-period" min="2" max="8" value="'+pd+'" step="1" '
    +'oninput="document.getElementById(\'pd-v\').textContent=this.value+\' j\'" />'
    +'<span id="pd-v" style="min-width:44px;font-size:16px;font-weight:700;color:var(--primary);">'+pd+' j</span>'
    +'</div></div></div>'
    +'<button class="btn btn-primary btn-full" onclick="saveSettings()">'
    +'<i class="ti ti-check" aria-hidden="true"></i> Enregistrer</button>';

  /* Notifications */
  html += renderNotificationsSection();

  /* Assistant IA */
  html += renderBotSettingsSection();

  /* Données */
  html+='<div class="sec-title">Données personnelles</div>'
    +'<div class="settings-card">'
    +settingsRow('ti-download','Exporter mes données','Télécharger toutes vos données en JSON','<button class="btn btn-sm btn-outline" onclick="exportData()">Exporter</button>')
    +settingsRow('ti-lock','Confidentialité','Vos données sont chiffrées et stockées sur Supabase. Elles ne sont partagées avec personne.','')
    +'</div>';

  /* Compte */
  html+='<div class="sec-title">Compte</div>'
    +'<button class="btn btn-outline btn-full" onclick="logout()">'
    +'<i class="ti ti-logout" aria-hidden="true"></i> Se déconnecter</button>'
    +'<button class="btn btn-danger btn-full" onclick="openModal(\'confirmDelete\')">'
    +'<i class="ti ti-trash" aria-hidden="true"></i> Supprimer mon compte</button>';

  return html;
}

function settingsRow(icon,label,desc,action){
  return '<div class="settings-row"><i class="ti '+icon+' settings-row-icon" aria-hidden="true"></i>'
    +'<div class="settings-row-info"><div class="settings-row-label">'+label+'</div>'
    +(desc?'<div class="settings-row-desc">'+desc+'</div>':'')+'</div>'
    +(action?action:'')+'</div>';
}

/* ---- Section Notifications ---- */
function renderNotificationsSection(){
  if (typeof Notif === 'undefined' || !Notif.isSupported()) {
    return '<div class="sec-title">Notifications</div>'
      + '<div class="card card-sm"><div style="font-size:13px;color:var(--text-3);">Les notifications ne sont pas disponibles sur cet appareil.</div></div>';
  }
  var u = getUser();
  var prefs = (u && u.notifPrefs) || { enabled:false, pillReminder:false, pillHour:20 };
  var hasPillMed = u && (u.medications||[]).some(function(m){ return m.type==='pilule'; });
  var platformDesc = Notif.isCapacitor()
    ? 'Rappel programmé 2 jours avant vos règles et le jour J, même application fermée.'
    : 'Rappel affiché à l\'ouverture de l\'application si la date est proche (les navigateurs ne permettent pas de notifications en arrière-plan sans application installée).';

  var html = '<div class="sec-title">Notifications</div><div class="settings-card">';
  html += '<div class="settings-row">'
    + '<i class="ti ti-bell settings-row-icon" aria-hidden="true"></i>'
    + '<div class="settings-row-info"><div class="settings-row-label">Rappels de règles</div>'
    + '<div class="settings-row-desc">' + platformDesc + '</div></div>'
    + '<label class="switch"><input type="checkbox" id="notif-toggle" ' + (prefs.enabled?'checked':'') + ' onchange="toggleNotifications(this.checked)"><span class="switch-slider"></span></label>'
    + '</div>';

  if (hasPillMed) {
    html += '<div class="settings-row">'
      + '<i class="ti ti-pill settings-row-icon" aria-hidden="true"></i>'
      + '<div class="settings-row-info"><div class="settings-row-label">Rappel de pilule quotidien</div>'
      + '<div class="settings-row-desc">' + (Notif.isCapacitor() ? 'Notification chaque jour à l\'heure choisie.' : 'Disponible uniquement sur l\'application Android.') + '</div></div>'
      + (Notif.isCapacitor()
          ? '<label class="switch"><input type="checkbox" id="pill-toggle" ' + (prefs.pillReminder?'checked':'') + ' onchange="togglePillReminder(this.checked)"><span class="switch-slider"></span></label>'
          : '')
      + '</div>';
    if (Notif.isCapacitor() && prefs.pillReminder) {
      html += '<div class="settings-row">'
        + '<i class="ti ti-clock settings-row-icon" aria-hidden="true"></i>'
        + '<div class="settings-row-info"><div class="settings-row-label">Heure du rappel</div></div>'
        + '<input type="number" min="0" max="23" id="pill-hour" value="'+(prefs.pillHour||20)+'" style="width:60px;padding:6px;border:1px solid var(--border-mid);border-radius:6px;text-align:center;" onchange="savePillHour(this.value)" />'
        + '<span style="font-size:12px;color:var(--text-3);margin-left:6px;">h</span>'
        + '</div>';
    }
  }
  html += '</div>';
  return html;
}

async function toggleNotifications(enabled){
  if (enabled) {
    var granted = await Notif.requestPermission();
    if (!granted) {
      showToast('Permission refusée. Activez les notifications dans les réglages de votre appareil ou navigateur.','err');
      var t=document.getElementById('notif-toggle'); if(t) t.checked=false;
      return;
    }
  }
  updateUser(function(u){ u.notifPrefs = u.notifPrefs||{}; u.notifPrefs.enabled = enabled; return u; });
  showToast(enabled ? 'Notifications activées.' : 'Notifications désactivées.');
  render();
}
function togglePillReminder(enabled){
  updateUser(function(u){ u.notifPrefs = u.notifPrefs||{}; u.notifPrefs.pillReminder = enabled; return u; });
  render();
}
function savePillHour(h){
  var hour = Math.max(0, Math.min(23, parseInt(h)||20));
  updateUser(function(u){ u.notifPrefs = u.notifPrefs||{}; u.notifPrefs.pillHour = hour; return u; });
}

function saveSettings(){
  var cl=parseInt((document.getElementById('sl-cycle')||{}).value)||28;
  var pd=parseInt((document.getElementById('sl-period')||{}).value)||5;
  updateUser(function(u){u.cycleLen=cl;u.periodDur=pd;return u;});
  showToast('Paramètres enregistrés et synchronisés.');render();
}

function exportData(){
  var u=getUser();
  var blob=new Blob([JSON.stringify({exportDate:todayStr(),data:u},null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');
  a.href=url;a.download='cyclecare-export-'+todayStr()+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('Données exportées.');
}

function doDeleteAccount(){
  db.auth.signOut().then(function(){
    db.from('user_data').delete().eq('user_id',App.data.uid).then(function(){
      delete App.data.users[App.data.uid];App.data.uid=null;
      saveLocal(App.data);App.state.screen='auth';closeModal();render();
    });
  });
}

