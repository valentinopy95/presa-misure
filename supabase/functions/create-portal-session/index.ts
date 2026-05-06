// @ts-nocheck
import Stripe from 'npm:stripe@^14';
import { createClient } from 'npm:@supabase/supabase-js@^2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401, headers: CORS });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'Nessuna azienda' }), { status: 400, headers: CORS });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', profile.company_id)
      .single();

    if (!company?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Nessun customer Stripe' }), { status: 400, headers: CORS });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   company.stripe_customer_id,
      return_url: 'https://misu.pro',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
