/* =============================================
   js/daylog.js — Fiche « Ma journée »
   =============================================
   Un seul écran pour l'essentiel du jour : symptômes, humeur, énergie,
   température et note. Les données sont rangées dans les mêmes listes
   que les formulaires séparés (symptômes, humeurs, énergies,
   températures, pensées) : Journal, statistiques et rapport PDF les
   voient donc normalement.
   ============================================= */

/* Échelles simplifiées (5 humeurs, 4 niveaux d'énergie) → valeurs existantes */
var DAY_MOODS = [
  { val: 2,  ico: 'ti-mood-sad',         lbl: 'Triste' },
  { val: 4,  ico: 'ti-mood-neutral',     lbl: 'Neutre' },
  { val: 6,  ico: 'ti-mood-smile',       lbl: 'Bien' },
  { val: 8,  ico: 'ti-mood-happy',       lbl: 'Heureuse' },
  { val: 10, ico: 'ti-mood-crazy-happy', lbl: 'Au top' }
];
var DAY_ENERGY = [
  { val: 2, ico: 'ti-battery-1',        lbl: 'Épuisée' },
  { val: 4, ico: 'ti-battery-2',        lbl: 'Fatiguée' },
  { val: 6, ico: 'ti-battery-3',        lbl: 'En forme' },
  { val: 8, ico: 'ti-battery-charging', lbl: 'Pleine d\'énergie' }
];
function nearest(scale, v) {
  if (v == null) return null;
  return scale.reduce(function(b, s) { return Math.abs(s.val - v) < Math.abs(b.val - v) ? s : b; }).val;
}

function mLogDay() {
  var u = getUser(), d = defaultEntryDate();
  var onDate = function(list) { return (u[list] || []).filter(function(e) { return e.date === d; }); };
  var syms = {}; onDate('symptoms').forEach(function(s) { (s.items || []).forEach(function(i) { syms[i] = true; }); });
  var mood = onDate('moods')[0], en = onDate('energies')[0], temp = onDate('temperatures')[0];
  var moodV = nearest(DAY_MOODS, mood && mood.value), enV = nearest(DAY_ENERGY, en && en.value);

  var chips = SYMPTOM_OPTIONS.map(function(s, k) {
    return '<label class="chip-toggle"><input type="checkbox" name="dl-sym" value="' + esc(s) + '"' + (syms[s] ? ' checked' : '') + '><span>' + esc(s) + '</span></label>';
  }).join('');
  var scale = function(name, items, cur) {
    return '<div class="scale-row" role="radiogroup">' + items.map(function(it) {
      return '<label class="scale-opt"><input type="radio" name="' + name + '" value="' + it.val + '"' + (cur === it.val ? ' checked' : '') + '>'
        + '<span><i class="ti ' + it.ico + '" aria-hidden="true"></i>' + it.lbl + '</span></label>';
    }).join('') + '</div>';
  };

  return mTitle('ti-sun', 'Ma journée')
    + '<div class="form-grp"><label class="lbl" for="dl-date">Date</label>'
    + '<input class="inp" type="date" id="dl-date" max="' + todayStr() + '" value="' + d + '" onchange="dayLogChangeDate(this.value)"/></div>'
    + '<div class="form-grp"><label class="lbl">Symptômes</label><div class="chip-wrap">' + chips + '</div></div>'
    + '<div class="form-grp"><label class="lbl">Humeur</label>' + scale('dl-mood', DAY_MOODS, moodV) + '</div>'
    + '<div class="form-grp"><label class="lbl">Énergie</label>' + scale('dl-energy', DAY_ENERGY, enV) + '</div>'
    + '<div class="form-grp"><label class="lbl" for="dl-temp">Température au réveil (°C) <span style="text-transform:none;font-weight:400;font-size:10px;">(optionnel)</span></label>'
    + '<input class="inp" type="text" inputmode="decimal" id="dl-temp" placeholder="ex. 36,55" value="' + (temp ? esc(String(temp.value).replace('.', ',')) : '') + '"/></div>'
    + mTextarea('dl-note', 'Note du jour', 'Comment s\'est passée votre journée ?', true, '')
    + mFooter('saveDayLog()');
}
function dayLogChangeDate(v) {
  if (!v) return;
  App.state.prefillDate = v;
  openModal('logDay');
}

function saveDayLog() {
  var d = val('dl-date');
  if (!d) { showToast('Choisissez une date.', 'err'); return; }
  var items = Array.prototype.slice.call(document.querySelectorAll('input[name="dl-sym"]:checked')).map(function(i) { return i.value; });
  var moodEl = document.querySelector('input[name="dl-mood"]:checked');
  var enEl = document.querySelector('input[name="dl-energy"]:checked');
  var tRaw = val('dl-temp'), t = tRaw ? parseFloat(tRaw.replace(',', '.')) : null;
  var note = val('dl-note');
  if (t !== null && (isNaN(t) || t < 35 || t > 42)) { showToast('Température invalide (35–42 °C).', 'err'); return; }
  if (!items.length && !moodEl && !enEl && t === null && !note) { showToast('Rien à enregistrer pour ce jour.', 'warn'); return; }

  updateUser(function(u) {
    /* Remplace la valeur du jour en gardant les notes déjà saisies */
    var upsert = function(list, fields) {
      u[list] = u[list] || [];
      var same = u[list].filter(function(e) { return e.date === d; });
      var keep = same[0];
      u[list] = u[list].filter(function(e) { return e.date !== d || e === keep; });
      if (fields === null) { u[list] = u[list].filter(function(e) { return e !== keep; }); return; }
      if (keep) { for (var k in fields) keep[k] = fields[k]; }
      else { var n = { date: d }; for (var k2 in fields) n[k2] = fields[k2]; u[list].push(n); }
      u[list].sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    };
    upsert('symptoms', items.length ? { items: items } : null);
    if (moodEl) upsert('moods', { value: parseInt(moodEl.value, 10) });
    if (enEl) upsert('energies', { value: parseInt(enEl.value, 10) });
    if (t !== null) upsert('temperatures', { value: Math.round(t * 100) / 100, time: '07:00' });
    if (note) {
      u.thoughts = u.thoughts || [];
      u.thoughts.push({ date: d, text: note, mood: null });
    }
    return u;
  });
  closeModal();
  showToast('Journée du ' + fmtShort(d) + ' enregistrée.');
}
