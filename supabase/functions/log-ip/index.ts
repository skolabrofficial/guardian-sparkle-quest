import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[log-ip] start, hasAuth=', !!authHeader);
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[log-ip] missing Bearer header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    // Use getUser which is reliable across SDK versions
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user) {
      console.log('[log-ip] getUser failed', uErr?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized', detail: uErr?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const ua = req.headers.get('user-agent') || '';
    console.log('[log-ip] user', userId, 'ip', ip);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: last } = await admin
      .from('user_ip_log')
      .select('ip_address')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last || last.ip_address !== ip) {
      const { error: insErr } = await admin.from('user_ip_log').insert({ user_id: userId, ip_address: ip, user_agent: ua });
      if (insErr) {
        console.log('[log-ip] insert error', insErr.message);
        return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      console.log('[log-ip] inserted new entry');
    } else {
      console.log('[log-ip] same as last, skip');
    }

    return new Response(JSON.stringify({ ok: true, ip, userId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.log('[log-ip] exception', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
