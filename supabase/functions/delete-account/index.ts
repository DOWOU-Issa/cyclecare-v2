// supabase/functions/delete-account/index.ts
// Déjà déployée sur le projet dszfylxtvytuwtvrpger.
// Supprime DÉFINITIVEMENT le compte de l'utilisatrice connectée :
// user_data, bot_usage et le compte d'authentification (RGPD).
// Nécessite la clé service role (fournie automatiquement par Supabase).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://dowou-issa.github.io',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
]

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  // Electron (file://) envoie Origin "null" : autorisé car le JWT reste obligatoire
  const allow = ALLOWED_ORIGINS.includes(origin) || origin === 'null' || origin === '' ? (origin || '*') : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifiée.' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Session invalide.' }, 401)

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')
    if (!serviceKey) return json({ error: 'Configuration serveur incomplète.' }, 503)
    const admin = createClient(url, serviceKey)

    const d1 = await admin.from('user_data').delete().eq('user_id', user.id)
    if (d1.error) throw d1.error
    const d2 = await admin.from('bot_usage').delete().eq('user_id', user.id)
    if (d2.error) throw d2.error
    const d3 = await admin.auth.admin.deleteUser(user.id)
    if (d3.error) throw d3.error

    return json({ ok: true })
  } catch (err) {
    console.error('delete-account error:', err)
    return json({ error: 'Suppression impossible pour le moment.' }, 500)
  }
})
