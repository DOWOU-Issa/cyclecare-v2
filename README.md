# CycleCare v2

Application de suivi du cycle menstruel — Web · Android · Windows

**Version actuelle : 2.5.0**

---

## 🚀 Téléchargements

| Plateforme | Format | Lien |
|---|---|---|
| **Web** | Navigateur | [Ouvrir CycleCare](https://dowou-issa.github.io/cyclecare-v2/) |
| **Windows** | Installateur `.exe` | [Télécharger pour Windows](https://github.com/DOWOU-Issa/cyclecare-v2/releases/latest/download/CycleCare-Setup.exe) |
| **Android** | `.apk` | [Télécharger pour Android](https://github.com/DOWOU-Issa/cyclecare-v2/releases/latest/download/CycleCare.apk) |

Toutes les versions : [page des releases](https://github.com/DOWOU-Issa/cyclecare-v2/releases).

> **Windows :** lancez `CycleCare-Setup.exe` et suivez l'installation. Windows peut afficher « Windows a protégé votre ordinateur » (application non signée) : cliquez **Informations complémentaires → Exécuter quand même**.
>
> **Android :** autorisez l'installation depuis des sources inconnues si le téléphone le demande. La mise à jour s'installe par-dessus l'ancienne version, les données sont conservées.

---

## 📋 Nouveautés

### v2.5.0 — Animations et gestes (2026-09-24)

- Fenêtres qui se referment en douceur, et qu'on peut **fermer en les glissant vers le bas** sur mobile.
- Bouton **+** qui se transforme en **×**, boutons du menu qui apparaissent en cascade.
- Confirmation avec **coche animée** et **vibration légère** sur Android.
- Calendrier : le mois glisse, et on peut **changer de mois en balayant** du doigt.
- Accueil : le jour du cycle défile jusqu'au jour actuel, l'anneau se redessine après « Terminer mes règles ».
- Statistiques : barres qui montent, courbe de température qui se dessine.
- Ouverture instantanée avec les données de l'appareil ; blocs de chargement animés au premier lancement.
- Toutes les animations se désactivent si le téléphone est réglé sur « réduire les animations ».

### v2.4.0 — Nouvelle icône, « Ma journée » et choix du dossier (2026-09-24)

- **Nouvelle icône** (Windows, Android, web) et nouvel écran de démarrage Android.
- **Présentation au premier lancement** : 3 écrans pour comprendre les couleurs, le bouton + et « Terminer mes règles » (à revoir depuis Paramètres).
- **Ma journée** : symptômes, humeur, énergie, température et note sur un seul écran.
- **Rappels intelligents** : « Pensez à noter la fin de vos règles » et « Votre période fertile commence demain ».
- **Recherche dans le Journal** (ex. « crampes », « NorLevo »).
- **Choix de l'emplacement des fichiers** : « Choisir le dossier… » (Téléchargements, Documents, carte SD, Google Drive…), emplacement par défaut ou partage direct. Réglable dans Paramètres.
- **Mode sombre** harmonisé (calendrier, bande des 7 jours) et **animations** douces.

### v2.3.0 — Nouvelle interface, statistiques et rapport PDF (2026-09-24)

**Nouvelle interface**
- Barre de navigation en bas de l'écran sur mobile, avec un bouton **+** pour tout ajouter en un geste.
- Tableau de bord repensé : anneau coloré du cycle, jour du cycle, phase et prochaines règles réunis dans une seule carte ; bouton « Terminer mes règles » intégré.
- Calendrier : touchez un jour pour voir ce qui a été noté et ajouter une saisie à cette date ; les règles **prévues** apparaissent hachurées ; repères visuels (goutte, triangle) en plus des couleurs.
- Suggestion « Utiliser X jours » quand la durée de cycle observée diffère du réglage.
- Sur ordinateur : tableau de bord sur 2 colonnes.

**Statistiques** (nouvel écran)
- Longueur des cycles et durée des règles, avec moyenne et zone habituelle.
- Courbe de température basale avec détection automatique de la hausse d'ovulation.
- Symptômes selon la phase du cycle, humeur moyenne par phase, historique des retards.

**Rapport PDF pour le médecin**
- Synthèse (cycle moyen, régularité, durée des règles), tableau des derniers cycles, graphiques, symptômes, médicaments, notes.
- Fonctionne hors ligne.

**Corrections**
- L'alerte « Risque de grossesse » ne tient plus compte des rapports antérieurs aux dernières règles.
- **Android** : les rapports et exports sont enregistrés dans **Documents › CycleCare** et peuvent être ouverts ou partagés directement (avant, rien n'était téléchargé).

### v2.2.0 — Fiabilité, sécurité et calendrier adaptatif (2026-09-24)

**Calendrier et cycle**
- La zone « règles » s'adapte à la durée réelle : des règles de 3 ou 4 jours libèrent les jours suivants en « favorable ».
- Les zones fertiles suivent la durée du cycle : l'ovulation est estimée ~14 jours avant les règles suivantes (J14 pour 28 jours, J21 pour 35 jours…). Avant, elles étaient fixes quelle que soit la durée.
- Le bouton « Terminer mes règles » apparaît aussi pour les règles saisies à l'inscription, et sa date par défaut est correcte.
- L'historique des retards de règles est bien enregistré.

**Données et synchronisation**
- Plus aucune perte de données à la reconnexion (humeurs, pensées, températures, poids, pertes étaient effacés).
- Les saisies faites hors ligne ne sont plus écrasées au démarrage : elles sont envoyées, et fusionnées si un autre appareil a modifié les données entre-temps.
- Un vrai statut « Non synchronisé » s'affiche en cas d'échec, avec nouvel essai automatique.
- Chaque entrée a un identifiant unique : deux entrées le même jour ne se confondent plus à la modification ou à la suppression.
- « Supprimer mon compte » supprime réellement le compte et toutes les données sur le serveur.
- La déconnexion efface les données de santé de l'appareil.

**Sécurité**
- Protection contre l'injection de code (XSS) dans les notes, les formulaires et le rapport mensuel.
- Assistante IA : limite de 50 questions/jour infalsifiable, règles de l'assistante fixées côté serveur, requêtes limitées en taille.
- Windows : liens externes limités à `https`, navigation bloquée hors de l'app, bac à sable activé, outils développeur retirés.
- Bibliothèque Supabase en version figée avec vérification d'intégrité (SRI).

**Autres corrections**
- Le lien « Mot de passe oublié » ouvre bien l'écran de nouveau mot de passe.
- Les rappels Android s'arrêtent quand les notifications sont désactivées.
- L'impression du rapport fonctionne sous Windows.
- Export CSV lisible dans Excel (accents, virgules dans les notes).
- L'assistante ne reçoit plus chaque message en double.
- `www/` est désormais la **seule** source de l'application pour le web, Android et Windows.

### v2.1 — Cohérence historique du calendrier (2026-09-13)

- Chaque jour du calendrier utilise la période qui était active à ce moment-là : ajouter des données ne modifie plus l'affichage du passé.

### v2.0 — Corrections de synchronisation (2026-09-13)

- Statut « Hors ligne » erroné au démarrage corrigé, email synchronisé après changement, règles RLS Supabase corrigées.

---

## Structure du projet

```
cyclecare-v2/
├── www/                        ⭐ SEULE source de l'app (Web + Android + Windows)
│   ├── index.html              Point d'entrée (SPA)
│   ├── css/main.css            Styles responsive
│   ├── js/
│   │   ├── supabase-config.js  Connexion Supabase
│   │   ├── config.js           Données statiques (zones, médicaments, conseils)
│   │   ├── storage.js          Stockage local + synchronisation Supabase (fusion, identifiants)
│   │   ├── cycle.js            Moteur de calcul du cycle
│   │   ├── notifications.js    Rappels locaux
│   │   ├── bot.js              Assistante IA (via Edge Function)
│   │   ├── router.js           Navigation et mise en page
│   │   ├── modals.js           Formulaires de saisie
│   │   ├── onboarding.js       Parcours de première utilisation
│   │   ├── auth.js             Connexion, inscription, mot de passe
│   │   ├── dashboard.js        Tableau de bord
│   │   ├── calendar.js         Calendrier mensuel
│   │   ├── screens.js          Journal, médicaments, conseils, paramètres
│   │   ├── files.js            Enregistrement / partage de fichiers (Android : Documents › CycleCare)
│   │   ├── charts.js           Graphiques SVG
│   │   ├── stats.js            Écran Statistiques
│   │   ├── report.js           Rapport PDF pour le médecin
│   │   ├── tour.js             Présentation au premier lancement
│   │   ├── motion.js           Animations, gestes, vibrations
│   │   ├── daylog.js           Fiche « Ma journée »
│   │   └── main.js             Initialisation
│   └── vendor/jspdf.umd.min.js Génération de PDF (embarqué, fonctionne hors ligne)
├── assets/                     Icône de l'application (icon.ico Windows, icon.png, icon.svg)
├── electron/main.js            App Windows (charge www/index.html)
├── android/                    Projet Android (Capacitor)
├── supabase/
│   ├── schema.sql              Schéma complet de la base
│   ├── migrations/             Historique des changements SQL
│   └── functions/
│       ├── gemini-proxy/       Proxy sécurisé vers Gemini (assistante IA)
│       └── delete-account/     Suppression définitive du compte (RGPD)
├── .github/workflows/          Déploiement automatique sur GitHub Pages
├── capacitor.config.json       Configuration Android (webDir: www)
└── package.json                Scripts de build et configuration Electron
```

Après toute modification dans `www/` :
- **Web** : un `git push` suffit, GitHub Pages se met à jour automatiquement.
- **Android** : `npm run cap:sync` puis rebuild dans Android Studio.
- **Windows** : `npm run build:win`.

---

## Installation d'un nouveau projet Supabase

> Le projet de production est déjà configuré. Cette section sert uniquement à recréer l'environnement.

1. **Base de données** — Supabase Dashboard → **SQL Editor** → collez `supabase/schema.sql` → **Run**.
2. **Redirections** — **Authentication → URL Configuration → Redirect URLs** : ajoutez `https://dowou-issa.github.io/cyclecare-v2/` (nécessaire pour « Mot de passe oublié »). Voir aussi `SUPABASE_CONFIG.md`.
3. **Confirmation d'email** (optionnel) — si elle est activée, l'app demande à l'utilisatrice de confirmer son email avant la première connexion.
4. **Edge Functions** :
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <votre-project-ref>
   supabase secrets set GEMINI_API_KEY=AIzaSy...   # clé depuis https://aistudio.google.com
   supabase functions deploy gemini-proxy
   supabase functions deploy delete-account
   ```
   La clé Gemini ne doit jamais apparaître dans le code du site : seule l'Edge Function la connaît.

---

## Build Windows (Electron)

Prérequis : Node.js 18+

```bash
npm install
npm start            # lancer en mode développement
npm run build:win    # → dist-electron/CycleCare-Setup.exe
```

## Build Android (Capacitor)

Prérequis : Node.js 18+, Android Studio, JDK 17+

```bash
npm install
npm run cap:sync     # copie www/ et les plugins (filesystem, share, notifications) dans le projet Android — OBLIGATOIRE avant chaque build
npm run cap:open     # ouvre Android Studio
```

Dans Android Studio : **Build → Generate Signed Bundle / APK → APK → Release**.
Utilisez toujours le **même keystore** : sinon la mise à jour ne pourra pas s'installer par-dessus l'ancienne version.
Avant chaque nouvelle version, augmentez `versionCode` et `versionName` dans `android/app/build.gradle`.

## Publier une nouvelle version

1. Mettre à jour `version` dans `package.json` et `versionCode` / `versionName` dans `android/app/build.gradle`.
2. Construire l'exe et l'APK (voir ci-dessus).
3. GitHub → **Releases → Draft a new release** → tag `vX.Y.Z`.
4. Joindre les fichiers nommés **exactement** `CycleCare-Setup.exe` et `CycleCare.apk` : les liens de téléchargement de ce README pointent toujours vers la dernière release.

---

## Architecture technique

- **Frontend** : JavaScript vanilla, SPA sans framework, offline-first (localStorage), responsive.
- **Synchronisation** : chaque modification est marquée « à envoyer » jusqu'à confirmation du serveur. Au démarrage, les modifications locales non envoyées sont fusionnées avec le serveur plutôt qu'écrasées.
- **Backend** : Supabase (Auth, PostgreSQL avec RLS, Edge Functions).
- **Multi-plateforme** : GitHub Pages (web), Electron (Windows), Capacitor (Android), à partir du même dossier `www/`.

---

## Algorithme du cycle

L'ovulation a lieu environ **14 jours avant les règles suivantes**. Les zones sont calculées à partir de la durée du cycle réglée par l'utilisatrice :

| Phase | Cycle de 28 j | Règle générale |
|---|---|---|
| Règles | J1 – J5 | Durée réelle saisie (5 j par défaut, moyenne des derniers cycles) |
| Favorable | J6 – J9 | Jusqu'à 5 jours avant l'ovulation |
| Attention | J10 – J11 | Ovulation −4 et −3 jours |
| Risque grossesse | J12 – J17 | Ovulation −2 à +3 jours |
| Favorable | J18 – fin | Jusqu'aux règles suivantes |

Exemple avec un cycle de 35 jours : risque de grossesse de J19 à J24.
Pour les cycles courts, la zone à risque est prioritaire sur l'affichage « règles ».

---

## Avertissement médical

Cette application est un outil d'information et de suivi personnel. Elle ne remplace pas un avis médical professionnel. Les zones sont des **estimations** : elles ne constituent pas une méthode de contraception. En cas de doute, consultez un professionnel de santé.

---

## Limites gratuites

| Ressource | Limite |
|---|---|
| Supabase Edge Functions | 500 000 invocations / mois |
| Google Gemini (gemini-2.5-flash) | selon le quota gratuit de Google AI Studio |
| Questions à l'assistante | 50 / jour / utilisatrice (`increment_bot_usage` dans `supabase/schema.sql`) |
