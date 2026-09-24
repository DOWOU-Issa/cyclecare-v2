/* =============================================
   js/router.js — Navigation
   ============================================= */
var NAV_TABS = [
  { id:'accueil',     lbl:'Accueil',     ico:'ti-home'      },
  { id:'calendrier',  lbl:'Calendrier',  ico:'ti-calendar'  },
  { id:'journal',     lbl:'Journal',     ico:'ti-notebook'  },
  { id:'stats',       lbl:'Statistiques',ico:'ti-chart-bar' },
  { id:'bot',         lbl:'Assistante',  ico:'ti-sparkles'  },
  { id:'medicaments', lbl:'Médicaments', ico:'ti-pill'      },
  { id:'conseils',    lbl:'Conseils',    ico:'ti-heart'     },
  { id:'parametres',  lbl:'Paramètres',  ico:'ti-settings'  },
];

var PAGE_TITLES = {
  accueil:    'Tableau de bord',
  calendrier: 'Calendrier du cycle',
  journal:    'Mon journal',
  stats:      'Statistiques',
  plus:       'Plus',
  bot:        'Assistante IA',
  medicaments:'Médicaments',
  conseils:   'Conseils santé',
  parametres: 'Paramètres'
};

function go(screen) {
  App.state.screen  = screen;
  App.state.openAcc = null;
  if (screen === 'journal') { App.state.journalTab = 'regles'; App.state.journalQuery = ''; }
  render();
  window.scrollTo(0, 0);
}
function setJournalTab(tab) { App.state.journalTab = tab; render(); }

function renderLayout(content) {
  var u      = getUser();
  var name   = (u && u.name) ? u.name : '';
  var init   = name.charAt(0).toUpperCase() || '?';
  var aColor = (u && u.avatarColor) ? u.avatarColor : '#8b2252';
  /* La clé Gemini est côté serveur (edge function) : plus besoin d'indicateur.
     (getGeminiKey n'existait plus → le point "clé non configurée" restait affiché) */
  var hasKey = true;

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
    + '<img src="icon.svg" class="brand-logo" alt="" width="36" height="36">'
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
    ;

  /* BARRE DE NAVIGATION DU BAS (mobile) : 4 onglets + bouton « + » central.
     Remplace les 7 onglets horizontaux qui débordaient de l'écran. */
  var moreScreens = ['plus','stats','bot','medicaments','conseils','parametres'];
  var cur = App.state.screen;
  var bItem = function(id, ico, lbl) {
    var on = id === 'plus' ? moreScreens.indexOf(cur) !== -1 : cur === id;
    return '<button class="bnav-item' + (on ? ' active' : '') + '" onclick="go(\'' + id + '\')"' + (on ? ' aria-current="page"' : '') + '>'
      + '<i class="ti ' + ico + '" aria-hidden="true"></i><span>' + lbl + '</span></button>';
  };
  var bottomNav = '<nav class="bottom-nav" aria-label="Navigation principale">'
    + bItem('accueil', 'ti-home', 'Accueil')
    + bItem('calendrier', 'ti-calendar', 'Calendrier')
    + '<button class="bnav-add' + (App.state.modal === 'quickAdd' ? ' open' : '') + '" onclick="' + (App.state.modal === 'quickAdd' ? 'closeModal()' : 'openModal(\'quickAdd\')') + '" aria-label="' + (App.state.modal === 'quickAdd' ? 'Fermer' : 'Ajouter une saisie') + '"><i class="ti ti-plus" aria-hidden="true"></i></button>'
    + bItem('journal', 'ti-notebook', 'Journal')
    + bItem('plus', 'ti-dots-circle-horizontal', 'Plus')
    + '</nav>';

  /* Contenu : la page bot est en flex-column pour que le chat occupe toute la hauteur */
  var isBotPage = App.state.screen === 'bot';
  var isWide = App.state.screen === 'accueil' || App.state.screen === 'stats';
  /* Animation d'entrée seulement quand on CHANGE d'écran (pas à chaque mise à jour) */
  var entering = App.state._lastScreen !== App.state.screen;
  App.state._lastScreen = App.state.screen;
  var pageContent = '<div class="page-content' + (isBotPage ? ' page-content-bot' : '') + (isWide ? ' page-wide' : '') + (entering ? ' page-enter' : '') + '" id="page-content-wrap">'
    + '<h1 class="page-title">' + (PAGE_TITLES[App.state.screen] || '') + '</h1>'
    + content
    + '</div>';

  var contentArea = '<div class="content-area">' + pageContent + '</div>';
  return sidebar + topbar + contentArea + bottomNav;
}

function renderScreen() {
  if (App.state.screen === 'onboarding') return renderOnboarding();
  switch(App.state.screen) {
    case 'accueil':     return renderAccueil();
    case 'calendrier':  return renderCalendrier();
    case 'journal':     return renderJournal();
    case 'stats':       return renderStats();
    case 'plus':        return renderPlus();
    case 'bot':         return renderBot();
    case 'medicaments': return renderMedicaments();
    case 'conseils':    return renderConseils();
    case 'parametres':  return renderParametres();
    default:            return renderAccueil();
  }
}

/* Écran « Plus » (mobile) : accès aux pages secondaires */
function renderPlus() {
  var items = [
    { id:'stats',       ico:'ti-chart-bar',  lbl:'Statistiques', desc:'Graphiques de vos cycles, règles, température, symptômes' },
    { id:'bot',         ico:'ti-sparkles',   lbl:'Assistante IA', desc:'Posez vos questions sur votre cycle' },
    { id:'medicaments', ico:'ti-pill',       lbl:'Médicaments', desc:'Contraception d\'urgence et prises' },
    { id:'conseils',    ico:'ti-heart',      lbl:'Conseils santé', desc:'Conseils selon chaque phase' },
    { id:'parametres',  ico:'ti-settings',   lbl:'Paramètres', desc:'Cycle, notifications, compte, export' }
  ];
  return '<div class="card" style="padding:4px 14px;">' + items.map(function(it) {
    return '<button class="plus-row" onclick="go(\'' + it.id + '\')">'
      + '<div class="item-icon item-icon-pink"><i class="ti ' + it.ico + '" aria-hidden="true"></i></div>'
      + '<div style="flex:1;min-width:0;text-align:left;"><div class="item-label">' + it.lbl + '</div><div class="item-sub">' + it.desc + '</div></div>'
      + '<i class="ti ti-chevron-right" style="color:var(--text-3);" aria-hidden="true"></i></button>';
  }).join('') + '</div>'
  + '<button class="btn btn-primary btn-full" onclick="generateDoctorReport()"><i class="ti ti-file-type-pdf" aria-hidden="true"></i> Rapport PDF pour le médecin</button>';
}
