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

  if (!App.data || !App.data.uid) {
    view.innerHTML = renderAuth(); mroot.innerHTML = ''; return;
  }

  if (App.state.screen === 'onboarding' || needsOnboarding()) {
    App.state.screen = 'onboarding';
    view.innerHTML = renderOnboarding(); mroot.innerHTML = ''; return;
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
  if (s) { s.classList.add('hidden'); setTimeout(function() { s.style.display = 'none'; }, 300); }
}

/* ---- Initialisation ---- */
async function init() {
  App.data = loadLocal();
  if (typeof Notif !== 'undefined' && Notif.requestStartupPermission) {
    Notif.requestStartupPermission().catch(function() {});
  }
  try {
    var sessionRes = await db.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;

    if (session) {
      pullFromSupabase(session.user.id, function(row) {
        if (row) {
          var u = {
            id: session.user.id, name: row.name, email: session.user.email,
            cycleLen: row.cycle_len || 28, periodDur: row.period_dur || 5,
            avatarColor: row.avatar_color || '#8b2252',
            onboardingDone: true,
            notifPrefs: row.notif_prefs || { enabled:false, pillReminder:false, pillHour:20 },
            periods:     row.periods     || [],
            rapports:    row.rapports    || [],
            symptoms:    row.symptoms    || [],
            medications: row.medications || [],
            createdAt: row.created_at ? row.created_at.split('T')[0] : todayStr()
          };
          App.data.uid = session.user.id;
          App.data.users[session.user.id] = u;
          saveLocal(App.data);
          App.state.syncStatus = 'ok';
        }
        App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
        hideSplash(); render();
        /* Vérifier les rappels "web" au démarrage */
        Notif.checkPendingReminders();
      });
    } else if (App.data.uid) {
      App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
      App.state.syncStatus = 'error';
      hideSplash(); render();
      Notif.checkPendingReminders();
    } else {
      hideSplash(); render();
    }
  } catch(e) {
    if (App.data.uid) {
      App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
      App.state.syncStatus = 'error';
    }
    hideSplash(); render();
    Notif.checkPendingReminders();
  }

  db.auth.onAuthStateChange(function(event) {
    if (event === 'SIGNED_OUT') {
      App.data.uid = null; saveLocal(App.data);
      App.state.screen = 'auth'; render();
    }
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && App.state.modal) closeModal();
});
document.addEventListener('DOMContentLoaded', init);
