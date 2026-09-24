/* =============================================
   js/screens.js — Journal, médicaments et pages secondaires
   ============================================= */
function renderJournal() {
  var html=renderJournalTabsBar();
  /* Recherche : remplace les onglets tant qu'un texte est saisi */
  var q=App.state.journalQuery||'';
  var search='<div class="journal-search"><i class="ti ti-search" aria-hidden="true"></i>'
    +'<input class="inp" type="search" id="journal-q" placeholder="Rechercher (ex. crampes, fatigue, NorLevo…)" value="'+esc(q)+'" oninput="journalSearch(this.value)" aria-label="Rechercher dans le journal"/></div>';
  html=search+'<div id="journal-body">'+(q?renderJournalResults(q):html+renderJournalTab())+'</div>';
  return html;
}
function renderJournalTab(){
  if(App.state.journalTab==='regles')       return renderReglesTab();
  if(App.state.journalTab==='rapports')     return renderRapportsTab();
  if(App.state.journalTab==='symptomes')   return renderSymptomesTab();
  if(App.state.journalTab==='humeur')      return renderMoodTab();
  if(App.state.journalTab==='energie')     return renderEnergyTab();
  if(App.state.journalTab==='temperature') return renderTempTab();
  if(App.state.journalTab==='poids')       return renderWeightTab();
  if(App.state.journalTab==='pensees')     return renderThoughtTab();
  if(App.state.journalTab==='pertes')      return renderDischargeTab();
  return '';
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
    +settingsRow('ti-file-type-pdf','Rapport pour le médecin','PDF : derniers cycles, symptômes, température, médicaments','<button class="btn btn-sm btn-outline" onclick="generateDoctorReport()">Générer</button>')
    +renderSavePrefRow()
    +settingsRow('ti-help-circle','Présentation de l\'application','Revoir les 3 écrans d\'explication du premier lancement','<button class="btn btn-sm btn-outline" onclick="startTour()">Revoir</button>')
    +settingsRow('ti-chart-bar','Statistiques','Graphiques de vos cycles, règles, température et symptômes','<button class="btn btn-sm btn-outline" onclick="go(\'stats\')">Voir</button>')
    +settingsRow('ti-lock','Confidentialité','Vos données sont chiffrées et stockées sur Supabase. Elles ne sont partagées avec personne.','')
    +'</div>';

  /* Apparence */
  html+='<div class="sec-title">Apparence</div>'
    +'<div class="settings-card">'
    +settingsRow('ti-moon','Mode sombre','Activer le thème sombre pour un meilleur confort visuel la nuit',
      '<label class="switch"><input type="checkbox" id="dark-mode-toggle" '+(u.darkMode?'checked':'')+' onchange="toggleDarkMode(this.checked)"><span class="switch-slider"></span></label>')
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
  FileSaver.save('cyclecare-export-'+todayStr()+'.json', blob, 'application/json', 'Export CycleCare');
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
  FileSaver.save('cyclecare-export-'+todayStr()+'.csv', blob, 'text/csv', 'Export CycleCare');
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


/* ---- Recherche dans le journal ---- */
function journalSearch(v){
  App.state.journalQuery=v;
  var body=document.getElementById('journal-body');
  if(!body){ render(); return; }
  /* On ne redessine que les résultats : le champ garde le focus pendant la frappe */
  body.innerHTML = v.trim() ? renderJournalResults(v) : renderJournalTabsBar()+renderJournalTab();
}
function renderJournalTabsBar(){
  var tabs=[{id:'regles',lbl:'Règles',ico:'ti-droplet-filled'},{id:'rapports',lbl:'Rapports',ico:'ti-heart'},{id:'symptomes',lbl:'Symptômes',ico:'ti-mood-sad'},{id:'humeur',lbl:'Humeur',ico:'ti-mood-happy'},{id:'energie',lbl:'Énergie',ico:'ti-battery-charging'},{id:'temperature',lbl:'Température',ico:'ti-thermometer'},{id:'poids',lbl:'Poids',ico:'ti-scale'},{id:'pensees',lbl:'Pensées',ico:'ti-notebook'},{id:'pertes',lbl:'Pertes',ico:'ti-droplet'}];
  return '<div class="tab-row">'+tabs.map(function(t){
    return '<button class="tab-btn'+(App.state.journalTab===t.id?' active':'')+'" onclick="setJournalTab(\''+t.id+'\')"><i class="ti '+t.ico+'" aria-hidden="true"></i>'+t.lbl+'</button>';
  }).join('')+'</div>';
}
/* Toutes les entrées sous une forme commune (date, icône, texte, action) */
function allJournalEntries(){
  var u=getUser(); if(!u) return [];
  var out=[];
  var find=function(arr,v){ return (arr.find(function(x){return x.val===v;})||{}).lbl; };
  (u.periods||[]).forEach(function(p){ out.push({date:p.start,ico:'ti-droplet-filled',type:'Règles',txt:'Début des règles'+(p.end?' (jusqu\'au '+fmtShort(p.end)+')':'')+(p.flow?' · flux '+flowTxt(p.flow):'')+(p.notes?' · '+p.notes:''),on:"editPeriodEntry('"+p.start+"')"}); });
  (u.rapports||[]).forEach(function(r){ out.push({date:r.date,ico:'ti-heart',type:'Rapport',txt:r.protected?'Rapport protégé':'Rapport non protégé',on:"editRapportEntry('"+r.id+"')"}); });
  (u.symptoms||[]).forEach(function(x){ out.push({date:x.date,ico:'ti-mood-sad',type:'Symptômes',txt:(x.items||[]).join(', ')+(x.notes?' · '+x.notes:''),on:"editSymptomEntry('"+x.id+"')"}); });
  (u.moods||[]).forEach(function(m){ out.push({date:m.date,ico:'ti-mood-happy',type:'Humeur',txt:(find(MOOD_OPTIONS,m.value)||m.value)+(m.notes?' · '+m.notes:''),on:"editMoodEntry('"+m.id+"')"}); });
  (u.energies||[]).forEach(function(e){ out.push({date:e.date,ico:'ti-battery-charging',type:'Énergie',txt:(find(ENERGY_OPTIONS,e.value)||e.value)+(e.notes?' · '+e.notes:''),on:"editEnergyEntry('"+e.id+"')"}); });
  (u.temperatures||[]).forEach(function(t){ out.push({date:t.date,ico:'ti-thermometer',type:'Température',txt:t.value+' °C'+(t.notes?' · '+t.notes:''),on:"editTempEntry('"+t.id+"')"}); });
  (u.weights||[]).forEach(function(w){ out.push({date:w.date,ico:'ti-scale',type:'Poids',txt:w.value+' kg'+(w.notes?' · '+w.notes:''),on:"editWeightEntry('"+w.id+"')"}); });
  (u.medications||[]).forEach(function(m){ out.push({date:m.date,ico:'ti-pill',type:'Médicament',txt:(m.name||(MEDS_DATA[m.type]||{}).name||m.type)+(m.notes?' · '+m.notes:''),on:"editMedEntry('"+m.id+"')"}); });
  (u.thoughts||[]).forEach(function(t){ out.push({date:t.date,ico:'ti-notebook',type:'Pensée',txt:t.text||'',on:"editThoughtEntry('"+t.id+"')"}); });
  (u.discharge||[]).forEach(function(d){ out.push({date:d.date,ico:'ti-droplet',type:'Pertes',txt:(find(DISCHARGE_OPTIONS,d.type)||d.type)+(d.notes?' · '+d.notes:''),on:"editDischargeEntry('"+d.id+"')"}); });
  return out.sort(function(a,b){ return a.date<b.date?1:a.date>b.date?-1:0; });
}
function normTxt(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function renderJournalResults(q){
  var words=normTxt(q).split(/\s+/).filter(Boolean);
  var res=allJournalEntries().filter(function(e){
    var hay=normTxt(e.type+' '+e.txt+' '+fmtDate(e.date));
    return words.every(function(w){ return hay.indexOf(w)!==-1; });
  });
  if(!res.length) return '<div class="card">'+empty('Aucun résultat pour « '+esc(q)+' ».')+'</div>';
  return '<div class="sec-title">'+res.length+' résultat'+(res.length>1?'s':'')+'</div><div class="card" style="padding:2px 12px;">'
    +res.slice(0,100).map(function(e){
      return '<button class="plus-row" onclick="'+e.on+'"><div class="item-icon item-icon-pink" style="width:32px;height:32px;font-size:16px;"><i class="ti '+e.ico+'" aria-hidden="true"></i></div>'
        +'<div style="flex:1;min-width:0;text-align:left;"><div class="item-label">'+esc(e.txt)+'</div><div class="item-sub">'+e.type+' · '+fmtDate(e.date)+'</div></div>'
        +'<i class="ti ti-pencil" style="color:var(--text-3);" aria-hidden="true"></i></button>';
    }).join('')+'</div>';
}
