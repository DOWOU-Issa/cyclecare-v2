/* =============================================
   js/router.js — Navigation
   ============================================= */
var NAV_TABS = [
  { id:'accueil',     lbl:'Accueil',     ico:'ti-home'      },
  { id:'calendrier',  lbl:'Calendrier',  ico:'ti-calendar'  },
  { id:'journal',     lbl:'Journal',     ico:'ti-notebook'  },
  { id:'bot',         lbl:'Assistante',  ico:'ti-sparkles'  },
  { id:'medicaments', lbl:'Médicaments', ico:'ti-pill'      },
  { id:'conseils',    lbl:'Conseils',    ico:'ti-heart'     },
  { id:'parametres',  lbl:'Paramètres',  ico:'ti-settings'  },
];

var PAGE_TITLES = {
  accueil:    'Tableau de bord',
  calendrier: 'Calendrier du cycle',
  journal:    'Mon journal',
  bot:        'Assistante IA',
  medicaments:'Médicaments',
  conseils:   'Conseils santé',
  parametres: 'Paramètres'
};

function go(screen) {
  App.state.screen  = screen;
  App.state.openAcc = null;
  if (screen === 'journal') App.state.journalTab = 'regles';
  render();
  window.scrollTo(0, 0);
}
function setJournalTab(tab) { App.state.journalTab = tab; render(); }

function renderLayout(content) {
  var u      = getUser();
  var name   = (u && u.name) ? u.name : '';
  var init   = name.charAt(0).toUpperCase() || '?';
  var aColor = (u && u.avatarColor) ? u.avatarColor : '#8b2252';
  var hasKey = !!(typeof getGeminiKey !== 'undefined' && getGeminiKey());

  var navItems = NAV_TABS.map(function(t) {
    var active = App.state.screen === t.id ? ' active' : '';
    /* Petit point indicateur si la clé bot n'est pas configurée */
    var dot = (t.id === 'bot' && !hasKey)
      ? '<span class="nav-dot" title="Clé API non configurée"></span>'
      : '';
    return '<div class="nav-tab' + active + '" onclick="go(\'' + t.id + '\')" role="button" tabindex="0">'
      + '<i class="ti ' + t.ico + '" aria-hidden="true"></i>' + t.lbl + dot + '</div>';
  }).join('');

  /* SIDEBAR desktop */
  var sidebar = '<aside class="sidebar" id="sidebar">'
    + '<div class="sidebar-brand">'
    + '<div class="sidebar-brand-icon"><i class="ti ti-heart-filled" aria-hidden="true"></i></div>'
    + '<div><div class="sidebar-brand-name">CycleCare</div>'
    + '<div class="sidebar-brand-tagline">Suivi du cycle</div></div>'
    + '</div>'
    + '<nav class="sidebar-nav">' + navItems + '</nav>'
    + '<div class="sidebar-user" onclick="openModal(\'editProfile\')" style="cursor:pointer;" title="Modifier le profil">'
    + '<div class="sidebar-user-avatar" style="background:' + aColor + ';">' + esc(init) + '</div>'
    + '<div style="flex:1;min-width:0;">'
    + '<div class="sidebar-user-name">' + esc(name) + '</div>'
    + '<div class="sidebar-user-email" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc((u && u.email) || '') + '</div>'
    + '</div>'
    + '<i class="ti ti-pencil" style="font-size:14px;color:var(--text-3);flex-shrink:0;" aria-hidden="true"></i>'
    + '</div></aside>';

  /* TOPBAR mobile */
  var topbar = '<header class="topbar" role="banner">'
    + '<i class="ti ti-heart-filled topbar-icon" aria-hidden="true"></i>'
    + '<div><div class="topbar-title">CycleCare</div>'
    + '<div class="topbar-sub">Bonjour, ' + esc(name) + '</div></div>'
    + '<div style="margin-left:auto;">'
    + '<button class="btn btn-icon" style="background:rgba(255,255,255,0.15);color:#fff;border:none;" onclick="openModal(\'editProfile\')" aria-label="Profil">'
    + '<div style="width:28px;height:28px;border-radius:50%;background:' + aColor + ';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;">' + esc(init) + '</div>'
    + '</button></div>'
    + '</header>'
    + '<nav class="mobile-nav" aria-label="Navigation">' + navItems + '</nav>';

  /* Contenu : la page bot est en flex-column pour que le chat occupe toute la hauteur */
  var isBotPage = App.state.screen === 'bot';
  var pageContent = '<div class="page-content' + (isBotPage ? ' page-content-bot' : '') + '" id="page-content-wrap">'
    + '<h1 class="page-title">' + (PAGE_TITLES[App.state.screen] || '') + '</h1>'
    + content
    + '</div>';

  var contentArea = '<div class="content-area">' + pageContent + '</div>';
  return sidebar + topbar + contentArea;
}

function renderScreen() {
  if (App.state.screen === 'onboarding') return renderOnboarding();
  switch(App.state.screen) {
    case 'accueil':     return renderAccueil();
    case 'calendrier':  return renderCalendrier();
    case 'journal':     return renderJournal();
    case 'bot':         return renderBot();
    case 'medicaments': return renderMedicaments();
    case 'conseils':    return renderConseils();
    case 'parametres':  return renderParametres();
    default:            return renderAccueil();
  }
}
