/* =============================================
   js/bot.js — Assistant IA via proxy Supabase
   =============================================
   Architecture sécurisée :
     App → Supabase Edge Function → Gemini API
   La clé Gemini est stockée comme secret côté
   serveur. Elle n'apparaît JAMAIS dans le code
   frontend. Seules les utilisatrices connectées
   (JWT Supabase valide) peuvent appeler le bot.
   ============================================= */

var BotState = {
  messages: [],
  loading:  false,
  error:    null,
  usageToday: null   /* compteur affiché en bas du chat */
};

/* URL de la Edge Function — construite depuis la config Supabase déjà chargée */
function getBotProxyUrl() {
  return SUPABASE_URL + '/functions/v1/gemini-proxy';
}

/* =============================================
   PROMPT SYSTÈME — contexte utilisatrice
   Injecté côté client (pas de données sensibles
   non chiffrées : le JWT protège la requête).
   ============================================= */
function buildSystemPrompt() {
  var u   = getUser();
  var lp  = getLastPeriod();
  var cl  = getCycleLen();
  var pd  = getPeriodDur();
  var today = todayStr();

  var ctx = 'Données du cycle de cette utilisatrice :\n';
  if (lp) {
    var zone = getZone(today, lp.start, cl);
    var zi   = zone ? ZONE_INFO[zone] : null;
    var cd   = getCycleDay(today, lp.start, cl);
    var dup  = getDaysUntilPeriod(lp.start, cl);
    var rel  = computeCycleReliability();
    ctx += '- Date du jour : '         + fmtDate(today)    + '\n';
    ctx += '- Dernières règles : '      + fmtDate(lp.start) + (lp.end ? ', fin le ' + fmtDate(lp.end) : ', en cours') + '\n';
    ctx += '- Durée du cycle : '        + cl  + ' jours\n';
    ctx += '- Durée des règles : '      + pd  + ' jours\n';
    ctx += '- Jour du cycle actuel : J' + cd  + '\n';
    ctx += '- Phase : '                 + (zi ? zi.lbl : 'inconnue') + '\n';
    ctx += '- Prochaines règles : '     + (dup >= 0 ? 'dans ' + dup + ' j' : Math.abs(dup) + ' j de retard') + '\n';
    ctx += '- Régularité : '            + rel.label + (rel.avgLen ? ' (moy. ' + rel.avgLen + ' j)' : '') + '\n';
  } else {
    ctx += '- Aucune donnée de cycle enregistrée.\n';
  }

  var recentMeds = (u && u.medications || []).filter(function(m) {
    return diffDays(m.date, today) >= 0 && diffDays(m.date, today) <= 30;
  });
  if (recentMeds.length) {
    ctx += '- Médicaments récents : ' + recentMeds.map(function(m) {
      return (m.name || m.type) + ' le ' + fmtDate(m.date);
    }).join(', ') + '\n';
  }

  var unprotected = (u && u.rapports || []).filter(function(r) {
    return !r.protected && diffDays(r.date, today) >= 0 && diffDays(r.date, today) <= 30;
  });
  if (unprotected.length) {
    ctx += '- Rapports non protégés (30j) : ' + unprotected.length
      + ' (' + unprotected.map(function(r) { return fmtDate(r.date); }).join(', ') + ')\n';
  }

  var recentSym = (u && u.symptoms || []).filter(function(s) {
    return diffDays(s.date, today) >= 0 && diffDays(s.date, today) <= 14;
  });
  if (recentSym.length) {
    ctx += '- Symptômes récents : ' + recentSym.map(function(s) {
      return (s.items || []).join(', ') + ' (' + fmtDate(s.date) + ')';
    }).join(' ; ') + '\n';
  }

  var risk = calcRisk();
  if (risk && risk.level !== 'none') {
    ctx += '- Risque grossesse calculé : ' + risk.level + '\n';
  }

  return 'Tu es l\'assistante santé de CycleCare, spécialisée en santé menstruelle et reproductive.\n\n'
    + 'RÈGLES :\n'
    + '1. Réponds UNIQUEMENT aux questions sur : cycle, règles, contraception, symptômes menstruels, ovulation, grossesse, santé gynécologique.\n'
    + '2. Si le sujet ne concerne pas la santé féminine, dis poliment que tu ne peux pas aider sur ce sujet.\n'
    + '3. Jamais de diagnostic définitif — informe et recommande un professionnel si besoin.\n'
    + '4. Français clair, bienveillant, sans jugement. Réponses de 3 à 6 phrases sauf si plus est nécessaire.\n'
    + '5. Utilise les données du cycle pour personnaliser tes réponses sans les répéter inutilement.\n\n'
    + ctx + '\n'
    + 'Prénom : ' + ((u && u.name) || 'utilisatrice') + '\n';
}

