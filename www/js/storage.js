/* =============================================
   js/storage.js — Stockage offline-first
   LocalStorage (immédiat) + Supabase (sync)
   ============================================= */

var STORE_KEY = 'cyclecare_v2';
var App = { state: null, data: null };

function loadLocal() {
  var d;
  try { d = JSON.parse(localStorage.getItem(STORE_KEY)) || { uid: null, users: {} }; }
  catch(e) { d = { uid: null, users: {} }; }
  d.users = d.users || {};
  Object.keys(d.users).forEach(function(k) { ensureIds(d.users[k]); }); /* migration : ids manquants */
  return d;
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
    /* sans fin, ou fin seulement estimée (onboarding) → l'utilisatrice peut indiquer la vraie fin */
    return (!p.end || p.endEstimated) && p.start <= today && diffDays(p.start, today) <= 10;
  });
  if (!candidates.length) return null;
  candidates.sort(function(a, b) { return a.start < b.start ? 1 : -1; });
  return candidates[0];
}

function getCycleLen()  { var u = getUser(); return (u && u.cycleLen)  || 28; }
function getPeriodDur() { var u = getUser(); return (u && u.periodDur) || 5; }

/* =============================================
   IDENTIFIANTS UNIQUES DES ENTRÉES
   =============================================
   Chaque entrée (règles, rapport, symptôme, médicament…) reçoit un `id`.
   Avant, les entrées étaient retrouvées par leur date : avec deux entrées
   le même jour, on modifiait/supprimait la mauvaise.
   Les anciennes entrées sans id reçoivent un id DÉTERMINISTE (hash de leur
   contenu) pour que la même entrée ait le même id sur tous les appareils. */
var ENTRY_LISTS = ['periods','rapports','symptoms','medications','moods','energies',
                   'temperatures','weights','thoughts','discharge'];

