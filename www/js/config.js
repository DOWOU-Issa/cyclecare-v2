/* =============================================
   js/config.js — Données et constantes
   ============================================= */

var STORE_KEY = 'cyclecare_v2';
var MONTHS_FR    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
var DAYS_FR_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

/* ---------- ZONES DU CYCLE ----------
   Basé sur le tableau REGLE_CALENDRIER fourni.
   Décalages par rapport à la date de début des règles :
     J1–J5   (offset 0–4)  : Menstruation
     J6–J9   (offset 5–8)  : Favorable (faible risque)
     J10–J11 (offset 9–10) : Attention (transition)
     J12–J17 (offset 11–16): DANGER — Ovulation / Risque grossesse
     J18–fin (offset 17+)  : Favorable (faible risque)
*/
var ZONE_INFO = {
  period: {
    lbl:     'Règles en cours',
    chipCls: 'zc-period',
    calCls:  'zp',
    icon:    'ti-droplet-filled',
    color:   'var(--z-period-tx)',
    cardCls: 'z-period',
    desc:    'Période de menstruation. Reposez-vous et restez hydratée.'
  },
  safe1: {
    lbl:     'Période favorable',
    chipCls: 'zc-safe',
    calCls:  'zs',
    icon:    'ti-leaf',
    color:   'var(--z-safe-tx)',
    cardCls: 'z-safe',
    desc:    'Jours favorables après les règles. Risque de grossesse faible.'
  },
  caution: {
    lbl:     'Attention',
    chipCls: 'zc-caution',
    calCls:  'zc',
    icon:    'ti-alert-triangle',
    color:   'var(--z-caution-tx)',
    cardCls: 'z-caution',
    desc:    'Jours de transition — le risque de grossesse augmente progressivement.'
  },
  danger: {
    lbl:     'Risque de grossesse',
    chipCls: 'zc-danger',
    calCls:  'zd',
    icon:    'ti-alert-circle',
    color:   'var(--z-danger-tx)',
    cardCls: 'z-danger',
    desc:    'Période fertile — Ovulation probable. Risque élevé de grossesse lors de rapports non protégés.'
  },
  safe2: {
    lbl:     'Période favorable',
    chipCls: 'zc-safe',
    calCls:  'zs',
    icon:    'ti-leaf',
    color:   'var(--z-safe-tx)',
    cardCls: 'z-safe',
    desc:    'Jours favorables avant les prochaines règles. Risque de grossesse faible.'
  }
};

var ZONE_PHASE_ICONS = {
  period:  'ti-droplet-filled',
  safe1:   'ti-leaf',
  caution: 'ti-alert-triangle',
  danger:  'ti-alert-circle',
  safe2:   'ti-leaf'
};

var ZONE_ICON_BG = {
  period:  'item-icon-pink',
  safe1:   'item-icon-green',
  caution: 'item-icon-amber',
  danger:  'item-icon-red',
  safe2:   'item-icon-green'
};

/* ---------- MÉDICAMENTS ---------- */
var MEDS_DATA = {
  norLevo: {
    name:      'Pilule du lendemain (NorLevo / Plan B)',
    color:     '#6c3483',
    bg:        '#f5eef8',
    iconBg:    'item-icon-purple',
    icon:      'ti-pill',
    window:    'À prendre dans les 72h — plus tôt = plus efficace',
    efficacy:  '89 % dans les 72h — 95 % dans les premières 24h',
    mechanism: 'Retarde ou empêche l\'ovulation. Ce n\'est pas un avortement. Elle est inefficace si l\'ovulation a déjà eu lieu.',
    effects: [
      'Les règles peuvent arriver 1 à 7 jours avant ou après la date prévue',
      'Saignements légers possibles dans les jours suivants',
      'Nausées et maux de tête possibles',
      'Retard de règles supérieur à 7 jours : faire un test de grossesse'
    ],
    delayDays: 7
  },
  ellaOne: {
    name:      'EllaOne (ulipristal acétate)',
    color:     '#1a7a4a',
    bg:        '#eaf7f0',
    iconBg:    'item-icon-green',
    icon:      'ti-pill',
    window:    'À prendre dans les 120h (5 jours)',
    efficacy:  '98 % si prise rapidement — plus efficace que NorLevo après 72h',
    mechanism: 'Inhibe fortement l\'ovulation, même après son déclenchement. Plus puissante que le lévonorgestrel.',
    effects: [
      'Les règles peuvent être retardées de 1 à 2 semaines',
      'Saignements légers possibles',
      'Maux de tête et douleurs abdominales légères',
      'Retard de règles supérieur à 7 jours : faire un test de grossesse',
      'Ne pas allaiter pendant les 36 heures suivant la prise'
    ],
    delayDays: 14
  },
  pilule: {
    name:      'Pilule contraceptive (prise quotidienne)',
    color:     '#2471a3',
    bg:        '#eaf4fb',
    iconBg:    'item-icon-purple',
    icon:      'ti-pill',
    window:    'Prise quotidienne à heure fixe',
    efficacy:  'Plus de 99 % si prise correctement',
    mechanism: 'Empêche l\'ovulation et épaissit la glaire cervicale. Doit être prise chaque jour à la même heure.',
    effects: [
      'Règles moins abondantes et moins douloureuses',
      'Cycles plus réguliers et prévisibles',
      'Oubli d\'un comprimé : efficacité réduite',
      'Premier mois : attendre 7 jours avant rapport non protégé',
      'Arrêt de la pilule : le cycle peut mettre 1 à 3 mois à se régulariser'
    ],
    delayDays: 0
  },
  autre: {
    name:      'Autre médicament',
    color:     '#7f8c8d',
    bg:        '#f2f3f4',
    iconBg:    'item-icon-pink',
    icon:      'ti-pill',
    window:    'Selon prescription médicale',
    efficacy:  'Variable selon le médicament',
    mechanism: 'Consultez votre médecin ou pharmacien pour les effets sur le cycle.',
    effects:   ['Effets variables selon le type de médicament', 'Consultez toujours un professionnel de santé'],
    delayDays: 0
  }
};

