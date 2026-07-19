# CycleCare v2

Application de suivi du cycle menstruel — Web · Android · Windows

---

## 🚀 Réalisé (Téléchargements)

Retrouvez les dernières versions prêtes à l'emploi de l'application :

| Plateforme | Format | Lien de téléchargement |
|---|---|---|
| **Windows** | `.exe` | [Télécharger pour Windows](https://github.com/DOWOU-Issa/cyclecare-v2/releases/latest/download/cyclecare.exe) |
| **Android** | `.apk` | [Télécharger pour Android](https://github.com/DOWOU-Issa/cyclecare-v2/releases/latest/download/app-debug.apk) |

> **Note :** L'APK Android est actuellement en version `debug`. Pour une installation sur mobile, vous devrez peut-être autoriser l'installation d'applications de sources inconnues.

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

# Construire l'installateur Windows (.exe)
npm run build:win
```

Le fichier `.exe` sera dans `dist-electron/`.

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

# Synchroniser les fichiers web vers Android
npm run cap:sync

# Ouvrir dans Android Studio
npm run cap:open
```

Dans Android Studio :
- Attendez la fin de la synchronisation Gradle
- Branchez votre téléphone Android (ou créez un émulateur)
- Cliquez le bouton **Run** (triangle vert)

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
├── index.html                  Point d'entrée unique
├── css/
│   └── main.css                Styles (responsive desktop + mobile)
├── js/
│   ├── supabase-config.js      Connexion Supabase
│   ├── config.js               Données (zones, médicaments, conseils)
│   ├── storage.js              LocalStorage + sync Supabase
│   ├── cycle.js                Moteur de calcul du cycle
│   ├── router.js               Navigation et mise en page
│   ├── modals.js               Modales de saisie
│   ├── auth.js                 Authentification Supabase
│   ├── dashboard.js            Tableau de bord
│   ├── calendar.js             Calendrier mensuel
│   ├── screens.js              Journal, médicaments, conseils, paramètres
│   └── main.js                 Initialisation de l'application
├── supabase/
│   └── schema.sql              Script SQL à exécuter dans Supabase
├── electron/
│   └── main.js                 Application Windows (Electron)
├── capacitor.config.json       Configuration Android (Capacitor)
├── package.json                Dépendances npm
└── README.md                   Ce fichier
```

---

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
