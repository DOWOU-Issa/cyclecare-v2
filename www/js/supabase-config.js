/* =============================================
   js/supabase-config.js
   Connexion au projet Supabase
   =============================================
   La clé "anon" est publique par conception :
   Row Level Security (RLS) garantit que chaque
   utilisatrice ne peut lire que ses propres données.
   
   Pour utiliser votre propre projet Supabase :
   1. Créez un projet sur https://supabase.com
   2. Exécutez le script supabase/schema.sql
   3. Remplacez les valeurs ci-dessous par vos credentials
   ============================================= */

var SUPABASE_URL = 'https://votre-projet.supabase.co';
var SUPABASE_ANON_KEY = 'votre-cle-anon-ici';

var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