/* =============================================
   APPEL VERS LA EDGE FUNCTION (proxy sécurisé)
   ============================================= */
async function callBotProxy(userMessage) {
  /* Récupérer la session Supabase pour le JWT */
  var sessionRes = await db.auth.getSession();
  var session    = sessionRes.data && sessionRes.data.session;
  if (!session) throw new Error('NOT_AUTHENTICATED');

  /* Construire l'historique de conversation pour Gemini */
  var history = [
    { role: 'user',  parts: [{ text: buildSystemPrompt() }] },
    { role: 'model', parts: [{ text: 'Bien compris, je suis prête.' }] }
  ];

  /* Garder les 10 derniers messages (tokens limités sur tier gratuit) */
  BotState.messages.slice(-10).forEach(function(msg) {
    history.push({
      role:  msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  history.push({ role: 'user', parts: [{ text: userMessage }] });

  var body = {
    contents: history,
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 600,
      topP:            0.9
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  };

  var response = await fetch(getBotProxyUrl(), {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + session.access_token  /* JWT Supabase — prouve l'identité */
    },
    body: JSON.stringify(body)
  });

  /* Lire la réponse */
  var data = await response.json().catch(function() { return {}; });

  if (!response.ok) {
    /* L'Edge Function renvoie { error: "..." } sur les erreurs */
    throw new Error(data.error || 'ERREUR_' + response.status);
  }

  var candidate = data.candidates && data.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    throw new Error('Réponse vide du service IA.');
  }
  return candidate.content.parts.map(function(p) { return p.text || ''; }).join('');
}

/* =============================================
   ACTIONS DE L'INTERFACE
   ============================================= */
async function botSend() {
  var inp  = document.getElementById('bot-input');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text || BotState.loading) return;

  inp.value = '';
  inp.style.height = 'auto';

  BotState.messages.push({ role: 'user', text: text, ts: Date.now() });
  BotState.loading = true;
  BotState.error   = null;
  renderBotMessages();
  scrollBotToBottom();

  try {
    var reply = await callBotProxy(text);
    BotState.messages.push({ role: 'model', text: reply, ts: Date.now() });
    BotState.error = null;
  } catch(e) {
    /* Remettre le message en cas d'erreur */
    BotState.messages.pop();
    inp.value = text;
    BotState.error = e.message || 'Erreur de connexion. Vérifiez votre accès internet.';
  }

  BotState.loading = false;
  renderBotMessages();
  scrollBotToBottom();
}

function botInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); botSend(); }
}

function botAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function clearBotHistory() {
  if (!confirm('Effacer toute la conversation ?')) return;
  BotState.messages = [];
  BotState.error    = null;
  renderBotMessages();
}

function scrollBotToBottom() {
  setTimeout(function() {
    var area = document.getElementById('bot-messages');
    if (area) area.scrollTop = area.scrollHeight;
  }, 50);
}

/* =============================================
   RENDU DU CHAT
   ============================================= */
var BOT_SUGGESTIONS = [
  'Mes règles ont du retard, est-ce normal ?',
  'Comment réduire les crampes naturellement ?',
  'J\'ai pris EllaOne, quand auront lieu mes prochaines règles ?',
  'Comment savoir si j\'ovule ?',
  'Est-ce que je peux être enceinte ?',
  'Pourquoi mes règles sont irrégulières ?',
  'Quels aliments aident pendant les règles ?',
];

function useSuggestion(text) {
  var inp = document.getElementById('bot-input');
  if (inp) { inp.value = text; inp.focus(); }
}

function renderBot() {
  var html = '<div id="bot-messages" class="bot-messages">';

  if (!BotState.messages.length && !BotState.loading && !BotState.error) {
    html += renderBotWelcome();
  } else {
    html += renderBotMessageList();
    if (BotState.loading) {
      html += '<div class="bot-msg bot-msg-model">'
        + '<div class="bot-avatar"><i class="ti ti-sparkles" aria-hidden="true"></i></div>'
        + '<div class="bot-bubble bot-bubble-model bot-typing"><span></span><span></span><span></span></div></div>';
    }
    if (BotState.error) {
      html += '<div class="bot-error"><i class="ti ti-alert-circle" aria-hidden="true"></i> ' + esc(BotState.error) + '</div>';
    }
  }

  html += '</div>'; /* fin bot-messages */

  /* Zone de saisie */
  html += '<div class="bot-input-area">'
    + '<div class="bot-input-row">'
    + '<textarea id="bot-input" class="bot-input-field" placeholder="Posez votre question..." rows="1" '
    + 'onkeydown="botInputKeydown(event)" oninput="botAutoResize(this)"></textarea>'
    + '<button class="btn btn-primary bot-send-btn" onclick="botSend()" aria-label="Envoyer">'
    + '<i class="ti ti-send" aria-hidden="true"></i></button>'
    + '</div>'
    + (BotState.messages.length > 0
        ? '<button class="bot-clear-btn" onclick="clearBotHistory()"><i class="ti ti-trash" aria-hidden="true"></i> Effacer la conversation</button>'
        : '')
    + '<div class="bot-quota-note">Propulsé par Google Gemini · 50 questions/jour incluses</div>'
    + '</div>';

  return html;
}

