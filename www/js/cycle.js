/* =============================================
   js/cycle.js — Moteur de calcul du cycle
   =============================================
   L'ovulation a lieu environ 14 jours AVANT les règles suivantes :
   pour un cycle de N jours, elle tombe vers J(N-14)
   (J14 pour 28 jours, J21 pour 35 jours, J7 pour 21 jours).
   Les zones sont donc calculées à partir de la durée du cycle :

     règles   : J1 … fin réelle des règles (5 j par défaut)
     favorable: jusqu'à 4 jours avant l'ovulation
     attention: ovulation -4 et -3 jours
     danger   : ovulation -2 … +3 jours (spermatozoïdes ~5 j, ovule ~1 j)
     favorable: ensuite, jusqu'aux règles suivantes

   Pour un cycle de 28 jours on retrouve exactement le tableau
   d'origine : J1–J5 règles, J6–J9 favorable, J10–J11 attention,
   J12–J17 danger, J18+ favorable.

   Priorités : danger > attention > règles > favorable. Avec un cycle
   court, la période fertile peut commencer pendant les règles : on
   l'indique plutôt que d'afficher "règles" (sécurité).
   La durée réelle des règles ne déplace PAS la fenêtre fertile.
   ============================================= */

/* Décalage (0 = J1) du jour d'ovulation estimé */
function getOvulationOffset(cycleLen) {
  cycleLen = Math.max(20, Math.min(cycleLen || 28, 45));
  return cycleLen - 15; /* 28 j → 13 (J14) */
}

function getZoneBounds(cycleLen) {
  var ov = getOvulationOffset(cycleLen);
  return {
    cautionStart: Math.max(0, ov - 4),
    dangerStart:  Math.max(0, ov - 2),
    dangerEnd:    ov + 4            /* exclu */
  };
}

function getZone(dateStr, lastStart, cycleLen, periodDur) {
  cycleLen = cycleLen || 28;
  if (!lastStart) return null;
  periodDur = Math.max(1, Math.round(periodDur || 5));
  var b = getZoneBounds(cycleLen);
  var offset   = diffDays(lastStart, dateStr);
  var cycleDay = ((offset % cycleLen) + cycleLen) % cycleLen;
  var beforeOv = cycleDay < b.dangerEnd;
  if (cycleDay >= b.dangerStart  && cycleDay < b.dangerEnd)   return 'danger';
  if (cycleDay >= b.cautionStart && cycleDay < b.dangerStart) return 'caution';
  if (cycleDay < periodDur)  return 'period';
  return beforeOv ? 'safe1' : 'safe2';
}

/* Trouver la période de base pour une date donnée */
function getBasePeriodForDate(dateStr, periods) {
  if (!periods || !periods.length) return null;

  // Trouver la période la plus récente qui est avant ou égale à la date
  var relevantPeriods = periods.filter(function(p) {
    return p.start && p.start <= dateStr;
  });

  if (!relevantPeriods.length) return null;

  // Trier par date de début et prendre la plus récente
  relevantPeriods.sort(function(a, b) {
    return a.start < b.start ? 1 : -1;
  });

  return relevantPeriods[0];
}

/* Durée (en jours) à utiliser pour la zone "règles" d'une période donnée,
   pour une date donnée :
   - date dans le cycle réel de cette période ET fin renseignée → durée réelle
   - règles en cours (pas de fin) → estimation (moyenne observée ou réglage)
   - cycles futurs prédits → estimation */
function getPeriodLenForZone(basePeriod, dateStr, cycleLen) {
  cycleLen = cycleLen || 28;
  var offset = diffDays(basePeriod.start, dateStr);
  if (offset < cycleLen && basePeriod.end) {
    return diffDays(basePeriod.start, basePeriod.end) + 1;
  }
  return getEstimatedPeriodDur();
}

