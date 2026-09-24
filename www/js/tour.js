/* =============================================
   js/tour.js — Présentation au premier lancement
   =============================================
   3 écrans affichés une seule fois par compte (mémorisé sur l'appareil).
   Peut être relancée depuis Paramètres › « Revoir la présentation ».
   ============================================= */

function tourKey() { return 'cyclecare_tour_done_' + (App.data && App.data.uid || ''); }
function tourDone() { try { return localStorage.getItem(tourKey()) === '1'; } catch (e) { return true; } }
function markTourDone() { try { localStorage.setItem(tourKey(), '1'); } catch (e) {} }

function maybeShowTour() {
  if (!App.data || !App.data.uid || App.state.modal || tourDone()) return;
  if (App.state.screen !== 'accueil') return;
  startTour();
}
function startTour() { App.state.tourStep = 0; openModal('tour'); }
function tourNext() {
  if ((App.state.tourStep || 0) >= TOUR_SLIDES.length - 1) return tourEnd();
  App.state.tourStep = (App.state.tourStep || 0) + 1; render();
}
function tourPrev() { App.state.tourStep = Math.max(0, (App.state.tourStep || 0) - 1); render(); }
function tourEnd() { markTourDone(); closeModal(); }

var TOUR_SLIDES = [
  {
    title: 'Votre cycle en un coup d\'œil',
    art: function() {
      var z = [];
      for (var i = 0; i < 28; i++) z.push(i < 5 ? 'period' : i < 9 ? 'safe1' : i < 11 ? 'caution' : i < 17 ? 'danger' : 'safe2');
      return '<div class="tour-ring">' + chartCycleRing(z, 12, 120) + '<div class="hero-ring-center"><div class="hero-day">J13</div></div></div>';
    },
    text: 'L\'anneau de l\'accueil représente votre cycle, jour par jour. Chaque couleur indique une phase :',
    extra: '<div class="tour-legend">'
      + '<span class="zone-chip zc-period"><i class="ti ti-droplet-filled" aria-hidden="true"></i>Règles</span>'
      + '<span class="zone-chip zc-safe"><i class="ti ti-leaf" aria-hidden="true"></i>Favorable</span>'
      + '<span class="zone-chip zc-caution"><i class="ti ti-alert-triangle" aria-hidden="true"></i>Attention</span>'
      + '<span class="zone-chip zc-danger"><i class="ti ti-alert-circle" aria-hidden="true"></i>Risque de grossesse</span>'
      + '</div>'
  },
  {
    title: 'Tout noter en un geste',
    art: function() {
      return '<div class="tour-plus"><span class="bnav-add" aria-hidden="true"><i class="ti ti-plus"></i></span></div>';
    },
    text: 'Le bouton <strong>+</strong> permet d\'ajouter vos règles, symptômes, humeur, température… '
      + 'La fiche <strong>« Ma journée »</strong> regroupe l\'essentiel sur un seul écran.',
    extra: '<div class="tour-tip"><i class="ti ti-hand-finger" aria-hidden="true"></i> Dans le calendrier, touchez un jour pour voir ce qui a été noté ou ajouter une saisie à cette date.</div>'
  },
  {
    title: 'Un calendrier qui s\'adapte à vous',
    art: function() {
      return '<div class="tour-plus"><span class="btn btn-primary" style="pointer-events:none;"><i class="ti ti-flag-2" aria-hidden="true"></i> Terminer mes règles</span></div>';
    },
    text: 'Quand vos règles s\'arrêtent, touchez <strong>« Terminer mes règles »</strong> : le calendrier s\'ajuste '
      + 'à leur durée réelle, et les prévisions s\'affinent à chaque cycle.',
    extra: '<div class="tour-tip"><i class="ti ti-chart-bar" aria-hidden="true"></i> Retrouvez vos graphiques dans <strong>Statistiques</strong>, et un rapport PDF à montrer à votre médecin.</div>'
  }
];

function mTour() {
  var i = App.state.tourStep || 0, s = TOUR_SLIDES[i], last = i === TOUR_SLIDES.length - 1;
  var dots = TOUR_SLIDES.map(function(_, k) { return '<span class="tour-dot' + (k === i ? ' on' : '') + '"></span>'; }).join('');
  return '<div class="tour">'
    + '<div class="tour-art">' + s.art() + '</div>'
    + '<div class="tour-title">' + s.title + '</div>'
    + '<div class="tour-text">' + s.text + '</div>'
    + (s.extra || '')
    + '<div class="tour-dots" aria-label="Étape ' + (i + 1) + ' sur ' + TOUR_SLIDES.length + '">' + dots + '</div>'
    + '<div class="modal-footer">'
    + (i === 0 ? '<button class="btn btn-outline" style="flex:1;" onclick="tourEnd()">Passer</button>'
               : '<button class="btn btn-outline" style="flex:1;" onclick="tourPrev()">Retour</button>')
    + '<button class="btn btn-primary" style="flex:1;" onclick="tourNext()">' + (last ? 'C\'est parti !' : 'Suivant') + '</button>'
    + '</div></div>';
}
