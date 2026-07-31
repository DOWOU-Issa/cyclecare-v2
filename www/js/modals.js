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
    case'logRapport':    return mLogRapport();
    case'logSymptom':    return mLogSymptom();
    case'logMed':        return mLogMed();
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
    + mField('m-ps','Date de début','date', p.start||todayStr(), {max:todayStr()})
    + mField('m-pe','Date de fin (si terminées)','date', p.end||'', {max:todayStr(), min:p.start||undefined, opt:true})
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
function mLogRapport(){
  return mTitle('ti-heart','Enregistrer un rapport')
    +mField('m-rd','Date','date',todayStr(),{max:todayStr()})
    +mSelect('m-rp','Protection',[{val:'true',lbl:'Oui — Préservatif ou contraception'},{val:'false',lbl:'Non — Sans protection'}])
    +'<div class="card" style="background:var(--z-danger-bg);border-color:var(--z-danger-bd);padding:11px 14px;margin-bottom:8px;">'
    +'<div style="font-size:13px;color:var(--z-danger-tx);line-height:1.5;">'
    +'<i class="ti ti-alert-triangle" aria-hidden="true"></i> '
    +'Rapport non protégé en période fertile ? Prenez une contraception d\'urgence dès que possible.</div></div>'
    +mFooter('saveRapport()');
}
function saveRapport(){
  var d=val('m-rd'),p=val('m-rp')==='true';
  if(!d){showToast('Sélectionnez une date.','err');return;}
  updateUser(function(u){u.rapports.push({date:d,protected:p});return u;});
  closeModal();showToast('Rapport enregistré.');
  if(!p){var lp=getLastPeriod();if(lp&&getZone(d,lp.start,getCycleLen())==='danger')
    setTimeout(function(){showToast('Période fertile — contraception d\'urgence disponible en pharmacie.','warn');},1800);}
}

/* --- Symptômes --- */
function mLogSymptom(){
  var cbs=SYMPTOM_OPTIONS.map(function(s){
    var id='sy-'+s.replace(/\s+/g,'-');
    return'<label class="cb-item" for="'+id+'"><input type="checkbox" id="'+id+'" value="'+s+'">'+s+'</label>';
  }).join('');
  return mTitle('ti-mood-sad','Enregistrer des symptômes')
    +mField('m-sd','Date','date',todayStr(),{max:todayStr()})
    +'<div class="form-grp"><label class="lbl">Symptômes</label><div class="cb-grid">'+cbs+'</div></div>'
    +mTextarea('m-sn','Notes libres','Autres observations...',true)
    +mFooter('saveSymptom()');
}
function saveSymptom(){
  var d=val('m-sd');if(!d){showToast('Sélectionnez une date.','err');return;}
  var items=SYMPTOM_OPTIONS.filter(function(s){var e=document.getElementById('sy-'+s.replace(/\s+/g,'-'));return e&&e.checked;});
  if(!items.length){showToast('Sélectionnez au moins un symptôme.','err');return;}
  updateUser(function(u){u.symptoms.push({date:d,items:items,notes:val('m-sn')||null});return u;});
  closeModal();showToast('Symptômes enregistrés.');
}

/* --- Médicament --- */
function mLogMed(){
  var opts=Object.keys(MEDS_DATA).map(function(k){return{val:k,lbl:MEDS_DATA[k].name};});
  return mTitle('ti-pill','Enregistrer une prise de médicament')
    +mField('m-md','Date de prise','date',todayStr(),{max:todayStr()})
    +mSelect('m-mt','Médicament',opts)
    +mField('m-mn','Notes','Ex : pris 12h après le rapport',{opt:true})
    +mFooter('saveMed()');
}
function saveMed(){
  var d=val('m-md'),t=val('m-mt');if(!d){showToast('Sélectionnez une date.','err');return;}
  var info=MEDS_DATA[t]||{};
  updateUser(function(u){u.medications.push({date:d,type:t,name:info.name||t,notes:val('m-mn')||null});return u;});
  closeModal();showToast('Médicament enregistré.');
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
function mField(id,label,type,defVal,opts){
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
