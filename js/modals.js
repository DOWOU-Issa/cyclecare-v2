/* =============================================
   js/modals.js — Toutes les modales
   ============================================= */
function openModal(type, payload) {
  App.state.modal = type;
  App.state.modalPayload = payload || null;
  render();
  setTimeout(function(){ var f=document.querySelector('.modal-box input,.modal-box select'); if(f) f.focus(); }, 60);
}
function closeModal() {
  App.state.modal = null;
  App.state.modalPayload = null;
  render();
}
function renderModal(){
  if(!App.state.modal) return '';
  var c=getModalContent(App.state.modal); if(!c) return '';
  return '<div class="modal-overlay" onclick="if(event.target===this)closeModal()" role="dialog" aria-modal="true">'
    +'<div class="modal-box"><div class="modal-handle"></div>'+c+'</div></div>';
}
function getModalContent(t){
  var payload = App.state.modalPayload;
  switch(t){
    case'logPeriod':     return mLogPeriod(payload);
    case'endPeriod':     return mEndPeriod();
    case'logRapport':    return mLogRapport(payload);
    case'logSymptom':    return mLogSymptom(payload);
    case'logMed':        return mLogMed(payload);
    case'logMood':       return mLogMood(payload);
    case'logEnergy':     return mLogEnergy(payload);
    case'logTemp':       return mLogTemp(payload);
    case'logWeight':     return mLogWeight(payload);
    case'logThought':    return mLogThought(payload);
    case'logDischarge':  return mLogDischarge(payload);
    case'editProfile':   return mEditProfile();
    case'confirmDelete': return mConfirmDelete();
    case'confirmLogout': return mConfirmLogout();
    default: return null;
  }
}

/* --- Règles : création OU édition (payload = période existante si édition) --- */
function mLogPeriod(editData){
  var isEdit = !!editData;
  var p = editData || {};
  return mTitle('ti-droplet-filled', isEdit ? 'Modifier ces règles' : 'Enregistrer des règles')
    + mField('m-ps','Date de début','date', {max:todayStr()}, p.start||todayStr())
    + mField('m-pe','Date de fin (si terminées)','date', {max:todayStr(), min:p.start||undefined, opt:true}, p.end||'')
    + '<div style="font-size:12px;color:var(--text-3);margin:-8px 0 14px;line-height:1.45;">'
    + 'Laissez vide si vos règles sont en cours — vous pourrez indiquer la fin plus tard, qu\'elles durent 3, 4, 5 jours ou plus.</div>'
    + mSelect('m-pf','Flux menstruel', FLOW_OPTIONS, true, p.flow||null)
    + mTextarea('m-pn','Notes','Observations, couleur, douleurs...', true, p.notes||'')
    + mFooter('savePeriod()');
}
function savePeriod(){
  var s=val('m-ps');
  if(!s){ showToast('Sélectionnez une date de début.','err'); return; }
  var e=val('m-pe');
  if(e && e<s){ showToast('La date de fin doit être après la date de début.','err'); return; }
  var original = App.state.modalPayload; /* période en cours d'édition, ou null si nouvelle */
  updateUser(function(u){
    u.periods = u.periods || [];
    if (original) {
      u.periods = u.periods.filter(function(p){ return p.start !== original.start; });
    } else {
      u.periods = u.periods.filter(function(p){ return p.start !== s; }); /* évite les doublons exacts */
    }
    u.periods.push({ start:s, end:e||null, flow:val('m-pf')||null, notes:val('m-pn')||null });
    u.periods.sort(function(a,b){ return a.start<b.start?-1:a.start>b.start?1:0; });
    
    /* Enregistrer le retard si c'est une nouvelle période et qu'il y a un retard */
    if (!original && u.periods.length > 1) {
      var sorted = u.periods.slice().sort(function(a, b) { return a.start < b.start ? -1 : 1; });
      var idx = sorted.findIndex(function(p) { return p.start === s; });
      if (idx > 0) {
        var prevPeriod = sorted[idx - 1];
        var prevCycleLen = getCycleLen();
        var expectedDate = addDays(prevPeriod.start, prevCycleLen);
        if (diffDays(expectedDate, s) > 0) {
          recordPeriodDelay(expectedDate, s);
        }
      }
    }
    
    return u;
  });
  closeModal();
  showToast(original ? 'Règles mises à jour.' : 'Règles enregistrées.');
}

