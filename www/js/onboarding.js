/* =============================================
   js/onboarding.js — Questionnaire d'accueil
   Affiché lors du premier lancement
   ============================================= */

var ONBOARDING_STEPS = 4;

var AVATAR_COLORS = [
  { val:'#8b2252', lbl:'Rose foncé' },
  { val:'#5b2d8e', lbl:'Violet' },
  { val:'#1a7a6e', lbl:'Turquoise' },
  { val:'#1a4a7a', lbl:'Bleu' },
  { val:'#6b4800', lbl:'Ambre' },
  { val:'#1d500d', lbl:'Vert' },
  { val:'#a03060', lbl:'Framboise' },
  { val:'#3d4a5e', lbl:'Ardoise' },
];

function renderOnboarding() {
  var step = App.state.onboardingStep || 1;
  var u    = getUser();

  return '<div class="onboarding-page">'
    + '<div class="onboarding-card">'
    + renderOnboardingHeader(step)
    + renderOnboardingStep(step, u)
    + '</div></div>';
}

function renderOnboardingHeader(step) {
  var steps = ['Votre cycle', 'Vos règles', 'Dernières règles', 'Votre profil'];
  return '<div class="ob-header">'
    + '<div class="ob-logo"><i class="ti ti-heart-filled" aria-hidden="true"></i></div>'
    + '<div class="ob-title">Bienvenue sur CycleCare</div>'
    + '<div class="ob-subtitle">Quelques questions pour personnaliser votre suivi</div>'
    + '<div class="ob-progress">'
    + steps.map(function(s, i) {
        var cls = i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'pending';
        return '<div class="ob-step ' + cls + '">'
          + (i + 1 < step ? '<i class="ti ti-check" aria-hidden="true"></i>' : (i+1))
          + '</div>';
      }).join('<div class="ob-step-line"></div>')
    + '</div>'
    + '<div class="ob-step-label">' + steps[step - 1] + ' — étape ' + step + ' sur ' + ONBOARDING_STEPS + '</div>'
    + '</div>';
}

function renderOnboardingStep(step, u) {
  var html = '<div class="ob-body">';

  if (step === 1) {
    var cl = (u && u.cycleLen) || 28;
    html += '<div class="ob-question">Quelle est la durée habituelle de votre cycle\u202f?</div>'
      + '<div class="ob-hint">Le cycle commence le premier jour des règles et se termine la veille des règles suivantes. La durée moyenne est de 28 jours, mais 21 à 35 jours est tout à fait normal.</div>'
      + '<div class="ob-slider-wrap">'
      + '<div class="ob-slider-val" id="ob-cl-val">' + cl + ' jours</div>'
      + '<input type="range" id="ob-cycle" min="21" max="45" value="' + cl + '" step="1" class="ob-slider" '
      + 'oninput="document.getElementById(\'ob-cl-val\').textContent=this.value+\' jours\'" />'
      + '<div class="ob-slider-labels"><span>21 j</span><span>28 j</span><span>35 j</span><span>45 j</span></div>'
      + '</div>'
      + obPhasePreview();
  }

  else if (step === 2) {
    var pd = (u && u.periodDur) || 5;
    html += '<div class="ob-question">Combien de jours durent habituellement vos règles\u202f?</div>'
      + '<div class="ob-hint">La durée normale des règles est de 3 à 7 jours. Ce chiffre peut varier d\'un cycle à l\'autre.</div>'
      + '<div class="ob-slider-wrap">'
      + '<div class="ob-slider-val" id="ob-pd-val">' + pd + ' jours</div>'
      + '<input type="range" id="ob-period" min="2" max="8" value="' + pd + '" step="1" class="ob-slider" '
      + 'oninput="document.getElementById(\'ob-pd-val\').textContent=this.value+\' jours\'" />'
      + '<div class="ob-slider-labels"><span>2 j</span><span>5 j</span><span>8 j</span></div>'
      + '</div>';
  }

  else if (step === 3) {
    var lastPeriodVal = '';
    if (u && u.periods && u.periods.length) lastPeriodVal = u.periods[u.periods.length-1].start;
    html += '<div class="ob-question">Quand ont commencé vos dernières règles\u202f?</div>'
      + '<div class="ob-hint">Cette date nous permet de calculer votre cycle actuel et de prédire vos prochaines règles. Si vous ne vous en souvenez pas exactement, donnez une date approximative.</div>'
      + '<div class="form-grp" style="margin-top:16px;">'
      + '<label class="lbl" for="ob-lp">Date de début de vos dernières règles</label>'
      + '<input class="inp" type="date" id="ob-lp" max="' + todayStr() + '" value="' + lastPeriodVal + '" style="font-size:16px;padding:12px;" />'
      + '</div>'
      + '<div class="ob-skip-link" onclick="obNextStep()">Je ne me souviens pas — passer cette étape</div>';
  }

  else if (step === 4) {
    var u2 = getUser();
    var currentColor = (u2 && u2.avatarColor) || '#8b2252';
    var initial = ((u2 && u2.name) || '?').charAt(0).toUpperCase();
    html += '<div class="ob-question">Choisissez la couleur de votre profil</div>'
      + '<div class="ob-hint">Cette couleur personnalisera votre avatar dans l\'application.</div>'
      + '<div style="text-align:center;margin:20px 0;">'
      + '<div class="ob-avatar-preview" id="ob-avatar" style="background:' + currentColor + ';">' + esc(initial) + '</div>'
      + '</div>'
      + '<div class="ob-colors">'
      + AVATAR_COLORS.map(function(c) {
          return '<div class="ob-color-btn' + (c.val === currentColor ? ' selected' : '') + '" '
            + 'style="background:' + c.val + ';" '
            + 'onclick="selectAvatarColor(\'' + c.val + '\')" '
            + 'aria-label="' + c.lbl + '" title="' + c.lbl + '"></div>';
        }).join('')
      + '</div>';
  }

  html += '</div>'; /* ob-body */

  html += '<div class="ob-footer">'
    + (step > 1 ? '<button class="btn btn-ghost" onclick="obPrevStep()"><i class="ti ti-arrow-left" aria-hidden="true"></i> Précédent</button>' : '<div></div>')
    + '<button class="btn btn-primary ob-next" id="ob-next-btn" onclick="obNextStep()">'
    + (step === ONBOARDING_STEPS ? '<i class="ti ti-check" aria-hidden="true"></i> Commencer' : 'Suivant <i class="ti ti-arrow-right" aria-hidden="true"></i>')
    + '</button>'
    + '</div>';

  return html;
}

