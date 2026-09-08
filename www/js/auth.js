/* =============================================
   js/auth.js — Authentification Supabase
   ============================================= */
function renderAuth() {
  var isLogin = App.state.authMode==='login';
  return '<div class="auth-page">'
    +'<div class="auth-brand">'
    +'<div class="auth-brand-icon"><i class="ti ti-heart-filled" aria-hidden="true"></i></div>'
    +'<div class="auth-brand-name">CycleCare</div>'
    +'</div>'
    +'<div class="auth-sub">Suivi du cycle menstruel — confidentiel et gratuit</div>'
    +'<div class="auth-card">'
    +'<div class="auth-card-title">'+(isLogin?'Connexion':'Créer un compte')+'</div>'
    +'<div id="auth-err" class="err-box" role="alert"></div>'
    +(!isLogin?'<div class="form-grp"><label class="lbl" for="a-name">Prénom</label>'
      +'<input class="inp" type="text" id="a-name" placeholder="Marie" autocomplete="given-name"/></div>':'')
    +'<div class="form-grp"><label class="lbl" for="a-email">Adresse email</label>'
    +'<input class="inp" type="email" id="a-email" placeholder="marie@exemple.com" autocomplete="email"/></div>'
    +'<div class="form-grp"><label class="lbl" for="a-pass">Mot de passe</label>'
    +'<input class="inp" type="password" id="a-pass" placeholder="Au moins 6 caractères" autocomplete="'+(isLogin?'current-password':'new-password')+'"/></div>'
    +(!isLogin?'<div class="form-grp"><label class="lbl" for="a-conf">Confirmer le mot de passe</label>'
      +'<input class="inp" type="password" id="a-conf" placeholder="••••••••" autocomplete="new-password"/></div>':'')
    +'<button class="btn btn-primary btn-full" id="auth-btn" onclick="doAuth()">'
    +'<i class="ti ti-'+(isLogin?'login':'user-plus')+'" aria-hidden="true"></i> '
    +(isLogin?'Se connecter':'Créer mon compte')+'</button>'
    +'<div class="auth-toggle">'+(isLogin?'Pas encore de compte ?':'Déjà un compte ?')
    +' <span onclick="toggleAuthMode()">'+(isLogin?'Créer un compte':'Se connecter')+'</span></div>'
    +'</div></div>';
}

function toggleAuthMode() { App.state.authMode=App.state.authMode==='login'?'register':'login'; render(); }

function setAuthLoading(on) {
  var btn=document.getElementById('auth-btn'); if(!btn) return;
  btn.disabled=on;
  btn.innerHTML=on?'<i class="ti ti-loader-2" style="animation:spin .8s linear infinite" aria-hidden="true"></i> Chargement...'
    :('<i class="ti ti-'+(App.state.authMode==='login'?'login':'user-plus')+'" aria-hidden="true"></i> '
      +(App.state.authMode==='login'?'Se connecter':'Créer mon compte'));
}

function showAuthErr(msg) { var e=document.getElementById('auth-err'); if(e){e.textContent=msg;e.style.display='block';} }