/* --- Terminer des règles en cours (durée réelle : 3, 4, 5 jours, etc.) --- */
function mEndPeriod(){
  var ap = getActivePeriod();
  if(!ap){
    return mTitle('ti-droplet-half-2','Aucune règle en cours')
      + '<div style="font-size:13px;color:var(--text-3);line-height:1.5;margin-bottom:14px;">Vous n\'avez pas de règles en cours actuellement. Vous pouvez modifier une entrée existante depuis le Journal.</div>'
      + '<div class="modal-footer"><button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Fermer</button></div>';
  }
  return mTitle('ti-droplet-half-2','Terminer mes règles')
    + '<div style="font-size:13px;color:var(--text-3);margin-bottom:16px;line-height:1.5;">'
    + 'Vos règles ont commencé le <strong>'+fmtDate(ap.start)+'</strong>. Indiquez la date à laquelle elles se sont arrêtées — '
    + 'cela peut être 3, 4, 5 jours ou plus, chaque cycle est différent.</div>'
    + mField('m-end-date','Date de fin réelle','date', todayStr(), {min:ap.start, max:todayStr()})
    + mFooter('saveEndPeriod()');
}
function saveEndPeriod(){
  var ap = getActivePeriod(); if(!ap){ closeModal(); return; }
  var endDate = val('m-end-date') || todayStr();
  if (endDate < ap.start) { showToast('La date de fin doit être après le début.','err'); return; }
  updateUser(function(u){
    var idx = u.periods.findIndex(function(p){ return p.start===ap.start; });
    if(idx>=0) u.periods[idx].end = endDate;
    return u;
  });
  closeModal();
  var dur = diffDays(ap.start, endDate)+1;
  showToast('Règles terminées : '+dur+' jour'+(dur>1?'s':'')+'.');
}

