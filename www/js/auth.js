/* =============================================
   js/auth.js — Authentification Supabase (corrigé)
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

  if(App.state.authMode==='login') {
    db.auth.signInWithPassword({email:email,password:pass}).then(function(res){
      if(res.error){showAuthErr(translateAuthError(res.error.message));setAuthLoading(false);return;}
      onSignedIn(res.data.user);
    }).catch(function(){showAuthErr('Erreur de connexion.');setAuthLoading(false);});
  } else {
    var name=((document.getElementById('a-name')||{}).value||'').trim();
    var conf=(document.getElementById('a-conf')||{}).value||'';
    if(!name){showAuthErr('Veuillez entrer votre prénom.');setAuthLoading(false);return;}
    if(pass!==conf){showAuthErr('Les mots de passe ne correspondent pas.');setAuthLoading(false);return;}
    db.auth.signUp({email:email,password:pass}).then(function(res){
      if(res.error){showAuthErr(translateAuthError(res.error.message));setAuthLoading(false);return;}
      var uid=res.data.user.id;
      var u=newUser(name,email,uid);
      db.from('user_data').insert({
        user_id: uid,
        name: u.name,
        cycle_len: u.cycleLen,
        period_dur: u.periodDur,
        periods: [],
        rapports: [],
        symptoms: [],
        medications: [],
        notif_prefs: u.notifPrefs,
        updated_at: u.updatedAt
      }).then(function(){
        App.data.uid=uid; App.data.users[uid]=u; saveLocal(App.data);
        App.state.screen='onboarding'; App.state.onboardingStep=1;
        App.state.syncStatus='ok'; render();
      });
    }).catch(function(){showAuthErr('Erreur lors de la création du compte.');setAuthLoading(false);});
  }
}

function onSignedIn(supaUser) {
  var uid = supaUser.id;
  if (!App.data.users[uid]) {
    App.data.users[uid] = newUser(supaUser.email.split('@')[0], supaUser.email, uid);
  }
  App.data.users[uid].email = supaUser.email;
  App.data.uid = uid;

  pullFromSupabase(uid, function(row, err) {
    if (row && !err) {
      mergeRemoteData(uid, row);
    } else {
      setSyncStatus('error');
      saveLocal(App.data);
    }
    App.state.screen = needsOnboarding() ? 'onboarding' : 'accueil';
    App.state.onboardingStep = 1;
    App.state.syncStatus = err ? 'error' : 'ok';
    render();
  });
}

function translateAuthError(msg) {
  if(!msg) return 'Erreur inconnue.';
  if(msg.includes('Invalid login')||msg.includes('invalid_credentials')) return 'Email ou mot de passe incorrect.';
  if(msg.includes('already registered')||msg.includes('already been registered')) return 'Cet email est déjà utilisé.';
  if(msg.includes('network')) return 'Problème de connexion internet.';
  return msg;
}

function logout() {
  db.auth.signOut().then(function(){
    App.data.uid=null; saveLocal(App.data);
    App.state.screen='auth'; App.state.authMode='login'; closeModal(); render();
  });
}
