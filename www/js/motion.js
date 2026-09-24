/* =============================================
   js/motion.js — Animations, gestes et vibrations
   =============================================
   - fermeture animée des fenêtres + glisser vers le bas pour fermer
   - balayage gauche/droite pour changer de mois dans le calendrier
   - compteur « J1 → J5 » de l'accueil
   - vibrations légères sur Android (@capacitor/haptics)
   Tout est désactivé si l'appareil demande « moins d'animations ».
   ============================================= */

var Motion = {
  reduced: function() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  },

  /* ---- Vibrations (Android uniquement, silencieux ailleurs) ---- */
  haptic: function(kind) {
    var H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    if (!H || !(window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
    try {
      if (kind === 'success') H.notification({ type: 'SUCCESS' });
      else if (kind === 'warning') H.notification({ type: 'WARNING' });
      else H.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
    } catch (e) {}
  },

  /* ---- Après chaque affichage ---- */
  afterRender: function() {
    if (this.reduced()) return;
    /* Compteur du jour du cycle : seulement à l'arrivée sur l'accueil */
    var el = document.querySelector('.page-enter .hero-day[data-to], .ring-replay .hero-day[data-to]');
    if (el) {
      var to = parseInt(el.getAttribute('data-to'), 10), from = 1, start = null, dur = Math.min(700, 60 + to * 25);
      if (to > 1) {
        var step = function(ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = 'J' + Math.round(from + (to - from) * eased);
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = 'J1';
        requestAnimationFrame(step);
      }
    }
  }
};

/* ---- Vibration légère sur les éléments tactiles principaux ---- */
document.addEventListener('click', function(e) {
  var t = e.target.closest && e.target.closest('.qa-btn, .bnav-item, .bnav-add, .chip-toggle, .scale-opt, .cal-day, .week-day, .dayfile-btn, .tab-btn');
  if (t) Motion.haptic('light');
}, true);

/* ---- Gestes tactiles ---- */
(function() {
  var sx = 0, sy = 0, box = null, dragging = false, calArea = null, t0 = 0;

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now();
    /* Fenêtre : on ne tire que si son contenu est tout en haut */
    var b = e.target.closest && e.target.closest('.modal-box');
    box = b && b.scrollTop <= 0 && !e.target.closest('input, textarea, select') ? b : null;
    dragging = false;
    calArea = e.target.closest && e.target.closest('.cal-swipe');
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!box) return;
    var dy = e.touches[0].clientY - sy, dx = e.touches[0].clientX - sx;
    if (!dragging && dy > 8 && Math.abs(dy) > Math.abs(dx)) { dragging = true; box.style.transition = 'none'; }
    if (dragging) box.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy, fast = Date.now() - t0 < 300;
    if (box && dragging) {
      box.style.transition = '';
      if (dy > 110 || (fast && dy > 50)) { box.style.transform = 'translateY(100%)'; Motion.haptic('light'); setTimeout(closeModal, 160); }
      else box.style.transform = '';
    }
    /* Calendrier : balayer pour changer de mois */
    if (calArea && !App.state.modal && Math.abs(dx) > 60 && Math.abs(dy) < 45) {
      calNav(dx < 0 ? 1 : -1);
    }
    box = null; dragging = false; calArea = null;
  }, { passive: true });
})();
