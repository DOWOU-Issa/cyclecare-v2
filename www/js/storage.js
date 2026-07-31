/* =============================================
   js/storage.js — Stockage offline-first 
   LocalStorage (immédiat) + Supabase (sync)
   ============================================= */

var STORE_KEY   = 'cyclecare_v2';
var PENDING_KEY = 'cyclecare_pending_sync';
var App = { state: null, data: null };

/* ---- Lecture / écriture locale ---- */
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { uid: null, users: {} }; }
  catch(e) { return { uid: null, users: {} }; }
}
function saveLocal(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch(e) {}
}

/* ---- Accesseurs ---- */
function getUser() { return App.data.uid ? App.data.users[App.data.uid] : null; }

/* Dernière période : tri chronologique par date de début */
function getLastPeriod() {
  var u = getUser();
  if (!u || !u.periods || !u.periods.length) return null;
  var sorted = u.periods.slice().sort(function(a, b) {
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
  });
  return sorted[sorted.length - 1];
}

/* Période active (≤10 jours, sans date de fin) */
function getActivePeriod() {
  var u = getUser(); if (!u) return null;
  var today = todayStr();
  var candidates = (u.periods || []).filter(function(p) {
    return !p.end && p.start <= today && diffDays(p.start, today) <= 10;
  });
  if (!candidates.length) return null;
  candidates.sort(function(a, b) { return a.start < b.start ? 1 : -1; });
  return candidates[0];
}

function getCycleLen()  { var u = getUser(); return (u && u.cycleLen)  || 28; }
function getPeriodDur() { var u = getUser(); return (u && u.periodDur) || 5; }

/* ---- Mise à jour utilisateur ---- */
function updateUser(fn) {
  var u = App.data.users[App.data.uid];
  var updated = fn(JSON.parse(JSON.stringify(u)));
  updated.updatedAt = nowIso();
  App.data.users[App.data.uid] = updated;
  saveLocal(App.data);

  /* Sync en arrière-plan */
  pushToSupabase().catch(function() { enqueuePendingSync(); });

  /* Replanifie les rappels si cycle modifié */
  if (typeof Notif !== 'undefined' && Notif.rescheduleAll) {
    Notif.rescheduleAll().catch(function(){});
  }
}

/* ---- Sync Supabase ---- */
async function pushToSupabase() {
  var uid = App.data.uid;
  if (!uid || !db) throw new Error('no_session');
  var u = App.data.users[uid];
  if (!u) throw new Error('no_user');

  setSyncStatus('busy');
  var res = await db.from('user_data').upsert({
    user_id: uid,
    name: u.name || '',
    cycle_len: u.cycleLen || 28,
    period_dur: u.periodDur || 5,
    periods: u.periods || [],
    rapports: u.rapports || [],
    symptoms: u.symptoms || [],
    medications: u.medications || [],
    notif_prefs: u.notifPrefs || { enabled:false, pillReminder:false, pillHour:20, lastFiredDate:null },
    updated_at: u.updatedAt || nowIso()
  }, { onConflict: 'user_id' });

  if (res.error) { setSyncStatus('error'); throw res.error; }
  setSyncStatus('ok');
  clearPendingSync();
}

function pullFromSupabase(supabaseUid, callback) {
  if (!db) { callback(null); return; }
  db.from('user_data').select('*').eq('user_id', supabaseUid).single()
    .then(function(res) {
      if (res.data) mergeRemoteData(supabaseUid, res.data);
      callback(res.data || null, res.error);
    })
    .catch(function(e) { callback(null, e); });
}

