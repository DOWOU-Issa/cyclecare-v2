/* =============================================
   js/auth.js — Authentification Supabase
   ============================================= */
function renderAuth() {
  var isLogin = App.state.authMode==='login';
  var isReset = App.state.authMode==='reset';
  var isResetConfirm = App.state.authMode==='reset-confirm';
  
  if (isReset) {
    return renderResetPassword();
  }
  
  if (isResetConfirm) {
    return renderResetPasswordConfirm();
  }
  
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
    +(isLogin?'<div class="auth-forgot"><span onclick="toggleAuthMode(\'reset\')">Mot de passe oublié ?</span></div>':'')
    +'<div class="auth-toggle">'+(isLogin?'Pas encore de compte ?':'Déjà un compte ?')
    +' <span onclick="toggleAuthMode()">'+(isLogin?'Créer un compte':'Se connecter')+'</span></div>'
    +'</div></div>';
}

function toggleAuthMode(mode) {
  if (mode) {
    App.state.authMode = mode;
  } else {
    App.state.authMode = App.state.authMode==='login'?'register':'login';
  }
  render();
}

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
    
    // Validation de complexité uniquement pour les nouveaux comptes
    var passwordValidation = validatePasswordStrength(pass);
    if(!passwordValidation.valid){
      showAuthErr(passwordValidation.message);
      setAuthLoading(false);
      clearTimeout(authTimeout);
      return;
    }
    
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

/* =============================================
   Réinitialisation du mot de passe
   ============================================= */

function renderResetPassword() {
  return '<div class="auth-page">'
    +'<div class="auth-brand">'
    +'<div class="auth-brand-icon"><i class="ti ti-heart-filled" aria-hidden="true"></i></div>'
    +'<div class="auth-brand-name">CycleCare</div>'
    +'</div>'
    +'<div class="auth-sub">Réinitialisation du mot de passe</div>'
    +'<div class="auth-card">'
    +'<div class="auth-card-title">Mot de passe oublié ?</div>'
    +'<div id="auth-err" class="err-box" role="alert"></div>'
    +'<div class="form-grp"><label class="lbl" for="reset-email">Adresse email</label>'
    +'<input class="inp" type="email" id="reset-email" placeholder="marie@exemple.com" autocomplete="email"/></div>'
    +'<button class="btn btn-primary btn-full" id="reset-btn" onclick="requestPasswordReset()">'
    +'<i class="ti ti-mail" aria-hidden="true"></i> Envoyer le lien de réinitialisation</button>'
    +'<div class="auth-toggle"><span onclick="toggleAuthMode(\'login\')">Retour à la connexion</span></div>'
    +'</div></div>';
}

function renderResetPasswordConfirm() {
  return '<div class="auth-page">'
    +'<div class="auth-brand">'
    +'<div class="auth-brand-icon"><i class="ti ti-heart-filled" aria-hidden="true"></i></div>'
    +'<div class="auth-brand-name">CycleCare</div>'
    +'</div>'
    +'<div class="auth-sub">Définir votre nouveau mot de passe</div>'
    +'<div class="auth-card">'
    +'<div class="auth-card-title">Nouveau mot de passe</div>'
    +'<div id="auth-err" class="err-box" role="alert"></div>'
    +'<div class="form-grp"><label class="lbl" for="new-pass">Nouveau mot de passe</label>'
    +'<input class="inp" type="password" id="new-pass" placeholder="Au moins 6 caractères" autocomplete="new-password"/></div>'
    +'<div class="form-grp"><label class="lbl" for="new-conf">Confirmer le mot de passe</label>'
    +'<input class="inp" type="password" id="new-conf" placeholder="••••••••" autocomplete="new-password"/></div>'
    +'<button class="btn btn-primary btn-full" id="reset-confirm-btn" onclick="confirmPasswordReset()">'
    +'<i class="ti ti-check" aria-hidden="true"></i> Mettre à jour le mot de passe</button>'
    +'<div class="auth-toggle"><span onclick="toggleAuthMode(\'login\')">Retour à la connexion</span></div>'
    +'</div></div>';
}

function requestPasswordReset() {
  var email = ((document.getElementById('reset-email')||{}).value||'').trim().toLowerCase();
  if(!email){showAuthErr('Veuillez entrer votre adresse email.');return;}
  
  setAuthLoading(true);
  
  var resetTimeout = setTimeout(function(){
    setAuthLoading(false);
    showAuthErr('La demande prend trop de temps. Vérifiez votre internet et réessayez.');
  }, 30000);
  
  db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  }).then(function(res){
    clearTimeout(resetTimeout);
    if(res.error){
      showAuthErr(translateAuthError(res.error.message));
      setAuthLoading(false);
      return;
    }
    showAuthErr('Un email de réinitialisation a été envoyé à ' + email + '. Vérifiez votre boîte de réception.');
    setAuthLoading(false);
  }).catch(function(err){
    clearTimeout(resetTimeout);
    showAuthErr(translateAuthError(err.message || 'Erreur lors de la demande de réinitialisation.'));
    setAuthLoading(false);
  });
}