/* Calculer la zone pour une date en utilisant la période appropriée */
function getZoneForDate(dateStr, periods, cycleLen) {
  var basePeriod = getBasePeriodForDate(dateStr, periods);
  if (!basePeriod) return null;
  return getZone(dateStr, basePeriod.start, cycleLen, getPeriodLenForZone(basePeriod, dateStr, cycleLen));
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
    .filter(function(p) { return p.start && p.end && !p.endEstimated; }) /* fins réelles uniquement */
    .map(function(p) { return diffDays(p.start, p.end) + 1; })
    .filter(function(d) { return d >= 1 && d <= 12; });
  if (durs.length) {
    /* Moyenne des 6 dernières règles terminées (les plus récentes comptent) */
    durs = durs.slice(-6);
    var avg = durs.reduce(function(a, b) { return a + b; }, 0) / durs.length;
    return Math.max(1, Math.round(avg));
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

  /* Seuls les rapports du cycle EN COURS comptent : s'ils ont eu lieu avant
     le début des dernières règles, l'arrivée des règles a écarté le risque
     (avant : tous les rapports des 30 derniers jours → fausse alerte
     « Risque élevé » alors que les règles étaient déjà revenues). */
  var unprotected = (u.rapports || []).filter(function(r) {
    return !r.protected && r.date >= lp.start && r.date <= today;
  });
  if (!unprotected.length) return { level:'none', events:[], daysLate:daysLate };

  var events = unprotected.map(function(r) {
    // Utiliser la période appropriée pour chaque rapport pour cohérence historique
    var zone   = getZoneForDate(r.date, u.periods, cl) || getZone(r.date, lp.start, cl, getEstimatedPeriodDur());
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

/* =============================================
   HISTORIQUE DES RETARDS DE RÈGLES
   =============================================
   Enregistre et analyse les retards de règles pour
   détecter les patterns d'irrégularité.
   ============================================= */
/* Si `target` (objet utilisateur en cours de modification dans un
   updateUser) est fourni, on le modifie directement : appeler updateUser
   ici à l'intérieur d'un autre updateUser ferait perdre l'enregistrement
   (l'appel externe écrase avec sa propre copie). */
function recordPeriodDelay(expectedDate, actualDate, target) {
  var delay = diffDays(expectedDate, actualDate);
  if (delay <= 0) return; /* Pas de retard */

  function apply(u) {
    u.periodDelays = u.periodDelays || [];
    u.periodDelays.push({
      expected: expectedDate,
      actual: actualDate,
      delay: delay,
      recordedAt: todayStr()
    });
    /* Garder seulement les 12 derniers retards */
    if (u.periodDelays.length > 12) u.periodDelays = u.periodDelays.slice(-12);
    return u;
  }

  if (target) { apply(target); return; }
  if (!getUser()) return;
  updateUser(apply);
}

function getPeriodDelays() {
  var u = getUser();
  if (!u || !u.periodDelays) return [];
  return u.periodDelays.slice().sort(function(a, b) {
    return b.actual.localeCompare(a.actual);
  });
}

function getAverageDelay() {
  var delays = getPeriodDelays();
  if (!delays.length) return null;
  var total = delays.reduce(function(sum, d) { return sum + d.delay; }, 0);
  return Math.round(total / delays.length);
}

/* Prédiction de l'ovulation : ~14 jours avant les règles suivantes
   (avant : durée/2, faux pour les cycles différents de 28 jours) */
function getPredictedOvulationDate(lastStart, cycleLen) {
  if (!lastStart) return null;
  return addDays(lastStart, getOvulationOffset(cycleLen || 28));
}

function getOvulationWindow(lastStart, cycleLen) {
  if (!lastStart) return null;
  var ovulationDay = getOvulationOffset(cycleLen || 28);
  var start = addDays(lastStart, Math.max(0, ovulationDay - 2));
  var end = addDays(lastStart, ovulationDay + 2);
  return { start: start, end: end, peak: addDays(lastStart, ovulationDay) };
}

function isOvulationDay(dateStr, lastStart, cycleLen) {
  var ovWindow = getOvulationWindow(lastStart, cycleLen);
  if (!ovWindow) return false;
  return dateStr >= ovWindow.start && dateStr <= ovWindow.end;
}
