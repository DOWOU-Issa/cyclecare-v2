# CycleCare v2

Application de suivi du cycle menstruel — Web · Android · Windows

---

## 🚀 Réalisé (Téléchargements)

Retrouvez les dernières versions prêtes à l'emploi de l'application :

| Plateforme | Format | Lien de téléchargement |
|---|---|---|
| **Windows** | `.zip` | [Télécharger pour Windows](https://github.com/DOWOU-Issa/cyclecare-v2/releases/download/v2.0.0/CycleCare.Setup.1.0.0.exe) | 
| **Android** | `.apk` | [Télécharger pour Android](https://github.com/DOWOU-Issa/cyclecare-v2/releases/download/v2.0.0/CycleCare.apk) | 

> **Note Windows :** Décompressez le fichier `.zip` et lancez `CycleCare.exe` dans le dossier `win-unpacked/`.
> **Note Android :** L'APK est actuellement en version `debug`. Pour une installation sur mobile, vous devrez peut-être autoriser l'installation d'applications de sources inconnues.

---

## Configuration requise avant démarrage

### Étape 1 — Initialiser la base de données Supabase

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu du fichier `supabase/schema.sql`
4. Cliquez **Run** — vos tables sont créées

### Étape 2 — Activer la confirmation d'email (optionnel)

Pour simplifier l'inscription (sans vérification email) :
- Supabase Dashboard → **Authentication** → **Settings**
- Désactivez **"Enable email confirmations"**
- Les utilisatrices pourront se connecter immédiatement après l'inscription

---

## Déploiement web (GitHub Pages)

```
1. Créez un dépôt GitHub (Public)
2. Uploadez tous les fichiers du projet
3. Settings → Pages → Deploy from branch → main
4. Votre site : https://votre-nom.github.io/cyclecare
```

---

## Application Windows (Electron)

### Prérequis
- Node.js 18+ installé : https://nodejs.org

### Construction

```bash
# Dans le dossier du projet
npm install

# Lancer en mode développement
npm start

# Construire l'application Windows
npm run build:win
```

Les fichiers de build seront dans `dist-electron/` :
- `win-unpacked.zip` : Archive portable à décompresser (recommandée pour le déploiement)
- `win-unpacked/` : Dossier contenant l'exécutable `CycleCare.exe` et ses dépendances
- `cyclecare-1.0.0-x64.nsis.7z` : Archive de l'installateur NSIS

---

## Application Android (Capacitor)

### Prérequis
- Node.js 18+
- Android Studio : https://developer.android.com/studio
- Java Development Kit (JDK) 17+

### Construction

```bash
# Installer les dépendances
npm install

# Ajouter la plateforme Android
npm run cap:add:android

# IMPORTANT : Synchroniser les fichiers web vers Android AVANT de builder
npm run cap:sync

# Ouvrir dans Android Studio
npm run cap:open
```

Dans Android Studio :
- Attendez la fin de la synchronisation Gradle
- Branchez votre téléphone Android (ou créez un émulateur)
- Cliquez le bouton **Run** (triangle vert)

### ⚠️ Important : Synchronisation avant build

**Capacitor utilise le dossier `www/` pour Android.** Après chaque modification du code :

1. Exécutez `npm run cap:sync` pour synchroniser les fichiers
2. Les fichiers sont copiés de `www/` vers `android/app/src/main/assets/`
3. Rebuild l'APK dans Android Studio

Sans cette synchronisation, l'APK contiendra l'ancien code.

### Générer un APK signé (pour publication)

Dans Android Studio :
- **Build** → **Generate Signed Bundle/APK**
- Choisissez **APK**
- Créez ou sélectionnez votre keystore
- **Build Variant** : Release
- L'APK sera dans `android/app/release/`

---

## Structure du projet

```
cyclecare/
├── www/                        ⭐ DOSSIER PRINCIPAL pour Web + Android
│   ├── index.html              Point d'entrée unique (SPA)
│   ├── css/
│   │   └── main.css            Styles responsive (desktop + mobile)
│   └── js/
│       ├── supabase-config.js  Configuration connexion Supabase
│       ├── config.js           Données statiques (zones, médicaments, conseils)
│       ├── storage.js          Gestion LocalStorage + synchronisation Supabase
│       ├── cycle.js            Moteur de calcul du cycle menstruel
│       ├── notifications.js   Système de notifications locales
│       ├── bot.js              Assistant IA Gemini via Edge Function
│       ├── router.js           Navigation et layout (sidebar desktop/topbar mobile)
│       ├── modals.js           Gestion des modales de saisie
│       ├── onboarding.js       Parcours d'intégration premier utilisateur
│       ├── auth.js             Authentification Supabase (login/inscription)
│       ├── dashboard.js        Tableau de bord et indicateurs
│       ├── calendar.js         Calendrier mensuel interactif
│       ├── screens.js          Écrans : journal, médicaments, conseils, paramètres
│       └── main.js             Initialisation et orchestration de l'application
├── css/                        ⭐ COPIE pour Electron build Windows
│   └── main.css                (synchronisé depuis www/css/main.css)
├── js/                         ⭐ COPIE pour Electron build Windows
│   ├── cycle.js                (synchronisé depuis www/js/cycle.js)
│   ├── calendar.js             (synchronisé depuis www/js/calendar.js)
│   ├── screens.js              (synchronisé depuis www/js/screens.js)
│   ├── modals.js               (synchronisé depuis www/js/modals.js)
│   ├── dashboard.js            (synchronisé depuis www/js/dashboard.js)
│   ├── config.js               (synchronisé depuis www/js/config.js)
│   ├── bot.js                  (synchronisé depuis www/js/bot.js)
│   ├── auth.js                 (synchronisé depuis www/js/auth.js)
│   ├── main.js                 (synchronisé depuis www/js/main.js)
│   └── storage.js              (synchronisé depuis www/js/storage.js)
├── index.html                  ⭐ COPIE pour Electron build Windows
├── electron/
│   └── main.js                 Processus principal pour build Windows
├── android/                    Projet Android natif (généré par Capacitor)
│   ├── app/                    Application Android
│   └── build.gradle            Configuration Gradle
├── capacitor.config.json       Configuration multi-plateforme (Capacitor)
├── package.json                Dépendances npm et scripts de build
└── README.md                   Documentation du projet
```

### ⚠️ Important : Distinction des dossiers sources

- **GitHub Pages & Android** : Utilisent le dossier `www/`
- **Electron/Windows** : Utilise les fichiers à la racine (`css/`, `js/`, `index.html`)
- **Synchronisation** : Après modification du code, copier les fichiers de `www/` vers la racine pour Electron

---

## 📋 Améliorations récentes

### v2.1 - Cohérence historique du calendrier (2026-09-13)

**Problème résolu :** Le calendrier devenait incohérent quand de nouvelles données étaient ajoutées, modifiant l'affichage du passé.

**Solution :**
- Implémentation d'une logique de cohérence historique pour chaque date
- Chaque jour du calendrier utilise la période appropriée qui était active à ce moment-là
- L'historique des rapports affiche maintenant les zones correctes (ex: "Période favorable" au lieu de "Règles en cours")
- Tous les calculs de zones (calendrier, rapports, symptômes, dashboard, bot) utilisent cette logique

**Fichiers modifiés :**
- `www/js/cycle.js` - Ajout de `getBasePeriodForDate()` et `getZoneForDate()`
- `www/js/calendar.js` - Calendrier avec cohérence historique
- `www/js/screens.js` - Historique des rapports cohérent
- `www/js/modals.js` - Alertes période fertile cohérentes
- `www/js/dashboard.js` - Dashboard avec cohérence historique
- `www/js/config.js` - Conseils quotidiens cohérents
- `www/js/bot.js` - Bot avec cohérence historique

### v2.0 - Corrections de synchronisation (2026-09-13)

**Problèmes résolus :**
- Statut "Hors ligne" affiché incorrectement au démarrage
- Email non synchronisé après changement dans l'interface
- Erreurs Supabase déclenchant le statut "error"

**Solution :**
- Initialisation du statut à `'ok'` au lieu de `'error'`
- Synchronisation automatique de l'email après changement
- Les erreurs Supabase ne déclenchent plus le statut "error"
- Configuration RLS Supabase corrigée avec filtrage par utilisateur
- Colonnes manquantes ajoutées dans la base de données

---

## Architecture technique

### Frontend (JavaScript vanilla)
- **Single Page Application (SPA)** sans framework moderne
- **Architecture modulaire** : chaque fichier JS gère un domaine fonctionnel
- **Stockage local** : LocalStorage pour les données utilisateur (offline-first)
- **Synchronisation** : Sync automatique avec Supabase quand connecté
- **Responsive design** : Layout adaptatif desktop/mobile via CSS media queries

### Backend (Supabase)
- **Authentification** : Supabase Auth (email/password)
- **Base de données** : PostgreSQL via Supabase
- **Edge Functions** : Proxy sécurisé pour l'API Gemini (assistant IA)
- **Real-time** : Synchronisation des données entre appareils

### Multi-plateforme
- **Web** : Déploiement statique sur GitHub Pages
- **Windows** : Electron pour application desktop
- **Android** : Capacitor pour application mobile native

vin.exe ---

## Algorithme du cycle

Basé sur le tableau REGLE_CALENDRIER fourni :

| Phase | Jours du cycle | Description |
|---|---|---|
| Règles | J1 – J5 | Menstruation |
| Favorable | J6 – J9 | Faible risque |
| Attention | J10 – J11 | Risque croissant |
| Risque grossesse | J12 – J17 | Ovulation probable |
| Favorable | J18 – fin | Faible risque |

La durée exacte du cycle (28, 31 jours, etc.) est configurable par chaque utilisatrice dans les paramètres. Cela décale toutes les zones proportionnellement.

---

## Avertissement médical

Cette application est un outil d'information et de suivi personnel.
Elle ne remplace pas un avis médical professionnel.
En cas de doute, consultez un professionnel de santé.

---

## Configuration de l'assistant IA (Gemini via proxy sécurisé)

### Pourquoi un proxy ?
La clé API Gemini ne doit jamais apparaître dans le code frontend — n'importe qui peut lire le code source d'une page web. Le proxy Supabase Edge Function agit comme intermédiaire sécurisé : seule la Edge Function (côté serveur) connaît la clé.

### Étape 1 — Obtenir la clé Gemini gratuite
1. Allez sur **https://aistudio.google.com**
2. Connectez-vous avec un compte Google
3. Cliquez **Get API key → Create API key**
4. Copiez la clé (commence par `AIzaSy...`)

### Étape 2 — Installer Supabase CLI
```bash
npm install -g supabase
supabase login
```

### Étape 3 — Lier votre projet Supabase
```bash
# Dans le dossier du projet
supabase link --project-ref dszfylxtvytuwtvrpger
```

### Étape 4 — Stocker la clé comme secret (jamais en dur dans le code)
```bash
supabase secrets set GEMINI_API_KEY=AIzaSy...VotreCléIci
```

### Étape 5 — Déployer la Edge Function
```bash
supabase functions deploy gemini-proxy
```

### Étape 6 — Créer la table de rate limiting
Dans Supabase Dashboard → SQL Editor, le script `supabase/schema.sql` contient déjà la table `bot_usage`. Si vous l'avez déjà exécuté, relancez uniquement la partie `bot_usage`.

### Vérification
Après déploiement, l'onglet "Assistante" de l'app est actif pour toutes les utilisatrices connectées. Aucune configuration côté utilisatrice — elles utilisent directement le chat.

### Limites gratuites
| Ressource | Limite gratuite |
|---|---|
| Supabase Edge Functions | 500 000 invocations/mois |
| Google Gemini 1.5 Flash | 1 500 requêtes/jour |
| Rate limit par utilisatrice | 50 questions/jour (configurable dans `index.ts`) |
