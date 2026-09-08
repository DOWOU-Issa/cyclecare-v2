# Configuration Supabase pour l'authentification

## Configuration requise pour la réinitialisation de mot de passe

Pour que les fonctionnalités de réinitialisation de mot de passe et de changement d'email fonctionnent correctement, vous devez configurer les redirections dans votre projet Supabase.

### Étapes de configuration :

1. **Accéder au tableau de bord Supabase**
   - Connectez-vous à https://supabase.com/dashboard
   - Sélectionnez votre projet `cyclecare-v2`

2. **Configurer les URLs de redirection**
   - Allez dans **Authentication** > **URL Configuration**
   - Ajoutez les URLs suivantes dans la section **Redirect URLs** :

   ```
   # Développement local
   http://localhost:3000/**
   http://127.0.0.1:3000/**
   
   # Production web
   https://dowou-issa.github.io/cyclecare-v2/**
   
   # Android (si nécessaire)
   cyclecare://**
   ```

3. **Configurer les emails de réinitialisation**
   - Allez dans **Authentication** > **Email Templates**
   - Éditez le template **Reset Password**
   - Personnalisez le contenu si nécessaire
   - Assurez-vous que le lien de redirection utilise `{{ .SiteURL }}` ou l'URL configurée

4. **Activer la confirmation par email (optionnel mais recommandé)**
   - Allez dans **Authentication** > **Providers**
   - Configurez **Email** provider
   - Activez **Confirm email** pour renforcer la sécurité

### Sécurité

- Les liens de réinitialisation expirent par défaut après 1 heure
- Rate limiting est activé par défaut sur Supabase
- Le mot de passe doit respecter les critères de complexité :
  - Minimum 6 caractères
  - Au moins 2 des éléments suivants : majuscules, minuscules, chiffres, caractères spéciaux

### Test

Pour tester la réinitialisation de mot de passe :
1. Sur l'écran de connexion, cliquez sur "Mot de passe oublié ?"
2. Entrez votre email
3. Vérifiez votre boîte de réception
4. Cliquez sur le lien de réinitialisation
5. Définissez votre nouveau mot de passe

Pour tester le changement d'email :
1. Connectez-vous à votre compte
2. Allez dans **Paramètres** > **Compte**
3. Cliquez sur "Changer" à côté de "Changer mon email"
4. Entrez votre nouvel email et votre mot de passe actuel
5. Vérifiez votre nouvelle boîte de réception pour la confirmation