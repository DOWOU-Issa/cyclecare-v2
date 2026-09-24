/* =============================================
   js/main.js — Initialisation
   ============================================= */
App.state = {
  screen:'auth', authMode:'login', journalTab:'regles',
  calYear:new Date().getFullYear(), calMonth:new Date().getMonth(),
  openAcc:null, modal:null, modalPayload:null, syncStatus:'ok', onboardingStep:1,
};

function render() {
  var view  = document.getElementById('view');
  var mroot = document.getElementById('modal-root');
  if (!view || !mroot) return;

  /* Réinitialisation du mot de passe : prioritaire même si une session existe */
  if (!App.data || !App.data.uid || App.state.recovery) {
    view.innerHTML = renderAuth(); mroot.innerHTML = ''; return;
  }

  if (App.state.screen === 'onboarding' || needsOnboarding()) {
    App.state.screen = 'onboarding';
    view.innerHTML = renderOnboarding(); mroot.innerHTML = ''; return;
  }

  view.innerHTML  = renderLayout(renderScreen());
  mroot.innerHTML = App.state.modal ? renderModal() : '';
  App.state.ringReplay = false;
  if (typeof Motion !== 'undefined') Motion.afterRender();
}

/* ---- Toast ---- */
var _toastTimer = null;
function showToast(msg, type) {
  var el = document.getElementById('toast'); if (!el) return;
  type = type || 'ok';
  /* Confirmation : coche animée + vibration légère (Android) */
  var ico = type === 'ok'
    ? '<svg class="toast-check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>'
    : '';
  el.innerHTML = ico + '<span>' + esc(msg) + '</span>';
  el.className = 'toast toast-' + type;
  void el.offsetWidth; /* relance l'animation d'apparition */
  el.className = 'toast show toast-' + type;
  if (typeof Motion !== 'undefined') Motion.haptic(type === 'ok' ? 'success' : type === 'err' ? 'warning' : 'light');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = 'toast'; }, 3500);
}

/* ---- Splash ---- */
/* Blocs gris animés affichés pendant le premier chargement */
function renderSkeleton() {
  var view = document.getElementById('view'); if (!view) return;
  var b = function(h, w) { return '<div class="sk" style="height:' + h + 'px;' + (w ? 'width:' + w + ';' : '') + '"></div>'; };
  view.innerHTML = '<div class="skeleton-page" aria-busy="true" aria-label="Chargement">'
    + b(28, '45%') + b(170) + b(16, '30%')
    + '<div class="sk-row">' + b(62) + b(62) + b(62) + b(62) + b(62) + b(62) + b(62) + '</div>'
    + b(16, '30%') + b(120) + '</div>';
}

function hideSplash() {
  var s = document.getElementById('splash');
  if (s) { s.classList.add('hidden'); setTimeout(function() { s.style.display = 'none'; }, 300); }
}

/* ---- Initialisation ---- */
async function init() {
  App.data = loadLocal();
  
  // Initialiser le mode hors ligne robuste
  if (typeof OfflineManager !== 'undefined' && OfflineManager.init) {
    OfflineManager.init();
  }
  
  // Initialiser la sauvegarde automatique
  if (typeof AutoSave !== 'undefined' && AutoSave.init) {
    AutoSave.init();
  }
  
  // Nettoyer les vieux drafts au démarrage
  if (typeof DraftManager !== 'undefined' && DraftManager.clearOldDrafts) {
    DraftManager.clearOldDrafts();
  }
  
  if (typeof Notif !== 'undefined' && Notif.requestStartupPermission) {
    Notif.requestStartupPermission().catch(function() {});
  }
  /* Lien "mot de passe oublié" : Supabase renvoie vers l'app avec type=recovery */
  var isRecoveryLink = /type=recovery/.test(window.location.hash || '') || /type=recovery/.test(window.location.search || '');

  db.auth.onAuthStateChange(function(event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      App.state.authMode = 'reset-confirm';
      App.state.recovery = true;
      hideSplash(); render();
      return;
    }
    if (event === 'SIGNED_OUT') {
      App.data.uid = null; saveLocal(App.data);
      App.state.screen = 'auth'; render();
    }
  });

  if (isRecoveryLink) { App.state.authMode = 'reset-confirm'; App.state.recovery = true; }

  try {
    var sessionRes = await db.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;

    if (session) {
      var localU = App.data.users[session.user.id];
      if (localU) {
        /* Données déjà sur l'appareil : affichage IMMÉDIAT, mise à jour en arrière-plan */
        App.data.uid = session.user.id;
        if (localU.darkMode) document.body.classList.add('dark-mode');
        App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
        hideSplash(); render();
      } else {
        /* Premier chargement sur cet appareil : squelette animé pendant la récupération */
        hideSplash(); renderSkeleton();
      }
      /* Même logique que onSignedIn : ne jamais écraser des données locales non envoyées */
      var u = await hydrateUserFromServer(session.user);
      if (u && u.darkMode) document.body.classList.add('dark-mode');
      App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
    } else if (App.data.uid) {
      /* Session expirée mais données locales présentes : mode hors ligne */
      App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
    }
  } catch(e) {
    console.warn('Init :', e);
    if (App.data.uid) App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
  }
  hideSplash(); render();
  if (App.data.uid && typeof Notif !== 'undefined') Notif.checkPendingReminders();
  /* Présentation au premier lancement (une seule fois par compte) */
  setTimeout(function() { if (typeof maybeShowTour === 'function') maybeShowTour(); }, 400);
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && App.state.modal) closeModal();
});
document.addEventListener('DOMContentLoaded', init);
