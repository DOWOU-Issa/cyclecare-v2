## CycleCare 2.2.0 — Fiabilité, sécurité et calendrier adaptatif

### Téléchargements
- **Windows** : `CycleCare-Setup.exe` (installateur)
- **Android** : `CycleCare.apk` — s'installe par-dessus la version précédente, vos données sont conservées
- **Web** : https://dowou-issa.github.io/cyclecare-v2/

### 🗓️ Calendrier et cycle
- La zone « règles » s'adapte à la durée réelle : des règles de 3 ou 4 jours libèrent les jours suivants en « favorable »
- Les zones fertiles suivent la durée du cycle (ovulation estimée ~14 jours avant les règles suivantes) au lieu d'être fixes
- Le bouton « Terminer mes règles » fonctionne aussi pour les règles saisies à l'inscription

### 🔄 Données et synchronisation
- Plus de perte de données à la reconnexion (humeurs, pensées, températures, poids, pertes)
- Les saisies hors ligne ne sont plus écrasées : elles sont envoyées ou fusionnées avec l'autre appareil
- Statut « Non synchronisé » visible avec nouvel essai automatique
- Deux entrées le même jour ne se confondent plus
- « Supprimer mon compte » supprime réellement toutes les données sur le serveur
- La déconnexion efface les données de santé de l'appareil

### 🔒 Sécurité
- Protection contre l'injection de code (XSS)
- Assistante IA : limite de 50 questions/jour infalsifiable, règles fixées côté serveur
- Windows : liens externes limités, navigation bloquée hors de l'app, bac à sable activé

### 🛠️ Autres corrections
- « Mot de passe oublié » ouvre bien l'écran de nouveau mot de passe
- Les rappels Android s'arrêtent quand les notifications sont désactivées
- Impression du rapport sous Windows, export CSV lisible dans Excel
- L'assistante ne reçoit plus chaque message en double

> Les zones du calendrier sont des estimations et ne constituent pas une méthode de contraception.
