/* =============================================
   js/storage.js — Stockage offline-first
   LocalStorage (immédiat) + Supabase (sync)
   ============================================= */

var STORE_KEY = 'cyclecare_v2';
var App = { state: null, data: null };

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { uid: null, users: {} }; }
  catch(e) { return { uid: null, users: {} }; }
}
function saveLocal(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch(e) {}
}

function getUser() { return App.data.uid ? App.data.users[App.data.uid] : null; }

/* ---- CORRECTIF : la "dernière période" doit être déterminée par la date de
   début la PLUS RÉCENTE (ordre chronologique), jamais par la position dans le
   tableau (qui dépend de l'ordre d'ajout/modification et pouvait désynchroniser
   le calcul des zones du cycle de la réalité). ---- */
function getLastPeriod() {
  var u = getUser();
  if (!u || !u.periods || !u.periods.length) return null;
  var sorted = u.periods.slice().sort(function(a, b) {
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
  });
  return sorted[sorted.length - 1];
}

/* Période en cours (commencée récemment, sans date de fin renseignée).
   Fenêtre de 10 jours : au-delà, on ne propose plus de "terminer mes règles"
   automatiquement (l'utilisatrice peut toujours éditer manuellement). */
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

function updateUser(fn) {
  var u = App.data.users[App.data.uid];
  App.data.users[App.data.uid] = fn(JSON.parse(JSON.stringify(u)));
  saveLocal(App.data);
  syncToSupabase();
  /* Replanifie les rappels locaux si le cycle/les règles ont changé */
  if (typeof Notif !== 'undefined' && Notif.rescheduleAll) {
    Notif.rescheduleAll().catch(function() {});
  }
}

/* ---- Sync Supabase ---- */
function syncToSupabase() {
  var uid = App.data.uid;
  if (!uid || !db) return;
  var u = App.data.users[uid];
  if (!u) return;
  App.state.syncStatus = 'busy';
  renderSyncStatus();
  db.from('user_data').upsert({
    user_id: uid, name: u.name || '',
    cycle_len: u.cycleLen || 28, period_dur: u.periodDur || 5,
    periods: u.periods || [], rapports: u.rapports || [],
    symptoms: u.symptoms || [], medications: u.medications || [],
    notif_prefs: u.notifPrefs || { enabled: false, pillReminder: false, pillHour: 20, lastFiredDate: null }
  }, { onConflict: 'user_id' })
  .then(function(res) {
    App.state.syncStatus = res.error ? 'error' : 'ok';
    renderSyncStatus();
  }).catch(function() { App.state.syncStatus = 'error'; renderSyncStatus(); });
}

function pullFromSupabase(supabaseUid, callback) {
  if (!db) { callback(null); return; }
  db.from('user_data').select('*').eq('user_id', supabaseUid).single()
    .then(function(res) { callback(res.data || null, res.error); })
    .catch(function() { callback(null); });
}

function renderSyncStatus() {
  var el = document.getElementById('sync-status'); if (!el) return;
  var s = App.state.syncStatus;
  var labels = { ok: 'Synchronisé', error: 'Hors ligne', busy: 'Synchronisation...' };
  el.className = 'sync-status sync-' + s;
  el.innerHTML = '<div class="sync-dot"></div>' + labels[s];
}

/* =============================================
   UTILITAIRES DATE — sans conversion UTC
   =============================================
   CORRECTIF IMPORTANT : l'ancienne implémentation utilisait
   `new Date(s+'T00:00:00').toISOString()`, qui convertit la date en UTC.
   Sur un appareil dont le fuseau horaire local est en avance ou en retard
   sur UTC, cela peut décaler une date d'un jour (bug classique). On utilise
   désormais exclusivement les composants LOCAUX de la date (getFullYear,
   getMonth, getDate), jamais toISOString().
   ============================================= */
function pad2(n) { return String(n).padStart(2, '0'); }

function toLocalDateStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/** Parse une chaîne "YYYY-MM-DD" en objet Date à minuit LOCAL (pas de TZ shift). */
function parseDateStr(s) {
  var parts = s.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function todayStr() { return toLocalDateStr(new Date()); }

function addDays(s, n) {
  var d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

function diffDays(a, b) {
  var da = parseDateStr(a), db = parseDateStr(b);
  return Math.round((db - da) / 86400000);
}

function fmtDate(s) {
  if (!s) return '';
  try { return parseDateStr(s).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }); }
  catch(e) { return s; }
}
function fmtShort(s) {
  if (!s) return '';
  try { return parseDateStr(s).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }); }
  catch(e) { return s; }
}
function esc(str) {
  return String(str || '').replace(/[&<>"']/g, function(c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
  });
}

function newUser(name, email, supabaseUid) {
  return {
    id: supabaseUid,
    name: (name || '').trim(),
    email: (email || '').trim().toLowerCase(),
    cycleLen: 28,
    periodDur: 5,
    avatarColor: '#8b2252',
    onboardingDone: false,
    notifPrefs: { enabled: false, pillReminder: false, pillHour: 20, lastFiredDate: null },
    periods: [],
    rapports: [],
    symptoms: [],
    medications: [],
    createdAt: todayStr()
  };
}
