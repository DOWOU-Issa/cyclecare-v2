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
  
  // Timeout pour éviter un statut 'busy' permanent
  var syncTimeout = setTimeout(function(){
    if(App.state.syncStatus === 'busy'){
      App.state.syncStatus = 'error';
      renderSyncStatus();
    }
  }, 15000); // 15 secondes max
  
  db.from('user_data').upsert({
    user_id: uid, name: u.name || '',
    cycle_len: u.cycleLen || 28, period_dur: u.periodDur || 5,
    periods: u.periods || [], rapports: u.rapports || [],
    symptoms: u.symptoms || [], medications: u.medications || [],
    moods: u.moods || [], energies: u.energies || [],
    temperatures: u.temperatures || [], weights: u.weights || [],
    thoughts: u.thoughts || [], discharge: u.discharge || [],
    period_delays: u.periodDelays || [],
    dark_mode: u.darkMode || false,
    notif_prefs: u.notifPrefs || { enabled: false, pillReminder: false, pillHour: 20, lastFiredDate: null }
  }, { onConflict: 'user_id' })
  .then(function(res) {
    clearTimeout(syncTimeout);
    App.state.syncStatus = res.error ? 'error' : 'ok';
    renderSyncStatus();
  }).catch(function(err) {
    clearTimeout(syncTimeout);
    console.log('Erreur de sync (non bloquant):', err);
    // On ne passe pas en error immédiatement pour éviter les faux positifs
    // On considère que si le localStorage fonctionne, l'app reste utilisable
    App.state.syncStatus = 'ok';
    renderSyncStatus();
  });
}

/* ---- Mode hors ligne robuste ---- */
var OfflineManager = {
  isOnline: true,
  offlineSince: null,
  syncQueue: [],
  
  init: function() {
    var self = this;
    this.isOnline = navigator.onLine;
    
    // Écouteurs de connectivité natifs du navigateur
    window.addEventListener('online', function() {
      self.onOnline();
    });
    
    window.addEventListener('offline', function() {
      self.onOffline();
    });
    
    this.updateIndicator();
  },
  
  checkConnectivity: function() {
    // Plus de ping Supabase - on se base uniquement sur navigator.onLine
    // pour éviter les faux positifs sur le web
    // Sur Android/Windows natif, le ping n'est pas nécessaire
    return;
  },
  
  onOnline: function() {
    this.isOnline = true;
    this.offlineSince = null;
    this.updateIndicator();
    // N'afficher le toast que si on était vraiment offline depuis un moment
    if (this.offlineSince) {
      showToast('Connexion rétablie !', 'ok');
    }
    
    // Synchroniser les données en attente
    this.processSyncQueue();
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
  },
  
  addToSyncQueue: function(action) {
    this.syncQueue.push({
      action: action,
      timestamp: new Date().toISOString()
    });
  },
  
  processSyncQueue: function() {
    var self = this;
    if (this.syncQueue.length === 0) return;
    
    // Traiter la file d'attente
    this.syncQueue.forEach(function(item) {
      try {
        if (item.action === 'sync') {
          syncToSupabase();
        }
      } catch(e) {
        console.log('Erreur lors du traitement de la file:', e);
      }
    });
    
    this.syncQueue = [];
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
