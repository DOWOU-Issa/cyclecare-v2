/* =============================================
   js/screens.js — Journal, médicaments et pages secondaires
   ============================================= */
function renderJournal() {
  var tabs=[{id:'regles',lbl:'Règles',ico:'ti-droplet-filled'},{id:'rapports',lbl:'Rapports',ico:'ti-heart'},{id:'symptomes',lbl:'Symptômes',ico:'ti-mood-sad'},{id:'humeur',lbl:'Humeur',ico:'ti-mood-happy'},{id:'energie',lbl:'Énergie',ico:'ti-battery-charging'},{id:'temperature',lbl:'Température',ico:'ti-thermometer'},{id:'poids',lbl:'Poids',ico:'ti-scale'},{id:'pensees',lbl:'Pensées',ico:'ti-notebook'},{id:'pertes',lbl:'Pertes',ico:'ti-droplet'}];
  var html='<div class="tab-row">'+tabs.map(function(t){
    return '<button class="tab-btn'+(App.state.journalTab===t.id?' active':'')+'" onclick="setJournalTab(\''+t.id+'\')">'
      +'<i class="ti '+t.ico+'" aria-hidden="true"></i>'+t.lbl+'</button>';
  }).join('')+'</div>';
  if(App.state.journalTab==='regles')       return html+renderReglesTab();
  if(App.state.journalTab==='rapports')     return html+renderRapportsTab();
  if(App.state.journalTab==='symptomes')   return html+renderSymptomesTab();
  if(App.state.journalTab==='humeur')      return html+renderMoodTab();
  if(App.state.journalTab==='energie')     return html+renderEnergyTab();
  if(App.state.journalTab==='temperature') return html+renderTempTab();
  if(App.state.journalTab==='poids')       return html+renderWeightTab();
  if(App.state.journalTab==='pensees')     return html+renderThoughtTab();
  if(App.state.journalTab==='pertes')      return html+renderDischargeTab();
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
    // Utiliser la zone historique cohérente pour chaque rapport
    var zone= u && u.periods && u.periods.length ? getZoneForDate(r.date, u.periods, cl) : (lp?getZone(r.date,lp.start,cl,getEstimatedPeriodDur()):null);
    var zi=zone?ZONE_INFO[zone]:null;
    var hasMed=(u.medications||[]).some(function(m){var d=diffDays(r.date,m.date);return d>=0&&d<=5&&(m.type==='norLevo'||m.type==='ellaOne');});
    html+='<div class="list-item"><div class="item-icon '+(r.protected?'item-icon-green':'item-icon-red')+'">'
      +'<i class="ti ti-heart" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(r.date)+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">'
      +'<span class="zone-chip '+(r.protected?'zc-safe':'zc-danger')+'">'+(r.protected?'Protégé':'Non protégé')+'</span>'
      +(zi?'<span class="zone-chip '+zi.chipCls+'">'+zi.lbl+'</span>':'')
      +(hasMed?'<span class="zone-chip" style="background:#eeebff;color:#4a3cab;border-color:#c5bff5;">Contraceptif pris</span>':'')
      +'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editRapportEntry(\''+esc(r.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delRapport(\''+esc(r.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
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
    html+='<div class="list-item"><div class="item-icon item-icon-amber"><i class="ti ti-mood-sad" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(s.date)+'</div>'
      +'<div class="item-sub">'+esc((s.items||[]).join(', '))+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editSymptomEntry(\''+esc(s.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delSymptom(\''+esc(s.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderMoodTab(){
  var u=getUser();var moods=(u&&u.moods||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logMood\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer mon humeur</button>'
    +'<div class="sec-title">Historique</div>';
  if(!moods.length) return html+'<div class="card">'+empty('Aucune humeur enregistrée.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  moods.slice(0,12).forEach(function(m){
    var moodInfo=MOOD_OPTIONS.find(function(opt){return opt.val===m.value;})||{};
    html+='<div class="list-item"><div class="item-icon" style="background:'+moodInfo.color+';width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti '+moodInfo.icon+'" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(m.date)+'</div>'
      +'<div class="item-sub">'+moodInfo.lbl+' ('+m.value+'/10)'+(m.notes?' · '+esc(m.notes):'')+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editMoodEntry(\''+esc(m.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delMood(\''+esc(m.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderEnergyTab(){
  var u=getUser();var energies=(u&&u.energies||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logEnergy\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer mon énergie</button>'
    +'<div class="sec-title">Historique</div>';
  if(!energies.length) return html+'<div class="card">'+empty('Aucune énergie enregistrée.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  energies.slice(0,12).forEach(function(e){
    var energyInfo=ENERGY_OPTIONS.find(function(opt){return opt.val===e.value;})||{};
    html+='<div class="list-item"><div class="item-icon" style="background:'+energyInfo.color+';width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti '+energyInfo.icon+'" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(e.date)+'</div>'
      +'<div class="item-sub">'+energyInfo.lbl+' ('+e.value+'/8)'+(e.notes?' · '+esc(e.notes):'')+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editEnergyEntry(\''+esc(e.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delEnergy(\''+esc(e.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderTempTab(){
  var u=getUser();var temps=(u&&u.temperatures||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logTemp\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer ma température</button>'
    +'<div class="card" style="background:var(--z-caution-bg);border-color:var(--z-caution-bd);padding:11px 14px;margin-bottom:12px;">'
    +'<div style="font-size:13px;color:var(--z-caution-tx);line-height:1.5;">'
    +'<i class="ti ti-info-circle" style="font-size:16px;" aria-hidden="true"></i> '
    +'Prenez votre température basale chaque matin au réveil, avant de vous lever. Une hausse de 0.3-0.5°C indique généralement l\'ovulation.</div></div>'
    +'<div class="sec-title">Historique</div>';
  if(!temps.length) return html+'<div class="card">'+empty('Aucune température enregistrée.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  temps.slice(0,12).forEach(function(t){
    var tempColor = t.value > 37 ? '#e74c3c' : t.value > 36.5 ? '#f39c12' : '#27ae60';
    html+='<div class="list-item"><div class="item-icon" style="background:'+tempColor+';width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti ti-thermometer" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(t.date)+' · '+t.time+'</div>'
      +'<div class="item-sub">'+t.value+'°C'+(t.notes?' · '+esc(t.notes):'')+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editTempEntry(\''+esc(t.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delTemp(\''+esc(t.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderWeightTab(){
  var u=getUser();var weights=(u&&u.weights||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logWeight\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer mon poids</button>'
    +'<div class="sec-title">Historique</div>';
  if(!weights.length) return html+'<div class="card">'+empty('Aucun poids enregistré.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  weights.slice(0,12).forEach(function(w){
    html+='<div class="list-item"><div class="item-icon item-icon-purple" style="width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti ti-scale" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(w.date)+'</div>'
      +'<div class="item-sub">'+w.value+' kg'+(w.notes?' · '+esc(w.notes):'')+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editWeightEntry(\''+esc(w.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delWeight(\''+esc(w.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderThoughtTab(){
  var u=getUser();var thoughts=(u&&u.thoughts||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logThought\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Nouvelle pensée</button>'
    +'<div class="sec-title">Journal de pensées</div>';
  if(!thoughts.length) return html+'<div class="card">'+empty('Aucune pensée enregistrée.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  thoughts.slice(0,12).forEach(function(th){
    html+='<div class="list-item" style="padding:12px 0;"><div class="item-icon item-icon-amber" style="width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti ti-notebook" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(th.date)+'</div>'
      +'<div class="item-sub" style="line-height:1.4;">'+esc(th.text)+'</div>'
      +(th.mood?'<div style="font-size:12px;color:var(--text-3);margin-top:4px;">Humeur: '+esc(th.mood)+'</div>':'')
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editThoughtEntry(\''+esc(th.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delThought(\''+esc(th.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
  });
  return html+'</div>';
}

function renderDischargeTab(){
  var u=getUser();var discharges=(u&&u.discharge||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='<button class="btn btn-primary btn-full" onclick="openModal(\'logDischarge\')">'
    +'<i class="ti ti-plus" aria-hidden="true"></i> Enregistrer des pertes</button>'
    +'<div class="card" style="background:var(--z-safe-bg);border-color:var(--z-safe-bd);padding:11px 14px;margin-bottom:12px;">'
    +'<div style="font-size:13px;color:var(--z-safe-tx);line-height:1.5;">'
    +'<i class="ti ti-info-circle" style="font-size:16px;" aria-hidden="true"></i> '
    +'Le type de pertes vaginales change selon le cycle. Les pertes type "blanc d\'œuf" indiquent souvent l\'ovulation.</div></div>'
    +'<div class="sec-title">Historique</div>';
  if(!discharges.length) return html+'<div class="card">'+empty('Aucune perte enregistrée.')+'</div>';
  html+='<div class="card" style="padding:4px 14px;">';
  discharges.slice(0,12).forEach(function(d){
    var typeInfo=DISCHARGE_OPTIONS.find(function(opt){return opt.val===d.type;})||{};
    var amountInfo=DISCHARGE_AMOUNT_OPTIONS.find(function(opt){return opt.val===d.amount;})||{};
    var dischargeColor = d.type==='eggwhite'?'#27ae60':d.type==='clear'?'#3498db':'#95a5a6';
    html+='<div class="list-item"><div class="item-icon" style="background:'+dischargeColor+';width:38px;height:38px;border-radius:9px;">'
      +'<i class="ti ti-droplet" aria-hidden="true"></i></div>'
      +'<div style="flex:1;"><div class="item-label">'+fmtDate(d.date)+'</div>'
      +'<div class="item-sub">'+typeInfo.lbl+' · '+amountInfo.lbl+(d.notes?' · '+esc(d.notes):'')+'</div></div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editDischargeEntry(\''+esc(d.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delDischarge(\''+esc(d.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
      +'</div></div>';
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
/* Les entrées sont identifiées par un id unique (voir ensureIds dans storage.js) :
   deux entrées le même jour ne se confondent plus. */
function delEntryById(list,id){updateUser(function(u){u[list]=(u[list]||[]).filter(function(x){return x.id!==id;});return u;});showToast('Entrée supprimée.');render();}
function editEntryById(list,id,modal){var u=getUser();var e=(u[list]||[]).find(function(x){return x.id===id;});if(!e) return;openModal(modal,e);}
function delRapport(id){delEntryById('rapports',id);}
function editRapportEntry(id){editEntryById('rapports',id,'logRapport');}
function delSymptom(id){delEntryById('symptoms',id);}
function editSymptomEntry(id){editEntryById('symptoms',id,'logSymptom');}
function delMed(id){delEntryById('medications',id);}
function editMedEntry(id){editEntryById('medications',id,'logMed');}
function delMood(id){delEntryById('moods',id);}
function editMoodEntry(id){editEntryById('moods',id,'logMood');}
function delEnergy(id){delEntryById('energies',id);}
function editEnergyEntry(id){editEntryById('energies',id,'logEnergy');}
function delTemp(id){delEntryById('temperatures',id);}
function editTempEntry(id){editEntryById('temperatures',id,'logTemp');}
function delWeight(id){delEntryById('weights',id);}
function editWeightEntry(id){editEntryById('weights',id,'logWeight');}
function delThought(id){delEntryById('thoughts',id);}
function editThoughtEntry(id){editEntryById('thoughts',id,'logThought');}
function delDischarge(id){delEntryById('discharge',id);}
function editDischargeEntry(id){editEntryById('discharge',id,'logDischarge');}

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
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0;">'
      +'<button class="btn btn-sm btn-outline btn-icon" onclick="editMedEntry(\''+esc(m.id)+'\')" aria-label="Modifier"><i class="ti ti-pencil" aria-hidden="true"></i></button>'
      +'<button class="btn btn-sm btn-danger btn-icon" onclick="delMed(\''+esc(m.id)+'\')" aria-label="Supprimer"><i class="ti ti-trash" aria-hidden="true"></i></button>'
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

  var html='<div class="profile-card"><div class="profile-avatar">'+esc(init)+'</div>'
    +'<div><div class="profile-name">'+esc((u&&u.name)||'')+'</div>'
    +'<div class="profile-email">'+esc((u&&u.email)||'')+'</div>'
    +'<div class="profile-since">Membre depuis '+fmtShort((u&&u.createdAt)||todayStr())
    +' · '+((u&&u.periods&&u.periods.length)||0)+' cycle(s) enregistré(s)</div>'
    +'</div></div>';

  /* Sync */
  html+='<div id="sync-status" class="sync-status sync-'+(App.state.syncStatus||'ok')+'">'
    +'<div class="sync-dot"></div>'
    +({ok:'Synchronisé avec Supabase',error:'Synchronisation en attente',busy:'Synchronisation en cours...'}[App.state.syncStatus||'ok'])
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

  /* Compte */
  html+='<div class="sec-title">Compte</div>'
    +'<div class="settings-card">'
    +settingsRow('ti-mail','Changer mon email','Modifier votre adresse email de connexion','<button class="btn btn-sm btn-outline" onclick="openChangeEmailModal()">Changer</button>')
    +settingsRow('ti-key','Mot de passe','Modifier votre mot de passe pour plus de sécurité','<button class="btn btn-sm btn-outline" onclick="openChangePasswordModal()">Modifier</button>')
    +settingsRow('ti-logout','Déconnexion','Se déconnecter de votre compte','<button class="btn btn-sm btn-outline" onclick="logout()">Déconnecter</button>')
    +'</div>';

  /* Données */
  html+='<div class="sec-title">Données personnelles</div>'
    +'<div class="settings-card">'
    +settingsRow('ti-download','Exporter mes données (JSON)','Télécharger toutes vos données en JSON','<button class="btn btn-sm btn-outline" onclick="exportData()">Exporter</button>')
    +settingsRow('ti-file-csv','Exporter mes données (CSV)','Télécharger un fichier CSV pour Excel/Sheets','<button class="btn btn-sm btn-outline" onclick="exportCSV()">Exporter CSV</button>')
    +settingsRow('ti-file-text','Rapport santé mensuel','Générer un résumé PDF de votre mois','<button class="btn btn-sm btn-outline" onclick="generateMonthlyReport()">Générer</button>')
    +settingsRow('ti-lock','Confidentialité','Vos données sont chiffrées et stockées sur Supabase. Elles ne sont partagées avec personne.','')
    +'</div>';

  /* Apparence */
  html+='<div class="sec-title">Apparence</div>'
    +'<div class="settings-card">'
    +settingsRow('ti-moon','Mode sombre','Activer le thème sombre pour un meilleur confort visuel la nuit',
      '<label class="switch"><input type="checkbox" id="dark-mode-toggle" '+(u.darkMode?'checked':'')+' onchange="toggleDarkMode(this.checked)"><span class="switch-slider"></span></label>')
    +'</div>';

  /* Historique des retards */
  html+='<div class="sec-title">Historique des retards de règles</div>';
  var delays = getPeriodDelays();
  if (!delays.length) {
    html+='<div class="card card-sm"><div style="font-size:13px;color:var(--text-3);">Aucun retard enregistré. Les retards seront automatiquement enregistrés lorsque vos règles arrivent après la date prévue.</div></div>';
  } else {
    var avgDelay = getAverageDelay();
    html+='<div class="card" style="padding:4px 14px;">';
    if (avgDelay) {
      html+='<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Retard moyen : ' + avgDelay + ' jour' + (avgDelay > 1 ? 's' : '') + '</div>';
    }
    delays.slice(0,6).forEach(function(d){
      html+='<div class="list-item" style="padding:8px 0;">'
        +'<div class="item-icon item-icon-amber" style="width:32px;height:32px;border-radius:8px;font-size:16px;">'
        +'<i class="ti ti-calendar-off" aria-hidden="true"></i></div>'
        +'<div style="flex:1;"><div class="item-label">Retard de ' + d.delay + ' jour' + (d.delay > 1 ? 's' : '') + '</div>'
        +'<div class="item-sub">Prévues le ' + fmtShort(d.expected) + ' · Arrivées le ' + fmtShort(d.actual) + '</div></div>'
        +'</div>';
    });
    html+='</div>';
  }

  /* Statistiques des symptômes */
  html+='<div class="sec-title">Statistiques des symptômes</div>';
  var symptomStats = computeSymptomStats();
  if (!symptomStats.length) {
    html+='<div class="card card-sm"><div style="font-size:13px;color:var(--text-3);">Aucun symptôme enregistré. Les statistiques s\'afficheront après avoir enregistré des symptômes.</div></div>';
  } else {
    html+='<div class="card" style="padding:16px 14px;">';
    html+='<div style="font-size:13px;font-weight:600;margin-bottom:16px;">Symptômes les plus fréquents</div>';
    symptomStats.slice(0,5).forEach(function(stat){
      var percentage = Math.round((stat.count / stat.total) * 100);
      html+='<div style="margin-bottom:16px;">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:6px;">'
        +'<span style="font-size:13px;font-weight:500;">'+stat.symptom+'</span>'
        +'<span style="font-size:13px;color:var(--text-3);">'+stat.count+'x ('+percentage+'%)</span></div>'
        +'<div style="width:100%;background:var(--border);height:10px;border-radius:5px;overflow:hidden;">'
        +'<div style="width:'+percentage+'%;background:var(--primary);height:100%;border-radius:5px;transition:width 0.3s;"></div></div></div>';
    });
    html+='</div>';
  }

  /* Tendances des symptômes par phase */
  html+='<div class="sec-title">Tendances des symptômes par phase</div>';
  var symptomTrends = computeSymptomTrends();
  if (!symptomTrends.length) {
    html+='<div class="card card-sm"><div style="font-size:13px;color:var(--text-3);">Données insuffisantes. Enregistrez plus de symptômes pour voir les tendances.</div></div>';
  } else {
    html+='<div class="card" style="padding:4px 14px;">';
    html+='<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Quand vos symptômes apparaissent-ils ?</div>';
    symptomTrends.slice(0,5).forEach(function(trend){
      var zoneLabels = { period: 'Pendant les règles', safe1: 'Après règles', caution: 'Avant ovulation', danger: 'Période fertile', safe2: 'Avant règles' };
      var zoneColors = { period: '#8b2252', safe1: '#27ae60', caution: '#f39c12', danger: '#e74c3c', safe2: '#9b59b6' };
      html+='<div style="margin-bottom:12px;padding:8px;background:var(--bg-surface);border-radius:8px;">'
        +'<div style="display:flex;justify-content:space-between;margin-bottom:4px;">'
        +'<span style="font-size:13px;font-weight:600;">'+trend.symptom+'</span>'
        +'<span style="font-size:12px;padding:2px 8px;border-radius:4px;background:'+zoneColors[trend.mostFrequentZone]+';color:#fff;">'+zoneLabels[trend.mostFrequentZone]+'</span></div>'
        +'<div style="font-size:12px;color:var(--text-3);">Apparaît '+trend.total+'x, surtout en phase '+zoneLabels[trend.mostFrequentZone].toLowerCase()+'</div></div>';
    });
    html+='</div>';
  }

  /* Graphique d'évolution de la durée des règles */
  html+='<div class="sec-title">Évolution de la durée des règles</div>';
  var periodDurationStats = computePeriodDurationStats();
  if (!periodDurationStats.length) {
    html+='<div class="card card-sm"><div style="font-size:13px;color:var(--text-3);">Données insuffisantes. Enregistrez au moins 2 cycles avec des dates de fin pour voir l\'évolution.</div></div>';
  } else {
    html+='<div class="card" style="padding:16px 14px;">';
    html+='<div style="font-size:13px;font-weight:600;margin-bottom:16px;">Durée des règles par cycle</div>';
    
    var maxDuration = Math.max.apply(null, periodDurationStats.map(function(p){return p.duration;}));
    var chartHeight = 140;
    
    html+='<div style="display:flex;align-items:flex-end;gap:12px;height:'+chartHeight+'px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border);overflow-x:auto;overflow-y:hidden;">';
    periodDurationStats.slice(-6).forEach(function(p){
      var barHeight = Math.max(20, (p.duration / maxDuration) * (chartHeight - 30));
      var barColor = p.duration <= 4 ? '#27ae60' : p.duration <= 6 ? '#f39c12' : '#e74c3c';
      html+='<div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:center;min-width:50px;">'
        +'<div style="width:36px;background:'+barColor+';border-radius:6px 6px 0 0;height:'+barHeight+'px;transition:height 0.3s;box-shadow:0 2px 4px rgba(0,0,0,0.1);"></div>'
        +'<div style="font-size:12px;font-weight:600;color:var(--text-2);margin-top:6px;">'+p.duration+'j</div>'
        +'<div style="font-size:10px;color:var(--text-3);margin-top:2px;">'+fmtShort(p.start)+'</div></div>';
    });
    html+='</div>';
    
    /* Légende des couleurs */
    html+='<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:8px;">'
      +'<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-3);">'
      +'<div style="width:12px;height:12px;background:#27ae60;border-radius:3px;"></div>≤4 jours</div>'
      +'<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-3);">'
      +'<div style="width:12px;height:12px;background:#f39c12;border-radius:3px;"></div>5-6 jours</div>'
      +'<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-3);">'
      +'<div style="width:12px;height:12px;background:#e74c3c;border-radius:3px;"></div>7+ jours</div></div>';
    
    html+='</div>';
  }

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
  /* updateUser sauvegarde en local ET synchronise (plus besoin de le refaire ici) */
  showToast(enabled ? 'Notifications activées.' : 'Notifications désactivées.');
  render();
}
function togglePillReminder(enabled){
  updateUser(function(u){ u.notifPrefs = u.notifPrefs||{}; u.notifPrefs.pillReminder = enabled; return u; });
  /* updateUser sauvegarde en local ET synchronise (plus besoin de le refaire ici) */
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

function toggleDarkMode(enabled){
  updateUser(function(u){ u.darkMode = enabled; return u; });
  if(enabled){
    document.body.classList.add('dark-mode');
  }else{
    document.body.classList.remove('dark-mode');
  }
  showToast(enabled ? 'Mode sombre activé.' : 'Mode clair activé.');
}

function openChangeEmailModal(){
  var modalHtml = renderChangeEmail();
  if(modalHtml){
    var modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
  }
}

function openChangePasswordModal(){
  var modalHtml = renderChangePassword();
  if(modalHtml){
    var modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
  }
}

function exportData(){
  var u=getUser();
  var blob=new Blob([JSON.stringify({exportDate:todayStr(),data:u},null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');
  a.href=url;a.download='cyclecare-export-'+todayStr()+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('Données exportées.');
}

/* Ligne CSV correcte : champs entre guillemets, guillemets doublés.
   (avant : échappement HTML → "&amp;" dans Excel, et une virgule dans une
   note décalait les colonnes) */
function csvCell(v){ v=(v==null?'':String(v)); return '"'+v.replace(/"/g,'""')+'"'; }
function csvRow(cells){ return cells.map(csvCell).join(',')+'\r\n'; }
function exportCSV(){
  var u=getUser();
  if(!u){showToast('Aucune donnée à exporter.','err');return;}
  
  var csv=csvRow(['Date','Type','Détails','Notes']);
  
  /* Exporter les périodes */
  (u.periods||[]).forEach(function(p){
    var details='Début: '+p.start+(p.end?' | Fin: '+p.end:'')+(p.flow?' | Flux: '+p.flow:'');
    csv+=csvRow([p.start, 'Période', details, p.notes||'']);
  });
  
  /* Exporter les rapports */
  (u.rapports||[]).forEach(function(r){
    var details=r.protected?'Protégé':'Non protégé';
    csv+=csvRow([r.date, 'Rapport', details, '']);
  });
  
  /* Exporter les symptômes */
  (u.symptoms||[]).forEach(function(s){
    var details=(s.items||[]).join('; ');
    csv+=csvRow([s.date, 'Symptôme', details, s.notes||'']);
  });
  
  /* Exporter les médicaments */
  (u.medications||[]).forEach(function(m){
    var details=m.name||m.type;
    csv+=csvRow([m.date, 'Médicament', details, m.notes||'']);
  });
  
  /* Exporter l'humeur */
  (u.moods||[]).forEach(function(m){
    var moodInfo=MOOD_OPTIONS.find(function(opt){return opt.val===m.value;})||{};
    var details=moodInfo.lbl+' ('+m.value+'/10)';
    csv+=csvRow([m.date, 'Humeur', details, m.notes||'']);
  });
  
  /* Exporter l'énergie */
  (u.energies||[]).forEach(function(e){
    var energyInfo=ENERGY_OPTIONS.find(function(opt){return opt.val===e.value;})||{};
    var details=energyInfo.lbl+' ('+e.value+'/8)';
    csv+=csvRow([e.date, 'Énergie', details, e.notes||'']);
  });
  
  /* Exporter la température */
  (u.temperatures||[]).forEach(function(t){
    csv+=csvRow([t.date, 'Température', t.value+'°C à '+t.time, t.notes||'']);
  });
  
  /* Exporter le poids */
  (u.weights||[]).forEach(function(w){
    csv+=csvRow([w.date, 'Poids', w.value+' kg', w.notes||'']);
  });
  
  /* Exporter les pensées */
  (u.thoughts||[]).forEach(function(th){
    csv+=csvRow([th.date, 'Pensée', (th.text||'').substring(0,50)+((th.text||'').length>50?'...':''), th.mood||'']);
  });
  
  /* Exporter les pertes */
  (u.discharge||[]).forEach(function(d){
    var typeInfo=DISCHARGE_OPTIONS.find(function(opt){return opt.val===d.type;})||{};
    var amountInfo=DISCHARGE_AMOUNT_OPTIONS.find(function(opt){return opt.val===d.amount;})||{};
    csv+=csvRow([d.date, 'Pertes', typeInfo.lbl+' - '+amountInfo.lbl, d.notes||'']);
  });
  
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}); /* BOM : accents OK dans Excel */
  var url=URL.createObjectURL(blob);var a=document.createElement('a');
  a.href=url;a.download='cyclecare-export-'+todayStr()+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('Données exportées en CSV.');
}

function computeSymptomStats(){
  var u = getUser();
  if (!u || !u.symptoms || !u.symptoms.length) return [];
  
  var symptomCounts = {};
  var totalEntries = 0;
  
  u.symptoms.forEach(function(s){
    (s.items || []).forEach(function(symptom){
      symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      totalEntries++;
    });
  });
  
  if (totalEntries === 0) return [];
  
  var stats = Object.keys(symptomCounts).map(function(symptom){
    return {
      symptom: symptom,
      count: symptomCounts[symptom],
      total: totalEntries
    };
  });
  
  stats.sort(function(a, b){ return b.count - a.count; });
  return stats;
}

function computePeriodDurationStats(){
  var u = getUser();
  if (!u || !u.periods || !u.periods.length) return [];
  
  var stats = u.periods.filter(function(p){
    return p.end && p.start; /* Need both start and end dates */
  }).map(function(p){
    return {
      start: p.start,
      end: p.end,
      duration: diffDays(p.start, p.end) + 1
    };
  }).filter(function(p){
    return p.duration >= 1 && p.duration <= 15; /* Filter unrealistic values */
  });
  
  stats.sort(function(a, b){ return a.start.localeCompare(b.start); });
  return stats;
}

function computeSymptomTrends() {
  var u = getUser();
  if (!u || !u.symptoms || !u.symptoms.length || !u.periods || !u.periods.length) return [];
  
  var lp = getLastPeriod();
  if (!lp) return [];
  
  var cl = getCycleLen();
  var trends = {};
  
  u.symptoms.forEach(function(s) {
    if (!s.date || !s.items) return;
    var cycleDay = getCycleDay(s.date, lp.start, cl);
    if (cycleDay === null) return;

    // Utiliser la zone historique cohérente pour chaque symptôme
    var zone = u && u.periods && u.periods.length ? getZoneForDate(s.date, u.periods, cl) : (lp?getZone(s.date,lp.start,cl,getEstimatedPeriodDur()):null);
    if (!zone) return;
    
    (s.items || []).forEach(function(symptom) {
      if (!trends[symptom]) {
        trends[symptom] = { period: 0, safe1: 0, caution: 0, danger: 0, safe2: 0, total: 0 };
      }
      trends[symptom][zone]++;
      trends[symptom].total++;
    });
  });
  
  var trendArray = Object.keys(trends).map(function(symptom) {
    var t = trends[symptom];
    var maxZone = Object.keys(t).reduce(function(max, zone) {
      if (zone === 'total') return max;
      return t[zone] > t[max] ? zone : max;
    }, 'period');
    
    return {
      symptom: symptom,
      mostFrequentZone: maxZone,
      counts: t,
      total: t.total
    };
  });
  
  trendArray.sort(function(a, b) { return b.total - a.total; });
  return trendArray;
}

function generateMonthlyReport() {
  var u = getUser();
  if (!u) { showToast('Aucune donnée disponible.','err'); return; }

  var today = todayStr();
  var currentMonth = today.substring(0, 7);
  var lp = getLastPeriod();
  var cl = getCycleLen();

  // Générer un rapport HTML formaté pour meilleure présentation
  var htmlReport = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">';
  htmlReport += '<title>Rapport de Santé Mensuel - CycleCare</title>';
  htmlReport += '<style>';
  htmlReport += 'body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }';
  htmlReport += '.header { text-align: center; border-bottom: 3px solid #8b2252; padding-bottom: 20px; margin-bottom: 30px; }';
  htmlReport += '.header h1 { color: #8b2252; margin: 0; }';
  htmlReport += '.header p { color: #666; margin: 5px 0; }';
  htmlReport += '.section { margin-bottom: 30px; }';
  htmlReport += '.section h2 { color: #8b2252; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }';
  htmlReport += '.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }';
  htmlReport += '.info-item { background: #f9f9f9; padding: 10px; border-radius: 5px; }';
  htmlReport += '.info-item strong { color: #8b2252; }';
  htmlReport += '.data-list { list-style: none; padding: 0; }';
  htmlReport += '.data-list li { padding: 10px; border-bottom: 1px solid #eee; }';
  htmlReport += '.data-list li:last-child { border-bottom: none; }';
  htmlReport += '.date { font-weight: bold; color: #8b2252; }';
  htmlReport += '.no-data { color: #999; font-style: italic; }';
  htmlReport += '.footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }';
  htmlReport += '@media print { body { font-size: 12pt; } .header { page-break-after: avoid; } .section { page-break-inside: avoid; } }';
  htmlReport += '</style></head><body>';
  
  // Header
  htmlReport += '<div class="header">';
  htmlReport += '<h1>🌸 Rapport de Santé Mensuel</h1>';
  htmlReport += '<p><strong>CycleCare</strong> - Suivi du cycle menstruel</p>';
  htmlReport += '<p>Généré le ' + fmtDate(today) + '</p>';
  htmlReport += '</div>';
  
  // Informations générales
  htmlReport += '<div class="section">';
  htmlReport += '<h2>Informations du cycle</h2>';
  htmlReport += '<div class="info-grid">';
  htmlReport += '<div class="info-item"><strong>Utilisatrice :</strong> ' + esc(u.name || 'N/A') + '</div>';
  htmlReport += '<div class="info-item"><strong>Cycle :</strong> ' + cl + ' jours</div>';
  htmlReport += '<div class="info-item"><strong>Durée des règles :</strong> ' + u.periodDur + ' jours</div>';
  htmlReport += '<div class="info-item"><strong>Mois :</strong> ' + currentMonth + '</div>';
  htmlReport += '</div></div>';
  
  // Règles du mois
  htmlReport += '<div class="section">';
  htmlReport += '<h2>📅 Règles du mois</h2>';
  var periodsThisMonth = (u.periods || []).filter(function(p) { return p.start && p.start.startsWith(currentMonth); });
  if (periodsThisMonth.length) {
    htmlReport += '<ul class="data-list">';
    periodsThisMonth.forEach(function(p) {
      htmlReport += '<li><span class="date">' + fmtDate(p.start) + '</span>';
      if (p.end) htmlReport += ' → ' + fmtDate(p.end) + ' (' + (diffDays(p.start, p.end) + 1) + ' jours)';
      if (p.flow) htmlReport += '<br><em>Flux : ' + esc(p.flow) + '</em>';
      if (p.notes) htmlReport += '<br><em>Notes : ' + esc(p.notes) + '</em>';
      htmlReport += '</li>';
    });
    htmlReport += '</ul>';
  } else {
    htmlReport += '<p class="no-data">Aucune période enregistrée ce mois.</p>';
  }
  htmlReport += '</div>';
  
  // Symptômes
  htmlReport += '<div class="section">';
  htmlReport += '<h2>😰 Symptômes</h2>';
  var symptomsThisMonth = (u.symptoms || []).filter(function(s) { return s.date && s.date.startsWith(currentMonth); });
  if (symptomsThisMonth.length) {
    htmlReport += '<ul class="data-list">';
    symptomsThisMonth.forEach(function(s) {
      htmlReport += '<li><span class="date">' + fmtDate(s.date) + '</span> : ' + esc((s.items || []).join(', '));
      if (s.notes) htmlReport += '<br><em>' + esc(s.notes) + '</em>';
      htmlReport += '</li>';
    });
    htmlReport += '</ul>';
  } else {
    htmlReport += '<p class="no-data">Aucun symptôme enregistré ce mois.</p>';
  }
  htmlReport += '</div>';
  
  // Humeur & Énergie
  htmlReport += '<div class="section">';
  htmlReport += '<h2>😊 Humeur & Énergie</h2>';
  var moodsThisMonth = (u.moods || []).filter(function(m) { return m.date && m.date.startsWith(currentMonth); });
  var energiesThisMonth = (u.energies || []).filter(function(e) { return e.date && e.date.startsWith(currentMonth); });
  
  if (moodsThisMonth.length) {
    htmlReport += '<h3>Humeur</h3><ul class="data-list">';
    moodsThisMonth.forEach(function(m) {
      var moodInfo = MOOD_OPTIONS.find(function(opt){return opt.val===m.value;})||{};
      htmlReport += '<li><span class="date">' + fmtDate(m.date) + '</span> : ' + moodInfo.lbl + ' (' + esc(m.value) + '/10)';
      if (m.notes) htmlReport += '<br><em>' + esc(m.notes) + '</em>';
      htmlReport += '</li>';
    });
    htmlReport += '</ul>';
  }
  
  if (energiesThisMonth.length) {
    htmlReport += '<h3>Énergie</h3><ul class="data-list">';
    energiesThisMonth.forEach(function(e) {
      var energyInfo = ENERGY_OPTIONS.find(function(opt){return opt.val===e.value;})||{};
      htmlReport += '<li><span class="date">' + fmtDate(e.date) + '</span> : ' + energyInfo.lbl + ' (' + esc(e.value) + '/8)';
      if (e.notes) htmlReport += '<br><em>' + esc(e.notes) + '</em>';
      htmlReport += '</li>';
    });
    htmlReport += '</ul>';
  }
  
  if (!moodsThisMonth.length && !energiesThisMonth.length) {
    htmlReport += '<p class="no-data">Aucune donnée d\'humeur/énergie ce mois.</p>';
  }
  htmlReport += '</div>';
  
  // Température & Poids
  htmlReport += '<div class="section">';
  htmlReport += '<h2>🌡️ Température & Poids</h2>';
  var tempsThisMonth = (u.temperatures || []).filter(function(t) { return t.date && t.date.startsWith(currentMonth); });
  var weightsThisMonth = (u.weights || []).filter(function(w) { return w.date && w.date.startsWith(currentMonth); });
  
  if (tempsThisMonth.length) {
    htmlReport += '<h3>Température basale</h3><ul class="data-list">';
    tempsThisMonth.forEach(function(t) {
      htmlReport += '<li><span class="date">' + fmtDate(t.date) + '</span> (' + esc(t.time) + ') : ' + esc(t.value) + '°C';
      if (t.notes) htmlReport += '<br><em>' + esc(t.notes) + '</em>';
      htmlReport += '</li>';
    });
    htmlReport += '</ul>';
  }
  
  if (weightsThisMonth.length) {
    htmlReport += '<h3>Poids</h3><ul class="data-list">';
    weightsThisMonth.forEach(function(w) {
      htmlReport += '<li><span class="date">' + fmtDate(w.date) + '</span> : ' + esc(w.value) + ' kg';
      if (w.notes) htmlReport += '<br><em>' + esc(w.notes) + '</em>';
      htmlReport += '</li>';
    });
    htmlReport += '</ul>';
  }
  
  if (!tempsThisMonth.length && !weightsThisMonth.length) {
    htmlReport += '<p class="no-data">Aucune donnée de température/poids ce mois.</p>';
  }
  htmlReport += '</div>';
  
  // Activité sexuelle
  htmlReport += '<div class="section">';
  htmlReport += '<h2>❤️ Activité sexuelle</h2>';
  var rapportsThisMonth = (u.rapports || []).filter(function(r) { return r.date && r.date.startsWith(currentMonth); });
  if (rapportsThisMonth.length) {
    htmlReport += '<ul class="data-list">';
    rapportsThisMonth.forEach(function(r) {
      htmlReport += '<li><span class="date">' + fmtDate(r.date) + '</span> : ' + (r.protected ? 'Protégé ✓' : 'Non protégé ⚠️') + '</li>';
    });
    htmlReport += '</ul>';
  } else {
    htmlReport += '<p class="no-data">Aucun rapport enregistré ce mois.</p>';
  }
  htmlReport += '</div>';
  
  // Footer
  htmlReport += '<div class="footer">';
  htmlReport += '<p><strong>CycleCare</strong> - Application de suivi du cycle menstruel</p>';
  htmlReport += '<p>Ce rapport a été généré automatiquement.</p>';
  htmlReport += '<p>Partagez-le avec votre professionnel de santé si nécessaire.</p>';
  htmlReport += '<p style="font-size: 12px; color: #999;">' + todayStr() + '</p>';
  htmlReport += '</div>';
  
  htmlReport += '</body></html>';
  
  // Créer le fichier HTML et proposer le téléchargement
  var blob = new Blob([htmlReport], { type: 'text/html;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'cyclecare-rapport-' + currentMonth + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Sur Android, proposer d'ouvrir le fichier depuis les téléchargements
  if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.FilePicker) {
    showToast('Rapport généré ! Il se trouve dans vos téléchargements.');
  } else {
    showToast('Rapport mensuel généré ! Ouvrez le fichier HTML dans votre navigateur pour l\'imprimer en PDF.');
  }

  // Optionnel : proposer d'imprimer directement
  setTimeout(function() {
    if (confirm('Voulez-vous imprimer ce rapport maintenant en PDF ?')) {
      printHtml(htmlReport);
    }
  }, 500);
}

/* Impression via un iframe caché : fonctionne aussi sous Electron,
   où window.open('') est bloqué (la fenêtre valait null → plantage). */
function printHtml(html){
  var old=document.getElementById('print-frame'); if(old) old.remove();
  var f=document.createElement('iframe');
  f.id='print-frame';
  f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(f);
  var d=f.contentWindow.document; d.open(); d.write(html); d.close();
  setTimeout(function(){
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch(e){ showToast('Impression impossible sur cet appareil. Ouvrez le fichier téléchargé.','err'); }
  },300);
}

function doDeleteAccount(){
  /* Suppression RÉELLE côté serveur, pendant que la session est encore active :
     l'edge function "delete-account" (clé service role) efface user_data,
     bot_usage et le compte d'authentification. On ne se déconnecte qu'après. */
  var uid=App.data.uid;
  showToast('Suppression en cours…');
  db.functions.invoke('delete-account',{ body:{ confirm:true } }).then(function(res){
    if(res.error) throw res.error;
    delete App.data.users[uid]; App.data.uid=null; saveLocal(App.data);
    document.body.classList.remove('dark-mode');
    if (typeof Notif !== 'undefined' && Notif.cancelAll) Notif.cancelAll().catch(function(){});
    return Promise.resolve(db.auth.signOut()).catch(function(){});
  }).then(function(){
    App.state.screen='auth'; closeModal(); render();
    showToast('Votre compte et toutes vos données ont été supprimés.');
  }).catch(function(err){
    console.warn('Suppression du compte :', err);
    showToast('Suppression impossible pour le moment. Vérifiez votre connexion et réessayez.','err');
  });
}

