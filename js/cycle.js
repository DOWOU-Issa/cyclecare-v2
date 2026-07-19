/* =============================================
   js/cycle.js — Moteur de calcul du cycle
   Basé sur le tableau REGLE_CALENDRIER fourni
   =============================================
   Zones définies par décalage depuis le début des règles :
     offset 0–4   → period   (J1–J5)
     offset 5–8   → safe1    (J6–J9)
     offset 9–10  → caution  (J10–J11)
     offset 11–16 → danger   (J12–J17)
     offset 17+   → safe2    (J18–fin cycle)
   ============================================= */

function getZone(dateStr, lastStart, cycleLen) {
  cycleLen = cycleLen || 28;
  if (!lastStart) return null;
  var offset   = diffDays(lastStart, dateStr);
  var cycleDay = ((offset % cycleLen) + cycleLen) % cycleLen;
  if (cycleDay < 5)  return 'period';
  if (cycleDay < 9)  return 'safe1';
  if (cycleDay < 11) return 'caution';
  if (cycleDay < 17) return 'danger';
  return 'safe2';
}

function getCycleDay(dateStr, lastStart, cycleLen) {
  cycleLen = cycleLen || 28;
  if (!lastStart) return null;
  var offset = diffDays(lastStart, dateStr);
  return ((offset % cycleLen) + cycleLen) % cycleLen + 1;
}

function getNextPeriodDate(lastStart, cycleLen) {
  if (!lastStart) return null;
  return addDays(lastStart, cycleLen || 28);
}

function getDaysUntilPeriod(lastStart, cycleLen) {
  var next = getNextPeriodDate(lastStart, cycleLen);
  if (!next) return null;
  return diffDays(todayStr(), next);
}

/* Durée des règles réellement observée (moyenne des cycles où une date de fin
   a été renseignée). Permet de colorer le calendrier de façon plus fidèle que
   le simple réglage global, et de s'adapter si les règles durent 3, 4 ou 6
   jours plutôt que les 5 jours par défaut. */
function getEstimatedPeriodDur() {
  var u = getUser(); if (!u) return 5;
  var durs = (u.periods || [])
    .filter(function(p) { return p.end; })
    .map(function(p) { return diffDays(p.start, p.end) + 1; })
    .filter(function(d) { return d >= 1 && d <= 12; });
  if (durs.length >= 2) {
    var avg = durs.reduce(function(a, b) { return a + b; }, 0) / durs.length;
    return Math.max(2, Math.round(avg));
  }
  return getPeriodDur();
}

/* Évaluation du risque de grossesse */
function calcRisk() {
  var u  = getUser();  if (!u) return null;
  var lp = getLastPeriod(); if (!lp) return null;
  var today    = todayStr();
  var cl       = getCycleLen();
  var nextP    = getNextPeriodDate(lp.start, cl);
  var daysLate = nextP ? diffDays(nextP, today) : 0;

  var unprotected = (u.rapports || []).filter(function(r) {
    var ago = diffDays(r.date, today);
    return !r.protected && ago >= 0 && ago <= 30;
  });
  if (!unprotected.length) return { level:'none', events:[], daysLate:daysLate };

  var events = unprotected.map(function(r) {
    var zone   = getZone(r.date, lp.start, cl);
    var hasMed = (u.medications || []).some(function(m) {
      var d = diffDays(r.date, m.date);
      return d >= 0 && d <= 5 && (m.type === 'norLevo' || m.type === 'ellaOne');
    });
    return { date:r.date, zone:zone, hasMed:hasMed };
  });

  var inDanger    = events.filter(function(e){ return e.zone==='danger'; });
  var unmitigated = inDanger.filter(function(e){ return !e.hasMed; });
  var mitigated   = inDanger.filter(function(e){ return e.hasMed; });

  if (unmitigated.length && daysLate > 5) return { level:'tres_eleve', events:unmitigated, daysLate:daysLate };
  if (unmitigated.length)                 return { level:'eleve',       events:unmitigated, daysLate:daysLate };
  if (mitigated.length)                   return { level:'modere',      events:mitigated,   daysLate:daysLate };
  return { level:'faible', events:[], daysLate:daysLate };
}

