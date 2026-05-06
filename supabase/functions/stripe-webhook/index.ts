// @ts-nocheck
import Stripe from 'npm:stripe@^14';
import { createClient } from 'npm:@supabase/supabase-js@^2';

Deno.serve(async (req) => {
  // Stripe chiama il webhook senza JWT — rispondi subito alle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const sig  = req.headers.get('stripe-signature');
  const body = await req.text();

  if (!sig) {
    return new Response('Firma mancante', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (err: any) {
    console.error('Firma non valida:', err.message);
    return new Response(`Firma non valida: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        if (!companyId || !session.subscription) break;

        const sub  = await stripe.subscriptions.retrieve(session.subscription as string);
        const plan = (sub.metadata?.plan as 'base' | 'pro') ?? 'base';

        await supabase.from('companies').update({
          plan,
          subscription_status:    'active',
          stripe_subscription_id: sub.id,
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', companyId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub       = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        const status: string =
          sub.status === 'active'   ? 'active'   :
          sub.status === 'past_due' ? 'past_due'  : 'canceled';

        await supabase.from('companies').update({
          subscription_status: status,
          current_period_end:  new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', companyId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub       = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        await supabase.from('companies').update({
          plan:                    'free',
          subscription_status:     'canceled',
          stripe_subscription_id:  null,
          current_period_end:      null,
        }).eq('id', companyId);
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook error:', err.message);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
