/* =============================================
   js/main.js — Initialisation (corrigé)
   ============================================= */

App.state = {
  screen:         'auth',
  authMode:       'login',
  journalTab:     'regles',
  calYear:        new Date().getFullYear(),
  calMonth:       new Date().getMonth(),
  openAcc:        null,
  modal:          null,
  modalPayload:   null,
  syncStatus:     'ok',
  onboardingStep: 1,
};

/* ---- Rendu principal ---- */
function render() {
  var view  = document.getElementById('view');
  var mroot = document.getElementById('modal-root');
  if (!view || !mroot) return;

  if (!App.data || !App.data.uid) {
    view.innerHTML  = renderAuth();
    mroot.innerHTML = '';
    return;
  }

  if (App.state.screen === 'onboarding' || needsOnboarding()) {
    App.state.screen = 'onboarding';
    view.innerHTML  = renderOnboarding();
    mroot.innerHTML = '';
    return;
  }

  view.innerHTML  = renderLayout(renderScreen());
  mroot.innerHTML = App.state.modal ? renderModal() : '';
}

/* ---- Toast ---- */
var _toastTimer = null;
function showToast(msg, type) {
  var el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg;
  el.className   = 'toast show toast-' + (type || 'ok');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = 'toast'; }, 3500);
}

/* ---- Splash ---- */
function hideSplash() {
  var s = document.getElementById('splash');
  if (s) { s.classList.add('hidden'); setTimeout(function(){ s.style.display='none'; }, 300); }
}

/* =============================================
   INITIALISATION
   ============================================= */
async function init() {
  /* Données locales en priorité */
  App.data = loadLocal();

  /* Permissions de notifications au démarrage */
  if (typeof Notif !== 'undefined' && Notif.requestStartupPermission) {
    Notif.requestStartupPermission().catch(function(){});
  }

  /* Écouteurs online/offline */
  setupOnlineListener();

  try {
    var sessionRes = await db.auth.getSession();
    var session    = sessionRes.data && sessionRes.data.session;

    if (session) {
      /* Session valide → sync Supabase */
      pullFromSupabase(session.user.id, function(row, err) {
        if (!App.data.users[session.user.id]) {
          App.data.users[session.user.id] = newUser(
            session.user.email.split('@')[0],
            session.user.email,
            session.user.id
          );
        }
        App.data.uid = session.user.id;

        if (row && !err) {
          /* Fusion intelligente : le plus récent gagne */
          mergeRemoteData(session.user.id, row);
          App.state.syncStatus = 'ok';
        } else {
          App.state.syncStatus = 'error';
          setSyncStatus('error');
          saveLocal(App.data);
        }

        App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
        hideSplash();
        render();
        if (typeof Notif !== 'undefined') Notif.checkPendingReminders();
      });

    } else if (App.data.uid) {
      /* Pas de session mais données locales */
      App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
      App.state.syncStatus = 'error';
      hideSplash(); render();
      if (typeof Notif !== 'undefined') Notif.checkPendingReminders();
    } else {
      /* Aucun compte → écran auth */
      hideSplash(); render();
    }

  } catch(e) {
    /* Pas de réseau → offline */
    if (App.data.uid) {
      App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
      App.state.syncStatus = 'error';
    }
    hideSplash(); render();
    if (typeof Notif !== 'undefined') Notif.checkPendingReminders();
  }

  /* Écouter les changements d'état d'auth Supabase */
  db.auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_OUT') {
      App.data.uid = null;
      saveLocal(App.data);
      App.state.screen = 'auth';
      render();
    }
    if (event === 'TOKEN_REFRESHED' && session) {
      if (hasPendingSync()) {
        pushToSupabase()
          .then(function(){ showToast('Données synchronisées.'); })
          .catch(function(){});
      }
    }
  });
}

/* Fermeture modale au clavier */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && App.state.modal) closeModal();
});

document.addEventListener('DOMContentLoaded', init);