function shouldRecommendTest() {
  var lp = getLastPeriod(); if (!lp) return false;
  var cl = getCycleLen();
  return diffDays(getNextPeriodDate(lp.start, cl), todayStr()) >= 7;
}

function getPredictedNextPeriod() {
  var lp = getLastPeriod(); if (!lp) return null;
  var u  = getUser();
  var cl = getCycleLen();
  var base = addDays(lp.start, cl);
  var best = null;
  (u.medications || []).forEach(function(m) {
    if (diffDays(m.date, todayStr()) < 0 || diffDays(m.date, todayStr()) > 30) return;
    var info = MEDS_DATA[m.type];
    if (!info || !info.delayDays) return;
    if (!best || info.delayDays > MEDS_DATA[best.type].delayDays) best = m;
  });
  if (best) return { date: addDays(base, MEDS_DATA[best.type].delayDays), hasDelay:true, medName: MEDS_DATA[best.type].name };
  return { date:base, hasDelay:false };
}

/* =============================================
   FIABILITÉ DES PRÉDICTIONS
   =============================================
   Calcule la régularité du cycle à partir de l'historique des dates de
   début de règles (écart-type entre cycles consécutifs). Plus l'écart-type
   est faible, plus les prédictions de prochaines règles sont fiables.
   ============================================= */
function computeCycleReliability() {
  var u = getUser();
  if (!u || !u.periods || u.periods.length < 2) {
    return {
      level: 'low', cycleCount: u && u.periods ? u.periods.length : 0,
      avgLen: null, stdDev: null,
      label: 'Données insuffisantes',
      desc: 'Enregistrez au moins 2 cycles pour que les prévisions s\'affinent.'
    };
  }
  var sorted = u.periods.slice().sort(function(a, b) { return a.start < b.start ? -1 : 1; });
  var lens = [];
  for (var i = 1; i < sorted.length; i++) {
    var len = diffDays(sorted[i-1].start, sorted[i].start);
    if (len >= 15 && len <= 60) lens.push(len); /* filtre les valeurs aberrantes */
  }
  if (!lens.length) {
    return {
      level: 'low', cycleCount: sorted.length, avgLen: null, stdDev: null,
      label: 'Données insuffisantes',
      desc: 'Enregistrez vos prochaines règles pour calculer la régularité de votre cycle.'
    };
  }
  var avg = lens.reduce(function(a, b) { return a + b; }, 0) / lens.length;
  var variance = lens.reduce(function(a, b) { return a + Math.pow(b - avg, 2); }, 0) / lens.length;
  var stdDev = Math.sqrt(variance);

  var level, label, desc;
  if (lens.length < 3) {
    level = 'low'; label = 'Estimation initiale';
    desc = lens.length + ' cycle(s) enregistré(s). Les prévisions s\'affineront avec plus de données.';
  } else if (stdDev <= 2) {
    level = 'high'; label = 'Cycle régulier';
    desc = 'Vos cycles varient de moins de 2 jours en moyenne — prévisions fiables.';
  } else if (stdDev <= 5) {
    level = 'medium'; label = 'Cycle assez régulier';
    desc = 'Variation moyenne de ' + stdDev.toFixed(1) + ' jours entre vos cycles.';
  } else {
    level = 'low'; label = 'Cycle irrégulier';
    desc = 'Vos cycles varient de plus de 5 jours — les prévisions sont moins précises. Si cette irrégularité vous inquiète, parlez-en à un professionnel de santé.';
  }
  return { level: level, cycleCount: lens.length, avgLen: Math.round(avg), stdDev: stdDev, label: label, desc: desc };
}