function obPhasePreview() {
  return '<div class="ob-phase-preview">'
    + '<div style="font-size:12px;color:var(--text-3);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">Aperçu de votre cycle</div>'
    + '<div style="display:flex;gap:3px;align-items:center;">'
    + phaseBar('J1–5', 'Règles', 'var(--z-period-bg)', 'var(--z-period-tx)', 18)
    + phaseBar('J6–9', 'Favorable', 'var(--z-safe-bg)', 'var(--z-safe-tx)', 14)
    + phaseBar('J10–11', 'Attention', 'var(--z-caution-bg)', 'var(--z-caution-tx)', 8)
    + phaseBar('J12–17', 'Risque', 'var(--z-danger-bg)', 'var(--z-danger-tx)', 22)
    + phaseBar('J18–fin', 'Favorable', 'var(--z-safe-bg)', 'var(--z-safe-tx)', 38)
    + '</div></div>';
}

function phaseBar(label, name, bg, color, pct) {
  return '<div style="flex:' + pct + ';background:' + bg + ';border-radius:4px;padding:6px 4px;text-align:center;">'
    + '<div style="font-size:9px;font-weight:700;color:' + color + ';">' + label + '</div>'
    + '</div>';
}

function obNextStep() {
  var step = App.state.onboardingStep || 1;
  var u    = getUser();

  /* Sauvegarder les données de cette étape */
  if (step === 1) {
    var cl = parseInt((document.getElementById('ob-cycle')||{}).value) || 28;
    updateUser(function(u) { u.cycleLen = cl; return u; });
  }
  else if (step === 2) {
    var pd = parseInt((document.getElementById('ob-period')||{}).value) || 5;
    updateUser(function(u) { u.periodDur = pd; return u; });
  }
  else if (step === 3) {
    var lp = (document.getElementById('ob-lp')||{}).value || '';
    if (lp) {
      updateUser(function(u) {
        /* Supprimer l'éventuelle période de l'inscription et la remplacer */
        u.periods = u.periods.filter(function(p){ return p.start !== lp; });
        u.periods.push({ start: lp, end: addDays(lp, (u.periodDur||5)-1), flow: 'normal' });
        return u;
      });
    }
  }
  else if (step === 4) {
    /* Couleur avatar déjà sauvegardée par selectAvatarColor */
    finishOnboarding();
    return;
  }

  if (step < ONBOARDING_STEPS) {
    App.state.onboardingStep = step + 1;
  } else {
    finishOnboarding();
    return;
  }
  render();
}

function obPrevStep() {
  var step = App.state.onboardingStep || 1;
  if (step > 1) { App.state.onboardingStep = step - 1; render(); }
}

function selectAvatarColor(color) {
  updateUser(function(u) { u.avatarColor = color; return u; });
  /* Mettre à jour l'aperçu sans re-rendre la page entière */
  var av = document.getElementById('ob-avatar');
  if (av) av.style.background = color;
  document.querySelectorAll('.ob-color-btn').forEach(function(btn) {
    btn.classList.remove('selected');
    if (btn.style.background === color || btn.style.backgroundColor === color) btn.classList.add('selected');
  });
}

function finishOnboarding() {
  updateUser(function(u) { u.onboardingDone = true; return u; });
  App.state.screen = 'accueil';
  App.state.onboardingStep = 1;
  render();
  showToast('Bienvenue ! Votre tableau de bord est prêt.');
}

function needsOnboarding() {
  var u = getUser();
  return u && !u.onboardingDone;
}