function newId() {
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch(e) {}
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
function hashId(obj) {
  var str = JSON.stringify(obj), h = 5381;
  for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return 'h' + (h >>> 0).toString(36);
}
function ensureIds(u) {
  if (!u) return u;
  ENTRY_LISTS.forEach(function(k) {
    var seen = {};
    (u[k] || []).forEach(function(e) {
      if (!e || typeof e !== 'object') return;
      if (!e.id) e.id = hashId(e);
      if (seen[e.id]) e.id = newId(); /* doublon strict → id distinct */
      seen[e.id] = true;
    });
  });
  return u;
}
function collectIds(u) {
  var ids = {};
  ENTRY_LISTS.forEach(function(k) { (u && u[k] || []).forEach(function(e) { if (e && e.id) ids[e.id] = true; }); });
  return ids;
}

/* ---- Modification des données ----
   Marque l'utilisatrice comme "à synchroniser" (_dirty) : tant que le
   serveur n'a pas confirmé, les données locales ne seront jamais écrasées
   par celles du serveur au démarrage. */
function updateUser(fn) {
  var before = App.data.users[App.data.uid];
  var beforeIds = collectIds(before);
  var u = ensureIds(fn(JSON.parse(JSON.stringify(before))));
  /* Mémoriser les suppressions pour la fusion hors ligne */
  var afterIds = collectIds(u);
  u._deletedIds = (u._deletedIds || []).concat(Object.keys(beforeIds).filter(function(id) { return !afterIds[id]; }));
  u._dirty = true;
  u._localVersion = (u._localVersion || 0) + 1;
  App.data.users[App.data.uid] = u;
  saveLocal(App.data);
  syncToSupabase();
  /* Replanifie les rappels locaux si le cycle/les règles ont changé */
  if (typeof Notif !== 'undefined' && Notif.rescheduleAll) {
    Notif.rescheduleAll().catch(function() {});
  }
}

/* ---- Conversion ligne Supabase <-> objet utilisatrice ----
   UNE seule fonction pour tout le code (avant, auth.js oubliait la moitié
   des champs → humeurs, pensées, températures… effacées à la reconnexion). */
function rowToUser(row, authUser, local) {
  var uid = row.user_id || (authUser && authUser.id);
  var u = {
    id: uid,
    name: row.name || '',
    email: row.email || (authUser && authUser.email) || '',
    cycleLen: row.cycle_len || 28,
    periodDur: row.period_dur || 5,
    avatarColor: /^#[0-9a-fA-F]{3,8}$/.test(row.avatar_color || '') ? row.avatar_color : '#8b2252', /* injecté dans du CSS → format vérifié */
    onboardingDone: local ? (local.onboardingDone || (row.periods || []).length > 0) : true,
    darkMode: !!row.dark_mode,
    notifPrefs: row.notif_prefs || { enabled: false, pillReminder: false, pillHour: 20, lastFiredDate: null },
    periods:      row.periods       || [],
    rapports:     row.rapports      || [],
    symptoms:     row.symptoms      || [],
    medications:  row.medications   || [],
    moods:        row.moods         || [],
    energies:     row.energies      || [],
    temperatures: row.temperatures  || [],
    weights:      row.weights       || [],
    thoughts:     row.thoughts      || [],
    discharge:    row.discharge     || [],
    periodDelays: row.period_delays || [],
    createdAt: row.created_at ? String(row.created_at).split('T')[0] : todayStr(),
    _dirty: false,
    _serverUpdatedAt: row.updated_at || null
  };
  return ensureIds(u);
}

function userToRow(uid, u) {
  return {
    user_id: uid, name: u.name || '', email: u.email || null,
    avatar_color: u.avatarColor || '#8b2252',
    cycle_len: u.cycleLen || 28, period_dur: u.periodDur || 5,
    periods: u.periods || [], rapports: u.rapports || [],
    symptoms: u.symptoms || [], medications: u.medications || [],
    moods: u.moods || [], energies: u.energies || [],
    temperatures: u.temperatures || [], weights: u.weights || [],
    thoughts: u.thoughts || [], discharge: u.discharge || [],
    period_delays: u.periodDelays || [],
    dark_mode: !!u.darkMode,
    notif_prefs: u.notifPrefs || { enabled: false, pillReminder: false, pillHour: 20, lastFiredDate: null }
  };
}

/* Fusion quand des modifications locales n'ont pas encore été envoyées
   ET que le serveur a changé entre-temps (autre appareil) :
   - listes : union par id (la version locale gagne), sans ressusciter
     les entrées supprimées localement ;
   - réglages : la version locale gagne. */
function mergeUsers(local, server) {
  var m = JSON.parse(JSON.stringify(local));
  var deleted = {};
  (local._deletedIds || []).forEach(function(id) { deleted[id] = true; });
  ENTRY_LISTS.concat(['periodDelays']).forEach(function(k) {
    var byId = {}, out = [];
    (local[k] || []).forEach(function(e) { if (e && e.id) byId[e.id] = true; out.push(e); });
    (server[k] || []).forEach(function(e) {
      var id = e && e.id;
      if (k === 'periodDelays') { id = e.expected + '|' + e.actual; if (out.some(function(x){ return x.expected + '|' + x.actual === id; })) return; out.push(e); return; }
      if (!id || byId[id] || deleted[id]) return;
      out.push(e);
    });
    m[k] = out;
  });
  /* Pas de doublon de règles avec la même date de début */
  var starts = {};
  m.periods = m.periods.filter(function(p) { if (starts[p.start]) return false; starts[p.start] = true; return true; });
  m.periods.sort(function(a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  m._dirty = true;
  m._serverUpdatedAt = server._serverUpdatedAt;
  return m;
}

/* ---- Sync Supabase ----
   Retourne toujours une Promise (résout true si réussi, false sinon).
   En cas d'échec : statut "error" visible + nouvel essai automatique. */
var _syncInFlight = null, _syncAgain = false, _syncRetryTimer = null;

function setSyncStatus(s) { App.state.syncStatus = s; renderSyncStatus(); }

function scheduleSyncRetry() {
  if (_syncRetryTimer) return;
  _syncRetryTimer = setTimeout(function() {
    _syncRetryTimer = null;
    var u = getUser();
    if (u && u._dirty && navigator.onLine !== false) syncToSupabase();
    else if (u && u._dirty) scheduleSyncRetry();
  }, 30000);
}

function syncToSupabase() {
  var uid = App.data && App.data.uid;
  if (!uid || typeof db === 'undefined' || !db) return Promise.resolve(false);
  if (_syncInFlight) { _syncAgain = true; return _syncInFlight; }
  var u = App.data.users[uid];
  if (!u) return Promise.resolve(false);
  var sentVersion = u._localVersion || 0;
  setSyncStatus('busy');

  _syncInFlight = Promise.resolve(
    db.from('user_data').upsert(userToRow(uid, u), { onConflict: 'user_id' }).select('updated_at').single()
  ).then(function(res) {
    if (res && res.error) throw res.error;
    var cur = App.data.users[uid];
    if (cur) {
      cur._serverUpdatedAt = res && res.data ? res.data.updated_at : cur._serverUpdatedAt;
      /* Si rien n'a changé pendant l'envoi, tout est à jour */
      if ((cur._localVersion || 0) === sentVersion) { cur._dirty = false; cur._deletedIds = []; }
      saveLocal(App.data);
    }
    setSyncStatus(cur && cur._dirty ? 'busy' : 'ok');
    return true;
  }).catch(function(err) {
    console.warn('Sync Supabase échouée :', err);
    setSyncStatus('error');
    scheduleSyncRetry();
    return false;
  }).then(function(ok) {
    _syncInFlight = null;
    if (_syncAgain) { _syncAgain = false; return syncToSupabase(); }
    return ok;
  });
  return _syncInFlight;
}

/* ---- Chargement depuis Supabase à la connexion / au démarrage ----
   Utilisé par init() (main.js) ET onSignedIn() (auth.js). Ne remplace
   JAMAIS des modifications locales non envoyées. */
function hydrateUserFromServer(authUser) {
  return new Promise(function(resolve) {
    pullFromSupabase(authUser.id, function(row, err) {
      var uid = authUser.id;
      var local = App.data.users[uid] || null;
      var u;
      if (row) {
        var server = rowToUser(row, authUser, local);
        if (local && local._dirty) {
          /* Le serveur a-t-il changé depuis notre dernier envoi ? */
          var serverChanged = !local._serverUpdatedAt || local._serverUpdatedAt !== server._serverUpdatedAt;
          u = serverChanged ? mergeUsers(ensureIds(local), server) : local;
        } else {
          u = server;
          if (local) u.onboardingDone = local.onboardingDone !== false || server.onboardingDone;
        }
      } else if (err && err.code !== 'PGRST116') {
        /* Erreur réseau : on garde les données locales telles quelles */
        u = local || newUser(pendingSignupName(authUser.email), authUser.email, uid);
        if (!local) u._dirty = true;
      } else {
        /* Pas encore de ligne sur le serveur → on la crée à partir du local */
        u = local || newUser(pendingSignupName(authUser.email), authUser.email, uid);
        u._dirty = true;
      }
      App.data.uid = uid;
      App.data.users[uid] = ensureIds(u);
      saveLocal(App.data);
      if (u._dirty) syncToSupabase(); else setSyncStatus('ok');
      resolve(u);
    });
  });
}

/* Prénom saisi à l'inscription quand la confirmation par email est requise
   (pas encore de session → on le garde en attendant la 1re connexion). */
function pendingSignupName(email) {
  var key = 'cyclecare_pending_name_' + String(email || '').toLowerCase();
  var n = null;
  try { n = localStorage.getItem(key); localStorage.removeItem(key); } catch(e) {}
  return n || String(email || '').split('@')[0];
}

/* ---- Mode hors ligne ---- */
var OfflineManager = {
  isOnline: true,
  offlineSince: null,

  init: function() {
    var self = this;
    this.isOnline = navigator.onLine;
    window.addEventListener('online',  function() { self.onOnline(); });
    window.addEventListener('offline', function() { self.onOffline(); });
    this.updateIndicator();
  },

  onOnline: function() {
    var wasOffline = !!this.offlineSince;
    this.isOnline = true;
    this.offlineSince = null;
    this.updateIndicator();
    if (wasOffline) showToast('Connexion rétablie !', 'ok');
    /* Envoyer les modifications faites hors ligne */
    var u = getUser();
    if (u && u._dirty) syncToSupabase();
  },

  onOffline: function() {
    this.isOnline = false;
    this.offlineSince = new Date();
    this.updateIndicator();
    showToast('Mode hors ligne - Données sauvegardées localement', 'warn');
  },

  updateIndicator: function() {
    var indicator = document.getElementById('offline-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.className = 'offline-indicator hidden';
      document.body.appendChild(indicator);
    }
    if (this.isOnline) {
      indicator.className = 'offline-indicator hidden';
    } else {
      indicator.className = 'offline-indicator visible';
      indicator.innerHTML = '<i class="ti ti-wifi-off"></i> Hors ligne';
    }
  }
};

/* ---- Sauvegarde automatique ---- */
var AutoSave = {
  interval: null,
  
  init: function() {
    var self = this;
    // Sauvegarde toutes les 5 minutes
    this.interval = setInterval(function() {
      self.save();
    }, 5 * 60 * 1000);
  },
  
  save: function() {
    if (App.data && App.data.uid) {
      saveLocal(App.data);
      console.log('Sauvegarde automatique effectuée à', new Date().toLocaleTimeString());
    }
  },
  
  stop: function() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};

/* ---- Système de draft pour formulaires ---- */
var DraftManager = {
  storageKey: 'cyclecare_drafts',
  
  saveDraft: function(formId, data) {
    try {
      var drafts = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      drafts[formId] = {
        data: data,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(drafts));
      console.log('Draft sauvegardé pour', formId);
    } catch(e) {
      console.log('Erreur lors de la sauvegarde du draft:', e);
    }
  },
  
  loadDraft: function(formId) {
    try {
      var drafts = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      var draft = drafts[formId];
      if (draft) {
        // Vérifier si le draft n'est pas trop vieux (max 7 jours)
        var draftDate = new Date(draft.timestamp);
        var now = new Date();
        var daysDiff = (now - draftDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 7) {
          this.deleteDraft(formId);
          return null;
        }
        
        return draft.data;
      }
    } catch(e) {
      console.log('Erreur lors du chargement du draft:', e);
    }
    return null;
  },
  
  deleteDraft: function(formId) {
    try {
      var drafts = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      delete drafts[formId];
      localStorage.setItem(this.storageKey, JSON.stringify(drafts));
    } catch(e) {
      console.log('Erreur lors de la suppression du draft:', e);
    }
  },
  
  hasDraft: function(formId) {
    var draft = this.loadDraft(formId);
    return draft !== null;
  },
  
  clearOldDrafts: function() {
    try {
      var drafts = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      var now = new Date();
      var formIds = Object.keys(drafts);
      
      formIds.forEach(function(formId) {
        var draftDate = new Date(drafts[formId].timestamp);
        var daysDiff = (now - draftDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 7) {
          delete drafts[formId];
        }
      });
      
      localStorage.setItem(this.storageKey, JSON.stringify(drafts));
    } catch(e) {
      console.log('Erreur lors du nettoyage des drafts:', e);
    }
  }
};

function pullFromSupabase(supabaseUid, callback) {
  if (typeof db === 'undefined' || !db) { callback(null, { code: 'NO_DB' }); return; }
  db.from('user_data').select('*').eq('user_id', supabaseUid).maybeSingle()
    .then(function(res) {
      /* maybeSingle : pas de ligne → data null SANS erreur (code PGRST116 simulé) */
      if (!res.error && !res.data) { callback(null, { code: 'PGRST116' }); return; }
      callback(res.data || null, res.error);
    })
    .catch(function(err) { callback(null, err || { code: 'NETWORK' }); });
}

function renderSyncStatus() {
  var el = document.getElementById('sync-status'); if (!el) return;
  var s = App.state.syncStatus;
  var labels = { ok: 'Synchronisé', error: 'Non synchronisé — nouvel essai bientôt', busy: 'Synchronisation...' };
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
  return (str == null ? '' : String(str)).replace(/[&<>"']/g, function(c) {
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
    darkMode: false, /* Préférence de thème */
    notifPrefs: { enabled: false, pillReminder: false, pillHour: 20, lastFiredDate: null },
    periods: [],
    rapports: [],
    symptoms: [],
    medications: [],
    moods: [], /* Suivi de l'humeur */
    energies: [], /* Suivi de l'énergie */
    temperatures: [], /* Suivi de la température basale */
    weights: [], /* Suivi du poids */
    thoughts: [], /* Journal de pensées */
    discharge: [], /* Suivi des pertes vaginales */
    periodDelays: [], /* Historique des retards de règles */
    createdAt: todayStr()
  };
}