function confirmPasswordReset() {
  var newPass = (document.getElementById('new-pass')||{}).value||'';
  var newConf = (document.getElementById('new-conf')||{}).value||'';
  
  if(!newPass || newPass.length < 6){
    showAuthErr('Le mot de passe doit contenir au moins 6 caractères.');
    return;
  }
  if(newPass !== newConf){
    showAuthErr('Les mots de passe ne correspondent pas.');
    return;
  }
  
  setAuthLoading(true);
  
  var resetTimeout = setTimeout(function(){
    setAuthLoading(false);
    showAuthErr('La mise à jour prend trop de temps. Vérifiez votre internet et réessayez.');
  }, 30000);
  
  db.auth.updateUser({
    password: newPass
  }).then(function(res){
    clearTimeout(resetTimeout);
    if(res.error){
      showAuthErr(translateAuthError(res.error.message));
      setAuthLoading(false);
      return;
    }
    showAuthErr('Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.');
    setTimeout(function(){
      toggleAuthMode('login');
    }, 2000);
  }).catch(function(err){
    clearTimeout(resetTimeout);
    showAuthErr(translateAuthError(err.message || 'Erreur lors de la mise à jour du mot de passe.'));
    setAuthLoading(false);
  });
}

/* =============================================
   Changement d'email (utilisateur connecté)
   ============================================= */

function renderChangeEmail() {
  var u = getUser();
  if(!u) return '';
  
  return '<div class="modal-overlay" onclick="closeModal()"><div class="modal-box" onclick="event.stopPropagation()">'
    +'<div class="modal-header">'
    +'<div class="modal-title">Changer mon email</div>'
    +'<button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button>'
    +'</div>'
    +'<div class="modal-body">'
    +'<div id="change-email-err" class="err-box" role="alert"></div>'
    +'<div class="form-grp"><label class="lbl">Email actuel</label>'
    +'<input class="inp" type="email" id="current-email" value="'+(u.email||'')+'" disabled/></div>'
    +'<div class="form-grp"><label class="lbl" for="new-email">Nouvel email</label>'
    +'<input class="inp" type="email" id="new-email" placeholder="nouveau@email.com" autocomplete="email"/></div>'
    +'<div class="form-grp"><label class="lbl" for="email-pass">Mot de passe actuel</label>'
    +'<input class="inp" type="password" id="email-pass" placeholder="Confirmez avec votre mot de passe" autocomplete="current-password"/></div>'
    +'<button class="btn btn-primary btn-full" id="change-email-btn" onclick="doChangeEmail()">'
    +'<i class="ti ti-mail"></i> Changer mon email</button>'
    +'</div></div></div>';
}

function doChangeEmail() {
  var newEmail = ((document.getElementById('new-email')||{}).value||'').trim().toLowerCase();
  var password = (document.getElementById('email-pass')||{}).value||'';
  var u = getUser();
  
  if(!newEmail){showChangeEmailErr('Veuillez entrer votre nouvel email.');return;}
  if(newEmail === (u.email||'')){showChangeEmailErr('Le nouvel email doit être différent de l\'actuel.');return;}
  if(!password){showChangeEmailErr('Veuillez entrer votre mot de passe actuel.');return;}
  
  setChangeEmailLoading(true);
  
  var changeTimeout = setTimeout(function(){
    setChangeEmailLoading(false);
    showChangeEmailErr('Le changement prend trop de temps. Vérifiez votre internet et réessayez.');
  }, 30000);
  
  // D'abord vérifier le mot de passe actuel
  db.auth.signInWithPassword({
    email: u.email,
    password: password
  }).then(function(signInRes){
    if(signInRes.error){
      clearTimeout(changeTimeout);
      showChangeEmailErr('Mot de passe incorrect.');
      setChangeEmailLoading(false);
      return;
    }
    
    // Ensuite changer l'email
    db.auth.updateUser({
      email: newEmail
    }).then(function(updateRes){
      clearTimeout(changeTimeout);
      if(updateRes.error){
        showChangeEmailErr(translateAuthError(updateRes.error.message));
        setChangeEmailLoading(false);
        return;
      }
      
      // Mettre à jour les données locales
      u.email = newEmail;
      saveLocal(App.data);
      
      showChangeEmailErr('Email changé avec succès ! Un email de confirmation a été envoyé à ' + newEmail);
      setTimeout(function(){
        closeModal();
        render();
      }, 2000);
    }).catch(function(err){
      clearTimeout(changeTimeout);
      showChangeEmailErr(translateAuthError(err.message || 'Erreur lors du changement d\'email.'));
      setChangeEmailLoading(false);
    });
  }).catch(function(err){
    clearTimeout(changeTimeout);
    showChangeEmailErr('Erreur de vérification du mot de passe.');
    setChangeEmailLoading(false);
  });
}

function showChangeEmailErr(msg) {
  var e = document.getElementById('change-email-err');
  if(e){
    e.textContent = msg;
    e.style.display = 'block';
  }
}

function setChangeEmailLoading(on) {
  var btn = document.getElementById('change-email-btn');
  if(!btn) return;
  btn.disabled = on;
  btn.innerHTML = on ? '<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i> Chargement...' 
    : '<i class="ti ti-mail"></i> Changer mon email';
}

/* =============================================
   Validation de la complexité du mot de passe
   ============================================= */

function validatePasswordStrength(password) {
  if(!password || password.length < 6){
    return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' };
  }
  
  var hasUpperCase = /[A-Z]/.test(password);
  var hasLowerCase = /[a-z]/.test(password);
  var hasNumbers = /\d/.test(password);
  var hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  var strengthCount = 0;
  if(hasUpperCase) strengthCount++;
  if(hasLowerCase) strengthCount++;
  if(hasNumbers) strengthCount++;
  if(hasSpecialChar) strengthCount++;
  
  if(strengthCount < 2){
    return { 
      valid: false, 
      message: 'Le mot de passe doit contenir au moins 2 des éléments suivants : majuscules, minuscules, chiffres, caractères spéciaux.' 
    };
  }
  
  return { valid: true, strength: strengthCount };
}