function renderBotWelcome() {
  var u    = getUser();
  var lp   = getLastPeriod();
  var zone = lp ? getZone(todayStr(), lp.start, getCycleLen()) : null;
  var zi   = zone ? ZONE_INFO[zone] : null;

  return '<div class="bot-welcome">'
    + '<div class="bot-welcome-icon"><i class="ti ti-sparkles" aria-hidden="true"></i></div>'
    + '<div class="bot-welcome-title">Bonjour, ' + esc((u && u.name) || '') + '</div>'
    + '<div class="bot-welcome-sub">Je suis votre assistante santé. Je connais votre cycle et je réponds à vos questions sur la santé menstruelle, la contraception et le bien-être féminin.</div>'
    + (zi ? '<div style="text-align:center;margin-bottom:14px;"><span class="zone-chip ' + zi.chipCls + '">Phase actuelle : ' + zi.lbl + '</span></div>' : '')
    + '<div class="bot-suggestions-label">Questions fréquentes</div>'
    + '<div class="bot-suggestions">'
    + BOT_SUGGESTIONS.map(function(s) {
        return '<button class="bot-suggestion" onclick="useSuggestion(\'' + s.replace(/'/g, "\\'") + '\')">' + esc(s) + '</button>';
      }).join('')
    + '</div></div>';
}

function renderBotMessageList() {
  return BotState.messages.map(function(msg) {
    var isUser = msg.role === 'user';
    return '<div class="bot-msg ' + (isUser ? 'bot-msg-user' : 'bot-msg-model') + '">'
      + (isUser ? '' : '<div class="bot-avatar"><i class="ti ti-sparkles" aria-hidden="true"></i></div>')
      + '<div class="bot-bubble ' + (isUser ? 'bot-bubble-user' : 'bot-bubble-model') + '">'
      + formatBotText(msg.text)
      + '</div></div>';
  }).join('');
}

function renderBotMessages() {
  var area = document.getElementById('bot-messages');
  if (!area) return;
  if (!BotState.messages.length && !BotState.loading && !BotState.error) {
    area.innerHTML = renderBotWelcome(); return;
  }
  var html = renderBotMessageList();
  if (BotState.loading) {
    html += '<div class="bot-msg bot-msg-model">'
      + '<div class="bot-avatar"><i class="ti ti-sparkles" aria-hidden="true"></i></div>'
      + '<div class="bot-bubble bot-bubble-model bot-typing"><span></span><span></span><span></span></div></div>';
  }
  if (BotState.error) {
    html += '<div class="bot-error"><i class="ti ti-alert-circle" aria-hidden="true"></i> ' + esc(BotState.error) + '</div>';
  }
  area.innerHTML = html;
}

/* Markdown basique → HTML */
function formatBotText(text) {
  if (!text) return '';
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

/* Section dans Paramètres — juste une info, plus de champ clé */
function renderBotSettingsSection() {
  return '<div class="sec-title">Assistant IA</div>'
    + '<div class="settings-card">'
    + '<div class="settings-row">'
    + '<i class="ti ti-sparkles settings-row-icon" aria-hidden="true"></i>'
    + '<div class="settings-row-info">'
    + '<div class="settings-row-label">Propulsé par Google Gemini</div>'
    + '<div class="settings-row-desc">L\'assistant est inclus gratuitement · 50 questions/jour · Aucune configuration requise</div>'
    + '</div></div>'
    + '<div class="settings-row">'
    + '<i class="ti ti-shield-check settings-row-icon" aria-hidden="true"></i>'
    + '<div class="settings-row-info">'
    + '<div class="settings-row-label">Confidentialité</div>'
    + '<div class="settings-row-desc">Vos questions transitent par un serveur sécurisé. Aucune donnée n\'est conservée par Google au-delà du traitement de la requête.</div>'
    + '</div></div></div>';
}
