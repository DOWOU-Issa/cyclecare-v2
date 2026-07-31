/* =============================================
   js/supabase-config.js
   Connexion au projet Supabase
   =============================================
   La clé "anon" est publique par conception :
   Row Level Security (RLS) garantit que chaque
   utilisatrice ne peut lire que ses propres données.
   ============================================= */

var SUPABASE_URL = 'https://dszfylxtvytuwtvrpger.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzemZ5bHh0dnl0dXd0dnJwZ2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjQ0MDIsImV4cCI6MjA5ODA0MDQwMn0.nlW_x3Ld6DQsJa6VdtWaRH_owCuq0Tbs9pAJpVz4Pek';

var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