/* --- Rapport --- */
function mLogRapport(editData){
  var isEdit = !!editData;
  var r = editData || {};
  return mTitle('ti-heart', isEdit ? 'Modifier ce rapport' : 'Enregistrer un rapport')
    +mField('m-rd','Date','date', r.date||todayStr(),{max:todayStr()})
    +mSelect('m-rp','Protection',[{val:'true',lbl:'Oui — Préservatif ou contraception'},{val:'false',lbl:'Non — Sans protection'}], false, r.protected ? 'true' : 'false')
    +'<div class="card" style="background:var(--z-danger-bg);border-color:var(--z-danger-bd);padding:11px 14px;margin-bottom:8px;">'
    +'<div style="font-size:13px;color:var(--z-danger-tx);line-height:1.5;">'
    +'<i class="ti ti-alert-triangle" aria-hidden="true"></i> '
    +'Rapport non protégé en période fertile ? Prenez une contraception d\'urgence dès que possible.</div></div>'
    +mFooter('saveRapport()');
}
function saveRapport(){
  var d=val('m-rd'),p=val('m-rp')==='true';
  if(!d){showToast('Sélectionnez une date.','err');return;}
  var original = App.state.modalPayload; /* rapport en cours d'édition, ou null si nouveau */
  updateUser(function(u){
    u.rapports = u.rapports || [];
    if (original) {
      u.rapports = u.rapports.filter(function(r){ return !(r.date === original.date && r.protected === original.protected); });
    }
    u.rapports.push({date:d,protected:p});
    u.rapports.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Rapport modifié.' : 'Rapport enregistré.');
  if(!p){var lp=getLastPeriod();if(lp&&getZone(d,lp.start,getCycleLen())==='danger')
    setTimeout(function(){showToast('Période fertile — contraception d\'urgence disponible en pharmacie.','warn');},1800);}
}

/* --- Symptômes --- */
function mLogSymptom(editData){
  var isEdit = !!editData;
  var s = editData || {};
  var cbs=SYMPTOM_OPTIONS.map(function(sym){
    var id='sy-'+sym.replace(/\s+/g,'-');
    var checked = (s.items && s.items.indexOf(sym) !== -1) ? ' checked' : '';
    return'<label class="cb-item" for="'+id+'"><input type="checkbox" id="'+id+'" value="'+sym+'"'+checked+'>'+sym+'</label>';
  }).join('');
  return mTitle('ti-mood-sad', isEdit ? 'Modifier ces symptômes' : 'Enregistrer des symptômes')
    +mField('m-sd','Date','date', s.date||todayStr(),{max:todayStr()})
    +'<div class="form-grp"><label class="lbl">Symptômes</label><div class="cb-grid">'+cbs+'</div></div>'
    +mTextarea('m-sn','Notes libres','Autres observations...',true, s.notes||'')
    +mFooter('saveSymptom()');
}
function saveSymptom(){
  var d=val('m-sd');if(!d){showToast('Sélectionnez une date.','err');return;}
  var items=SYMPTOM_OPTIONS.filter(function(s){var e=document.getElementById('sy-'+s.replace(/\s+/g,'-'));return e&&e.checked;});
  if(!items.length){showToast('Sélectionnez au moins un symptôme.','err');return;}
  var original = App.state.modalPayload; /* symptôme en cours d'édition, ou null si nouveau */
  updateUser(function(u){
    u.symptoms = u.symptoms || [];
    if (original) {
      u.symptoms = u.symptoms.filter(function(s){ return s.date !== original.date; });
    }
    u.symptoms.push({date:d,items:items,notes:val('m-sn')||null});
    u.symptoms.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Symptômes modifiés.' : 'Symptômes enregistrés.');
}

/* --- Médicament --- */
function mLogMed(editData){
  var isEdit = !!editData;
  var m = editData || {};
  var opts=Object.keys(MEDS_DATA).map(function(k){return{val:k,lbl:MEDS_DATA[k].name};});
  return mTitle('ti-pill', isEdit ? 'Modifier ce médicament' : 'Enregistrer une prise de médicament')
    +mField('m-md','Date de prise','date', {max:todayStr()}, m.date||todayStr())
    +mSelect('m-mt','Médicament',opts, false, m.type||null)
    +mField('m-mn','Notes', 'text', {opt:true}, m.notes||'')
    +mFooter('saveMed()');
}
function saveMed(){
  var d=val('m-md'),t=val('m-mt');if(!d){showToast('Sélectionnez une date.','err');return;}
  var info=MEDS_DATA[t]||{};
  var original = App.state.modalPayload; /* médicament en cours d'édition, ou null si nouveau */
  updateUser(function(u){
    u.medications = u.medications || [];
    if (original) {
      u.medications = u.medications.filter(function(m){ return m.date !== original.date; });
    }
    u.medications.push({date:d,type:t,name:info.name||t,notes:val('m-mn')||null});
    u.medications.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Médicament modifié.' : 'Médicament enregistré.');
}

/* --- Humeur --- */
function mLogMood(editData){
  var isEdit = !!editData;
  var m = editData || {};
  var moodOpts = MOOD_OPTIONS.map(function(opt){
    var selected = (m.value && m.value === opt.val) ? ' selected' : '';
    return '<option value="'+opt.val+'"'+selected+'>'+opt.lbl+'</option>';
  }).join('');
  return mTitle('ti-mood-happy', isEdit ? 'Modifier cette humeur' : 'Enregistrer mon humeur')
    + mField('m-md','Date','date', {max:todayStr()}, m.date||todayStr())
    + '<div class="form-grp"><label class="lbl">Humeur (1-10)</label>'
    + '<select class="inp" id="m-mv">'+moodOpts+'</select></div>'
    + mTextarea('m-mn','Notes','Comment vous sentez-vous?', true, m.notes||'')
    + mFooter('saveMood()');
}
function saveMood(){
  var d=val('m-md');if(!d){showToast('Sélectionnez une date.','err');return;}
  var v=parseInt(val('m-mv'));if(isNaN(v)||v<1||v>10){showToast('Sélectionnez une humeur valide.','err');return;}
  var original = App.state.modalPayload;
  updateUser(function(u){
    u.moods = u.moods || [];
    if (original) {
      u.moods = u.moods.filter(function(m){ return m.date !== original.date; });
    }
    u.moods.push({date:d,value:v,notes:val('m-mn')||null});
    u.moods.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Humeur modifiée.' : 'Humeur enregistrée.');
}

/* --- Énergie --- */
function mLogEnergy(editData){
  var isEdit = !!editData;
  var e = editData || {};
  var energyOpts = ENERGY_OPTIONS.map(function(opt){
    var selected = (e.value && e.value === opt.val) ? ' selected' : '';
    return '<option value="'+opt.val+'"'+selected+'>'+opt.lbl+'</option>';
  }).join('');
  return mTitle('ti-battery-charging', isEdit ? 'Modifier cette énergie' : 'Enregistrer mon énergie')
    + mField('m-ed','Date','date', {max:todayStr()}, e.date||todayStr())
    + '<div class="form-grp"><label class="lbl">Niveau d\'énergie (1-8)</label>'
    + '<select class="inp" id="m-ev">'+energyOpts+'</select></div>'
    + mTextarea('m-en','Notes','Comment vous sentez-vous?', true, e.notes||'')
    + mFooter('saveEnergy()');
}
function saveEnergy(){
  var d=val('m-ed');if(!d){showToast('Sélectionnez une date.','err');return;}
  var v=parseInt(val('m-ev'));if(isNaN(v)||v<1||v>8){showToast('Sélectionnez un niveau d\'énergie valide.','err');return;}
  var original = App.state.modalPayload;
  updateUser(function(u){
    u.energies = u.energies || [];
    if (original) {
      u.energies = u.energies.filter(function(e){ return e.date !== original.date; });
    }
    u.energies.push({date:d,value:v,notes:val('m-en')||null});
    u.energies.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Énergie modifiée.' : 'Énergie enregistrée.');
}

/* --- Température basale --- */
function mLogTemp(editData){
  var isEdit = !!editData;
  var t = editData || {};
  var timeOpts = TEMP_TIME_OPTIONS.map(function(opt){
    var selected = (t.time && t.time === opt.val) ? ' selected' : '';
    return '<option value="'+opt.val+'"'+selected+'>'+opt.lbl+'</option>';
  }).join('');
  return mTitle('ti-thermometer', isEdit ? 'Modifier cette température' : 'Enregistrer ma température')
    + mField('m-td','Date','date', {max:todayStr()}, t.date||todayStr())
    + '<div class="form-grp"><label class="lbl">Heure de prise (matin, au réveil)</label>'
    + '<select class="inp" id="m-tt">'+timeOpts+'</select></div>'
    + mField('m-tv','Température (°C)','number', {}, t.value||'36.5')
    + mTextarea('m-tn','Notes','Dormi bien ? Malade ? Autres facteurs...', true, t.notes||'')
    + mFooter('saveTemp()');
}
function saveTemp(){
  var d=val('m-td');if(!d){showToast('Sélectionnez une date.','err');return;}
  var v=parseFloat(val('m-tv'));if(isNaN(v)||v<35||v>42){showToast('Température invalide (35-42°C).','err');return;}
  var original = App.state.modalPayload;
  updateUser(function(u){
    u.temperatures = u.temperatures || [];
    if (original) {
      u.temperatures = u.temperatures.filter(function(t){ return t.date !== original.date; });
    }
    u.temperatures.push({date:d,time:val('m-tt')||'07:00',value:v,notes:val('m-tn')||null});
    u.temperatures.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Température modifiée.' : 'Température enregistrée.');
}

/* --- Poids --- */
function mLogWeight(editData){
  var isEdit = !!editData;
  var w = editData || {};
  return mTitle('ti-scale', isEdit ? 'Modifier ce poids' : 'Enregistrer mon poids')
    + mField('m-wd','Date','date', {max:todayStr()}, w.date||todayStr())
    + mField('m-wv','Poids (kg)','number', {}, w.value||'60')
    + mTextarea('m-wn','Notes','Moment de la journée, conditions...', true, w.notes||'')
    + mFooter('saveWeight()');
}
function saveWeight(){
  var d=val('m-wd');if(!d){showToast('Sélectionnez une date.','err');return;}
  var v=parseFloat(val('m-wv'));if(isNaN(v)||v<30||v>200){showToast('Poids invalide (30-200kg).','err');return;}
  var original = App.state.modalPayload;
  updateUser(function(u){
    u.weights = u.weights || [];
    if (original) {
      u.weights = u.weights.filter(function(w){ return w.date !== original.date; });
    }
    u.weights.push({date:d,value:v,notes:val('m-wn')||null});
    u.weights.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Poids modifié.' : 'Poids enregistré.');
}

/* --- Journal de pensées --- */
function mLogThought(editData){
  var isEdit = !!editData;
  var th = editData || {};
  return mTitle('ti-notebook', isEdit ? 'Modifier cette pensée' : 'Nouvelle pensée')
    + mField('m-thd','Date','date', {max:todayStr()}, th.date||todayStr())
    + mTextarea('m-tht','Pensée','Exprimez vos ressentis librement...', false, th.text||'')
    + mField('m-thm','Humeur associée (optionnel)','text', {opt:true}, th.mood||'')
    + mFooter('saveThought()');
}
function saveThought(){
  var d=val('m-thd');if(!d){showToast('Sélectionnez une date.','err');return;}
  var t=val('m-tht');if(!t.trim()){showToast('Écrivez une pensée.','err');return;}
  var original = App.state.modalPayload;
  updateUser(function(u){
    u.thoughts = u.thoughts || [];
    if (original) {
      u.thoughts = u.thoughts.filter(function(th){ return th.date !== original.date; });
    }
    u.thoughts.push({date:d,text:t,mood:val('m-thm')||null});
    u.thoughts.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Pensée modifiée.' : 'Pensée enregistrée.');
}

/* --- Pertes vaginales --- */
var DISCHARGE_OPTIONS = [
  { val:'none', lbl:'Aucune' },
  { val:'white', lbl:'Blanches/laiteuses' },
  { val:'clear', lbl:'Claires/transparentes' },
  { val:'creamy', lbl:'Crémeuses' },
  { val:'eggwhite', lbl:'Type blanc d\'œuf (ovulation)' },
  { val:'yellow', lbl:'Jaunâtres' },
  { val:'brown', lbl:'Brunes' },
  { val:'pink', lbl:'Rosées' }
];

var DISCHARGE_AMOUNT_OPTIONS = [
  { val:'light', lbl:'Léger' },
  { val:'medium', lbl:'Moyen' },
  { val:'heavy', lbl:'Abondant' }
];

function mLogDischarge(editData){
  var isEdit = !!editData;
  var d = editData || {};
  var typeOpts = DISCHARGE_OPTIONS.map(function(opt){
    var selected = (d.type && d.type === opt.val) ? ' selected' : '';
    return '<option value="'+opt.val+'"'+selected+'>'+opt.lbl+'</option>';
  }).join('');
  var amountOpts = DISCHARGE_AMOUNT_OPTIONS.map(function(opt){
    var selected = (d.amount && d.amount === opt.val) ? ' selected' : '';
    return '<option value="'+opt.val+'"'+selected+'>'+opt.lbl+'</option>';
  }).join('');
  return mTitle('ti-droplet', isEdit ? 'Modifier ces pertes' : 'Enregistrer des pertes vaginales')
    + mField('m-dd','Date','date', {max:todayStr()}, d.date||todayStr())
    + '<div class="form-grp"><label class="lbl">Type de pertes</label>'
    + '<select class="inp" id="m-dt">'+typeOpts+'</select></div>'
    + '<div class="form-grp"><label class="lbl">Quantité</label>'
    + '<select class="inp" id="m-da">'+amountOpts+'</select></div>'
    + mTextarea('m-dn','Notes','Texture, odeur, autres observations...', true, d.notes||'')
    + mFooter('saveDischarge()');
}
function saveDischarge(){
  var d=val('m-dd');if(!d){showToast('Sélectionnez une date.','err');return;}
  var original = App.state.modalPayload;
  updateUser(function(u){
    u.discharge = u.discharge || [];
    if (original) {
      u.discharge = u.discharge.filter(function(d){ return d.date !== original.date; });
    }
    u.discharge.push({date:d,type:val('m-dt'),amount:val('m-da'),notes:val('m-dn')||null});
    u.discharge.sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
    return u;
  });
  closeModal();
  showToast(original ? 'Pertes modifiées.' : 'Pertes enregistrées.');
}

/* --- Édition profil --- */
function mEditProfile(){
  var u=getUser()||{};
  var aColor=(u.avatarColor)||'#8b2252';
  var init=(u.name||'?').charAt(0).toUpperCase();
  var colorBtns=AVATAR_COLORS.map(function(c){
    return'<div class="color-chip'+(c.val===aColor?' sel':'')+'" style="background:'+c.val+';" '
      +'onclick="previewProfileColor(\''+c.val+'\')" title="'+c.lbl+'"></div>';
  }).join('');
  return'<div class="modal-title"><i class="ti ti-user-circle" aria-hidden="true"></i> Mon profil</div>'
    +'<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">'
    +'<div id="ep-avatar" style="width:60px;height:60px;border-radius:50%;background:'+aColor
    +';display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;flex-shrink:0;">'+esc(init)+'</div>'
    +'<div><div style="font-size:13px;color:var(--text-3);margin-bottom:6px;">Couleur de l\'avatar</div>'
    +'<div class="color-picker-row">'+colorBtns+'</div></div>'
    +'</div>'
    +'<div class="form-grp"><label class="lbl" for="ep-name">Prénom affiché</label>'
    +'<input class="inp" type="text" id="ep-name" value="'+esc(u.name||'')+'" placeholder="Votre prénom"/></div>'
    +'<div class="form-grp"><label class="lbl">Email</label>'
    +'<div class="inp" style="background:var(--bg);color:var(--text-3);">'+esc(u.email||'')+'</div></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">'
    +'<button class="btn btn-primary" style="flex:2;min-width:120px;" onclick="saveProfile()"><i class="ti ti-check" aria-hidden="true"></i> Enregistrer</button>'
    +'<button class="btn btn-outline" style="flex:1;min-width:100px;" onclick="openModal(\'confirmLogout\')"><i class="ti ti-logout" aria-hidden="true"></i> Déconnexion</button>'
    +'</div>'
    +'<button class="btn btn-danger" style="width:100%;margin-top:8px;" onclick="openModal(\'confirmDelete\')">'
    +'<i class="ti ti-trash" aria-hidden="true"></i> Supprimer mon compte</button>';
}
function previewProfileColor(color){
  var av=document.getElementById('ep-avatar');if(av)av.style.background=color;
  document.querySelectorAll('.color-chip').forEach(function(b){b.classList.remove('sel');});
  document.querySelectorAll('.color-chip').forEach(function(b){
    if(b.getAttribute('style')&&b.getAttribute('style').indexOf(color)!==-1)b.classList.add('sel');
  });
  App._pendingColor=color;
}
function saveProfile(){
  var name=val('ep-name')||getUser().name;
  var color=App._pendingColor||(getUser().avatarColor||'#8b2252');
  App._pendingColor=null;
  updateUser(function(u){u.name=name;u.avatarColor=color;return u;});
  closeModal();showToast('Profil mis à jour.');
}

/* --- Confirmations --- */
function mConfirmLogout(){
  return'<div class="modal-title"><i class="ti ti-logout" aria-hidden="true"></i> Se déconnecter</div>'
    +'<div style="font-size:14px;line-height:1.6;margin-bottom:16px;">Vous serez déconnectée de ce compte. Vos données sont sauvegardées et resteront accessibles à la prochaine connexion.</div>'
    +'<div class="modal-footer">'
    +'<button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Annuler</button>'
    +'<button class="btn btn-primary" style="flex:1;" onclick="logout()"><i class="ti ti-logout" aria-hidden="true"></i> Déconnexion</button></div>';
}
function mConfirmDelete(){
  return'<div class="modal-title" style="color:var(--z-danger-tx);">'
    +'<i class="ti ti-alert-triangle" aria-hidden="true"></i> Supprimer mon compte</div>'
    +'<div style="font-size:14px;line-height:1.6;margin-bottom:16px;">Cette action est <strong>irréversible</strong>. '
    +'Toutes vos données seront définitivement supprimées.</div>'
    +'<div class="modal-footer">'
    +'<button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Annuler</button>'
    +'<button class="btn btn-danger" style="flex:1;" onclick="doDeleteAccount()">'
    +'<i class="ti ti-trash" aria-hidden="true"></i> Supprimer</button></div>';
}

/* ---- Helpers ---- */
function val(id){return((document.getElementById(id)||{}).value||'').trim();}
function mTitle(icon,text){return'<div class="modal-title"><i class="ti '+icon+'" aria-hidden="true"></i>'+text+'</div>';}
function mField(id,label,type,opts,defVal){
  opts=opts||{};
  var sfx=opts.opt?' <span style="text-transform:none;font-weight:400;font-size:10px;">(optionnel)</span>':'';
  return'<div class="form-grp"><label class="lbl" for="'+id+'">'+label+sfx+'</label>'
    +'<input class="inp" type="'+(type||'text')+'" id="'+id+'" '
    +(defVal!==undefined&&defVal!==''?'value="'+defVal+'" ':'')
    +(opts.max?'max="'+opts.max+'" ':'')
    +(opts.min?'min="'+opts.min+'" ':'')
    +'/></div>';
}
function mSelect(id,label,options,opt,selectedVal){
  var sfx=opt?' <span style="text-transform:none;font-weight:400;font-size:10px;">(optionnel)</span>':'';
  return'<div class="form-grp"><label class="lbl" for="'+id+'">'+label+sfx+'</label>'
    +'<select class="inp" id="'+id+'">'+(opt?'<option value="">— Choisir —</option>':'')
    +options.map(function(o){
        var sel=(selectedVal!=null&&o.val===selectedVal)?' selected':'';
        return'<option value="'+o.val+'"'+sel+'>'+o.lbl+'</option>';
     }).join('')
    +'</select></div>';
}
function mTextarea(id,label,ph,opt,defVal){
  var sfx=opt?' <span style="text-transform:none;font-weight:400;font-size:10px;">(optionnel)</span>':'';
  return'<div class="form-grp"><label class="lbl" for="'+id+'">'+label+sfx+'</label>'
    +'<textarea class="inp" id="'+id+'" placeholder="'+ph+'" rows="2">'+esc(defVal||'')+'</textarea></div>';
}
function mFooter(fn){
  return'<div class="modal-footer">'
    +'<button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Annuler</button>'
    +'<button class="btn btn-primary" style="flex:1;" onclick="'+fn+'">Enregistrer</button></div>';
}