function doAuth() {
  var email=((document.getElementById('a-email')||{}).value||'').trim().toLowerCase();
  var pass=(document.getElementById('a-pass')||{}).value||'';
  if(!email||!pass){showAuthErr('Veuillez remplir tous les champs.');return;}
  if(pass.length<6){showAuthErr('Mot de passe : 6 caractères minimum.');return;}
  setAuthLoading(true);

  /* Timeout de 30 secondes pour éviter un chargement infini */
  var authTimeout = setTimeout(function(){
    setAuthLoading(false);
    showAuthErr('La connexion prend trop de temps. Vérifiez votre internet et réessayez.');
  }, 30000);

  if(App.state.authMode==='login') {
    db.auth.signInWithPassword({email:email,password:pass}).then(function(res){
      clearTimeout(authTimeout);
      if(res.error){showAuthErr(translateAuthError(res.error.message));setAuthLoading(false);return;}
      onSignedIn(res.data.user);
    }).catch(function(err){
      clearTimeout(authTimeout);
      showAuthErr(translateAuthError(err.message || 'Erreur de connexion.'));
      setAuthLoading(false);
    });
  } else {
    var name=((document.getElementById('a-name')||{}).value||'').trim();
    var conf=(document.getElementById('a-conf')||{}).value||'';
    if(!name){showAuthErr('Veuillez entrer votre prénom.');setAuthLoading(false);clearTimeout(authTimeout);return;}
    if(pass!==conf){showAuthErr('Les mots de passe ne correspondent pas.');setAuthLoading(false);clearTimeout(authTimeout);return;}
    db.auth.signUp({email:email,password:pass}).then(function(res){
      clearTimeout(authTimeout);
      if(res.error){showAuthErr(translateAuthError(res.error.message));setAuthLoading(false);return;}
      var uid=res.data.user.id;
      var u=newUser(name,email,uid);
      db.from('user_data').insert({
        user_id:uid,name:u.name,cycle_len:u.cycleLen,period_dur:u.periodDur,
        periods:[],rapports:[],symptoms:[],medications:[]
      }).then(function(){
        App.data.uid=uid; App.data.users[uid]=u; saveLocal(App.data);
        /* → onboarding obligatoire pour les nouveaux comptes */
        App.state.screen='onboarding'; App.state.onboardingStep=1;
        App.state.syncStatus='ok'; render();
      }).catch(function(err){
        showAuthErr('Erreur lors de la création du compte: ' + (err.message || 'Veuillez réessayer.'));
        setAuthLoading(false);
      });
    }).catch(function(err){
      clearTimeout(authTimeout);
      showAuthErr(translateAuthError(err.message || 'Erreur lors de la création du compte.'));
      setAuthLoading(false);
    });
  }
}

function onSignedIn(supaUser) {
  pullFromSupabase(supaUser.id, function(row) {
    var uid=supaUser.id; var u;
    if(row) {
      u={id:uid,name:row.name,email:supaUser.email,
         cycleLen:row.cycle_len||28,periodDur:row.period_dur||5,
         avatarColor:row.avatar_color||'#8b2252',onboardingDone:true,
         periods:row.periods||[],rapports:row.rapports||[],
         symptoms:row.symptoms||[],medications:row.medications||[],
         createdAt:row.created_at?row.created_at.split('T')[0]:todayStr()};
    } else {
      u=newUser(supaUser.email.split('@')[0],supaUser.email,uid);
    }
    App.data.uid=uid; App.data.users[uid]=u; saveLocal(App.data);
    App.state.screen=needsOnboarding()?'onboarding':'accueil';
    App.state.onboardingStep=1; App.state.syncStatus='ok'; render();
  });
}

function translateAuthError(msg) {
  if(!msg) return 'Erreur inconnue.';
  if(msg.includes('Invalid login')||msg.includes('invalid_credentials')||msg.includes('Invalid email or password')) return 'Email ou mot de passe incorrect.';
  if(msg.includes('User not found')||msg.includes('user_not_found')) return 'Aucun compte trouvé avec cet email.';
  if(msg.includes('already registered')||msg.includes('already been registered')) return 'Cet email est déjà utilisé.';
  if(msg.includes('Password should be at least')||msg.includes('Password should be')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if(msg.includes('To signup, please provide your email')||msg.includes('email')) return 'Adresse email invalide.';
  if(msg.includes('network')||msg.includes('fetch')||msg.includes('Failed to fetch')) return 'Problème de connexion internet. Vérifiez votre connexion.';
  if(msg.includes('timeout')||msg.includes('timed out')) return 'La connexion a pris trop de temps. Réessayez.';
  return msg;
}

function logout() {
  db.auth.signOut().then(function(){
    App.data.uid=null; saveLocal(App.data);
    App.state.screen='auth'; App.state.authMode='login'; closeModal(); render();
  });
}