/* ---------- OPTIONS SYMPTÔMES ---------- */
var SYMPTOM_OPTIONS = [
  'Crampes', 'Maux de tête', 'Ballonnements', 'Fatigue',
  'Nausées', 'Seins sensibles', 'Humeur irritable', 'Acné',
  'Douleurs dos', 'Envies alimentaires', 'Insomnie', 'Vertiges'
];

/* ---------- FLUX MENSTRUEL ---------- */
var FLOW_OPTIONS = [
  { val:'tres_leger',    lbl:'Très léger (spotting)' },
  { val:'leger',         lbl:'Léger' },
  { val:'normal',        lbl:'Normal' },
  { val:'abondant',      lbl:'Abondant' },
  { val:'tres_abondant', lbl:'Très abondant' }
];

/* ---------- CONSEILS SANTÉ ---------- */
var TIPS_DATA = [
  {
    id:'avant', icon:'ti-moon', accentColor:'#6c3483',
    title:'Avant les règles — prévenir la douleur',
    tips:[
      { icon:'ti-salt', t:'Réduire le sel',            d:'Limitez les aliments salés pour éviter la rétention d\'eau et les ballonnements.' },
      { icon:'ti-coffee', t:'Éviter la caféine',       d:'Café et thé noir peuvent aggraver les crampes. Optez pour des tisanes de gingembre ou camomille.' },
      { icon:'ti-apple', t:'Magnésium',                d:'Bananes, légumes verts, noix — riches en magnésium qui réduit significativement les crampes.' },
      { icon:'ti-run', t:'Exercice régulier',          d:'Marche, yoga, natation : pratiquer régulièrement prévient des règles douloureuses.' },
      { icon:'ti-mood-sad', t:'Éviter l\'alcool',      d:'L\'alcool aggrave l\'inflammation et intensifie les douleurs et sautes d\'humeur prémenstruelles.' },
      { icon:'ti-candy', t:'Réduire les sucres',       d:'Les sucres raffinés augmentent l\'inflammation. Préférez fruits, céréales complètes, légumes.' },
      { icon:'ti-pill', t:'Ibuprofène en prévention',  d:'Commencer l\'ibuprofène 1 à 2 jours avant les règles prévues réduit fortement les crampes.' }
    ]
  },
  {
    id:'pendant', icon:'ti-droplet-filled', accentColor:'#8b2252',
    title:'Pendant les règles — soulager la douleur',
    tips:[
      { icon:'ti-temperature', t:'Bouillotte / chaleur',     d:'Appliquez une bouillotte sur le bas-ventre 15 à 20 minutes. La chaleur relaxe les muscles utérins.' },
      { icon:'ti-pill', t:'Ibuprofène',                      d:'Anti-inflammatoire le plus efficace. 400 mg avec de la nourriture, maximum 3 fois par jour, 3 à 4 jours.' },
      { icon:'ti-droplet', t:'Rester hydratée',              d:'Buvez beaucoup d\'eau. Les tisanes de menthe, gingembre ou camomille soulagent les crampes.' },
      { icon:'ti-bed', t:'Repos suffisant',                  d:'Votre corps travaille intensément pendant les règles. Dormez bien et respectez vos besoins.' },
      { icon:'ti-meat', t:'Aliments riches en fer',          d:'Viande rouge, lentilles, épinards, haricots : compensez les pertes de sang pour éviter la fatigue.' },
      { icon:'ti-snowflake', t:'Éviter le froid',            d:'Bains et boissons très froids peuvent intensifier les crampes. Préférez la chaleur modérée.' },
      { icon:'ti-walk', t:'Mouvement léger',                 d:'Marche douce ou yoga libèrent des endorphines, antidouleurs naturels produits par votre corps.' }
    ]
  },
  {
    id:'apres', icon:'ti-plant-2', accentColor:'#1a7a4a',
    title:'Après les règles — reprendre de l\'énergie',
    tips:[
      { icon:'ti-meat', t:'Reconstituer le fer',      d:'Combinez fer (viande, légumineuses) et vitamine C (orange, citron) pour une meilleure absorption.' },
      { icon:'ti-run', t:'Exercice plus intense',      d:'Période optimale pour le sport : énergie haute, les œstrogènes favorisent les performances.' },
      { icon:'ti-droplet-half-2', t:'Hygiène intime', d:'Savon doux sans parfum à l\'extérieur uniquement. Les douches vaginales détruisent la flore naturelle.' },
      { icon:'ti-sparkles', t:'Énergie en hausse',     d:'Les œstrogènes montent — période idéale pour les projets importants et les activités créatives.' }
    ]
  },
  {
    id:'fertile', icon:'ti-alert-triangle', accentColor:'#b35000',
    title:'Période fertile — contraception',
    tips:[
      { icon:'ti-alert-circle', t:'Fertilité maximale',           d:'Jours 12 à 17 du cycle : risque de grossesse le plus élevé. Contraception obligatoire si pas de désir de grossesse.' },
      { icon:'ti-eye', t:'Signes d\'ovulation',                    d:'Pertes vaginales claires et filantes, légère douleur d\'un côté du bas-ventre, légère hausse de température au réveil.' },
      { icon:'ti-shield-check', t:'Méthodes fiables',             d:'Le préservatif associé à la pilule offre la protection maximale. Le calendrier seul n\'est pas fiable à 100 %.' },
      { icon:'ti-clock', t:'Contraception d\'urgence',            d:'En cas d\'accident : NorLevo dans les 72h ou EllaOne dans les 120h. Plus tôt = plus efficace.' },
      { icon:'ti-heart', t:'Si grossesse désirée',                d:'Période optimale pour concevoir. Les rapports dans les 2 à 3 jours avant l\'ovulation maximisent les chances.' }
    ]
  },
  {
    id:'grossesse', icon:'ti-baby-carriage', accentColor:'#2471a3',
    title:'Signes possibles de grossesse',
    tips:[
      { icon:'ti-calendar-off', t:'Retard de règles (plus de 5 jours)',   d:'Faites un test urinaire en pharmacie. Fiable dès 1 semaine après la date prévue des règles.' },
      { icon:'ti-mood-sick', t:'Nausées matinales',                       d:'Surtout le matin, dès 4 à 6 semaines. Mangez en petites quantités souvent. Peut durer jusqu\'au 3e mois.' },
      { icon:'ti-droplet', t:'Seins gonflés et sensibles',                d:'Gonflement, sensibilité, aréoles qui foncent — signe précoce dès 2 à 4 semaines.' },
      { icon:'ti-zzz', t:'Fatigue intense',                               d:'Envie de dormir beaucoup, épuisement inexpliqué. Très courant au premier trimestre.' },
      { icon:'ti-toilet-paper', t:'Urines fréquentes',                    d:'Besoin d\'uriner plus souvent, même la nuit — signe précoce de grossesse.' },
      { icon:'ti-droplet-half', t:'Saignements d\'implantation',          d:'Légers saignements rosés 5 à 10 jours après l\'ovulation. Différents des règles : moins abondants, 1 à 2 jours.' },
      { icon:'ti-ripple', t:'Aversions alimentaires',                     d:'Répulsion pour certains aliments ou odeurs habituellement appréciés — très courant.' },
      { icon:'ti-stethoscope', t:'Que faire si vous pensez être enceinte ?', d:'Test de grossesse en pharmacie, puis consultation médicale dès que possible. Ne vous automédicitez pas.' }
    ]
  },
  {
    id:'alerte', icon:'ti-stethoscope', accentColor:'#922b21',
    title:'Signes d\'alerte — consultez un médecin',
    tips:[
      { icon:'ti-droplet-filled', t:'Saignements anormaux',          d:'Entre les règles, très abondants (protection toutes les heures), avec gros caillots, ou après la ménopause.' },
      { icon:'ti-urgent', t:'Douleurs invalidantes',                  d:'Douleurs empêchant de marcher, travailler ou dormir. Peut indiquer une endométriose ou un fibrome.' },
      { icon:'ti-calendar-off', t:'Absence de règles plus de 3 mois',d:'Si vous n\'êtes pas enceinte : bilan hormonal nécessaire (SOPK, stress, troubles hormonaux).' },
      { icon:'ti-virus', t:'Démangeaisons ou odeurs inhabituelles',   d:'Infection vaginale (candidose, vaginose). Consultez un médecin — traitement spécifique nécessaire.' },
      { icon:'ti-thermometer', t:'Fièvre pendant les règles',         d:'Peut indiquer une infection pelvienne grave. Consultez en urgence.' },
      { icon:'ti-heart-broken', t:'Douleurs lors des rapports',       d:'Dyspareunie — peut indiquer une endométriose, une infection ou un kyste. Consultez sans attendre.' }
    ]
  }
];
