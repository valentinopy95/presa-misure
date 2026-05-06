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

    // Autenticazione
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401, headers: CORS });
    }

    const { plan, period } = await req.json() as { plan: 'base' | 'pro'; period: 'monthly' | 'yearly' };

    // Price IDs configurati come env vars in Supabase
    const PRICE_IDS: Record<string, string> = {
      base_monthly: Deno.env.get('STRIPE_PRICE_BASE_MONTHLY')!,
      base_yearly:  Deno.env.get('STRIPE_PRICE_BASE_YEARLY')!,
      pro_monthly:  Deno.env.get('STRIPE_PRICE_PRO_MONTHLY')!,
      pro_yearly:   Deno.env.get('STRIPE_PRICE_PRO_YEARLY')!,
    };

    const priceId = PRICE_IDS[`${plan}_${period}`];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Piano non valido' }), { status: 400, headers: CORS });
    }

    // Azienda dell'utente
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'Nessuna azienda associata' }), { status: 400, headers: CORS });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id, name')
      .eq('id', profile.company_id)
      .single();

    // Crea o riusa customer Stripe
    let customerId: string = company?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     company?.name ?? '',
        metadata: { company_id: profile.company_id },
      });
      customerId = customer.id;
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.company_id);
    }

    // Crea sessione checkout
    const session = await stripe.checkout.sessions.create({
      customer:  customerId,
      mode:      'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://misu.pro?payment=success',
      cancel_url:  'https://misu.pro?payment=cancelled',
      metadata: { company_id: profile.company_id },
      subscription_data: {
        metadata: { company_id: profile.company_id, plan },
      },
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