/* ---- Fusion locale/distante ---- */
function mergeRemoteData(uid, remoteRow) {
  var localUser = App.data.users[uid];
  if (!localUser) {
    App.data.users[uid] = {
      id: remoteRow.user_id,
      name: remoteRow.name || '',
      email: remoteRow.email || '',
      cycleLen: remoteRow.cycle_len || 28,
      periodDur: remoteRow.period_dur || 5,
      periods: remoteRow.periods || [],
      rapports: remoteRow.rapports || [],
      symptoms: remoteRow.symptoms || [],
      medications: remoteRow.medications || [],
      notifPrefs: remoteRow.notif_prefs || { enabled:false, pillReminder:false, pillHour:20, lastFiredDate:null },
      updatedAt: remoteRow.updated_at || nowIso(),
      createdAt: remoteRow.created_at || todayStr()
    };
    saveLocal(App.data);
    return;
  }

  var localUpdated = new Date(localUser.updatedAt || 0);
  var remoteUpdated = new Date(remoteRow.updated_at || 0);

  if (remoteUpdated > localUpdated) {
    App.data.users[uid] = {
      ...localUser,
      ...{
        name: remoteRow.name || localUser.name,
        cycleLen: remoteRow.cycle_len || localUser.cycleLen,
        periodDur: remoteRow.period_dur || localUser.periodDur,
        periods: remoteRow.periods || localUser.periods,
        rapports: remoteRow.rapports || localUser.rapports,
        symptoms: remoteRow.symptoms || localUser.symptoms,
        medications: remoteRow.medications || localUser.medications,
        notifPrefs: remoteRow.notif_prefs || localUser.notifPrefs,
        updatedAt: remoteRow.updated_at || localUser.updatedAt,
        createdAt: remoteRow.created_at || localUser.createdAt
      }
    };
  } else {
    enqueuePendingSync();
  }

  saveLocal(App.data);
}

/* ---- File d’attente offline ---- */
function enqueuePendingSync() {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ uid: App.data.uid, ts: Date.now() }));
  } catch(e) {}
  setSyncStatus('error');
}
function clearPendingSync() { try { localStorage.removeItem(PENDING_KEY); } catch(e) {} }
function hasPendingSync() {
  try { return !!localStorage.getItem(PENDING_KEY); }
  catch(e) { return false; }
}
function setupOnlineListener() {
  window.addEventListener('online', function() {
    if (!App.data || !App.data.uid) return;
    if (!hasPendingSync()) return;
    setSyncStatus('busy');
    pushToSupabase()
      .then(function(){ showToast('Données synchronisées.'); setSyncStatus('ok'); })
      .catch(function(){ setSyncStatus('error'); });
  });
  window.addEventListener('offline', function() {
    if (App.data && App.data.uid) setSyncStatus('error');
  });
}

/* ---- Statut sync ---- */
function setSyncStatus(s) {
  if (App.state) App.state.syncStatus = s;
  renderSyncStatus();
}
function renderSyncStatus() {
  var el = document.getElementById('sync-status'); if (!el) return;
  var s = App.state ? App.state.syncStatus : 'ok';
  var labels = { ok:'Synchronisé', error:'Hors ligne — données locales', busy:'Synchronisation...' };
  el.className = 'sync-status sync-' + s;
  el.innerHTML = '<div class="sync-dot"></div>' + (labels[s] || s);
}

/* ---- Utilitaires date ---- */
function pad2(n) { return String(n).padStart(2,'0'); }
function toLocalDateStr(d) { return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function parseDateStr(s) { var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function todayStr() { return toLocalDateStr(new Date()); }
function addDays(s,n){ var d=parseDateStr(s); d.setDate(d.getDate()+n); return toLocalDateStr(d); }
function diffDays(a,b){ return Math.round((parseDateStr(b)-parseDateStr(a))/86400000); }
function fmtDate(s){ if(!s)return''; try{return parseDateStr(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});}catch(e){return s;} }
function fmtShort(s){ if(!s)return''; try{return parseDateStr(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});}catch(e){return s;} }
function esc(str){ return String(str||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);}); }
function nowIso(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes())+':'+pad2(d.getSeconds()); }

/* ---- Création nouvel utilisateur ---- */
function newUser(name,email,supabaseUid){
  return {
    id: supabaseUid,
    name: (name||'').trim(),
    email: (email||'').trim().toLowerCase(),
    cycleLen: 28,
    periodDur: 5,
    avatarColor: '#8b2252',
    onboardingDone: false,
    notifPrefs: { enabled:false, pillReminder:false, pillHour:20, lastFiredDate:null },
    periods: [], rapports: [], symptoms: [], medications: [],
    updatedAt: nowIso(),
    createdAt: todayStr()
  };
}
