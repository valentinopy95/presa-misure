import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://vhsfdvkuzqqlmpuucfbt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoc2Zkdmt1enFxbG1wdXVjZmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDk3NDYsImV4cCI6MjA5MTIyNTc0Nn0.2GZUKWmNj_c8hTKizXsL35wqbhpgmk1fMP5mAnTqhfw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
    flowType:           'pkce',
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Profile {
  id:         string;
  full_name:  string | null;
  company_id: string | null;
}

export type CompanyPlan      = 'free' | 'base' | 'pro';
export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled';

export interface Company {
  id:                    string;
  name:                  string;
  code:                  string;
  owner_id:              string;
  plan:                  CompanyPlan;
  subscription_status:   SubscriptionStatus;
  stripe_customer_id:    string | null;
  stripe_subscription_id: string | null;
  current_period_end:    string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Genera un codice azienda univoco es. "VLEN-3K2X" */
export function generateCompanyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(4)}-${part(4)}`;
}

/** Carica il profilo dell'utente corrente.
 *  Si risolve con null se la richiesta non arriva entro TIMEOUT_MS
 *  (evita loading infinito su rete assente/lenta all'avvio). */
export async function fetchProfile(userId: string, timeoutMs = 10000): Promise<Profile | null> {
  try {
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), timeoutMs)
    );
    const fetchPromise = supabase
      .from('profiles')
      .select('id, full_name, company_id')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => (error ? null : (data as Profile)));

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch {
    return null;
  }
}

/** Carica l'azienda tramite ID */
export async function fetchCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, code, owner_id, plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end')
    .eq('id', companyId)
    .single();
  if (error) return null;
  const c = data as any;
  return {
    ...c,
    plan: c.plan ?? 'free',
    subscription_status: c.subscription_status ?? 'free',
    stripe_customer_id: c.stripe_customer_id ?? null,
    stripe_subscription_id: c.stripe_subscription_id ?? null,
    current_period_end: c.current_period_end ?? null,
  } as Company;
}

/** Carica solo i campi piano/abbonamento di un'azienda */
export async function fetchCompanyPlan(companyId: string): Promise<Pick<Company, 'plan' | 'subscription_status' | 'current_period_end'> | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('plan, subscription_status, current_period_end')
    .eq('id', companyId)
    .single();
  if (error) return null;
  const c = data as any;
  return {
    plan: c.plan ?? 'free',
    subscription_status: c.subscription_status ?? 'free',
    current_period_end: c.current_period_end ?? null,
  };
}

/** Cerca azienda tramite codice */
export async function findCompanyByCode(code: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, code, owner_id')
    .eq('code', code.toUpperCase())
    .single();
  if (error) return null;
  return data as Company;
}

/** Crea una nuova azienda e associa l'utente */
export async function createCompany(userId: string, name: string): Promise<Company | null> {
  let code = generateCompanyCode();
  // Retry su collisione (raro)
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('companies')
      .insert({ name, code, owner_id: userId })
      .select()
      .single();
    if (!error && data) {
      await supabase.from('profiles').update({ company_id: data.id }).eq('id', userId);
      return data as Company;
    }
    code = generateCompanyCode();
  }
  return null;
}

/** Unisce l'utente a un'azienda esistente tramite codice */
export async function joinCompany(userId: string, code: string): Promise<Company | null> {
  const company = await findCompanyByCode(code);
  if (!company) return null;
  await supabase.from('profiles').update({ company_id: company.id }).eq('id', userId);
  return company;
}

// ─── Inviti ───────────────────────────────────────────────────────────────────

export interface CompanyInvite {
  id:             string;
  company_id:     string;
  invited_email:  string;
  created_at:     string;
}

/** Invia un invito via email a un collaboratore */
export async function inviteToCompany(companyId: string, invitedBy: string, email: string): Promise<'ok' | 'already_member' | 'already_invited' | 'error'> {
  const { error } = await supabase.from('company_invites').insert({
    company_id:    companyId,
    invited_by:    invitedBy,
    invited_email: email.toLowerCase().trim(),
  });

  if (error) {
    if (error.code === '23505') return 'already_invited';
    return 'error';
  }

  // Recupera dati per l'email
  try {
    const [companyRes, profileRes] = await Promise.all([
      supabase.from('companies').select('name').eq('id', companyId).single(),
      supabase.from('profiles').select('full_name').eq('id', invitedBy).single(),
    ]);
    const companyName    = companyRes.data?.name    ?? 'Azienda';
    const invitedByName  = profileRes.data?.full_name ?? '';

    await supabase.functions.invoke('send-invite-email', {
      body: { invitedEmail: email.toLowerCase().trim(), companyName, invitedByName },
    });
  } catch {
    // Email fallita non blocca l'invito — il record DB è già salvato
  }

  return 'ok';
}

/** Controlla se c'è un invito pendente senza accettarlo — ritorna l'azienda o null */
export async function peekPendingInvite(): Promise<Company | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: invites } = await supabase
    .from('company_invites')
    .select('id, company_id')
    .eq('invited_email', user.email.toLowerCase())
    .limit(1);

  if (!invites || invites.length === 0) return null;
  return fetchCompany(invites[0].company_id);
}

/** Controlla se l'utente corrente ha inviti pendenti e, se sì, accetta il primo */
export async function checkAndAcceptInvite(userId: string): Promise<Company | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: invites } = await supabase
    .from('company_invites')
    .select('id, company_id')
    .eq('invited_email', user.email.toLowerCase())
    .limit(1);

  if (!invites || invites.length === 0) return null;

  const invite = invites[0];

  // Aggiorna il profilo con la company
  await supabase.from('profiles').update({ company_id: invite.company_id }).eq('id', userId);

  // Elimina l'invito accettato
  await supabase.from('company_invites').delete().eq('id', invite.id);

  return fetchCompany(invite.company_id);
}

export interface MyInvite {
  id:           string;
  company_id:   string;
  company_name: string;
}

/** Inviti ricevuti dall'utente corrente (per la sua email) */
export async function listInvitesForMe(): Promise<MyInvite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const { data: invites } = await supabase
    .from('company_invites')
    .select('id, company_id')
    .eq('invited_email', user.email.toLowerCase());

  if (!invites || invites.length === 0) return [];

  const results = await Promise.all(
    invites.map(async (inv: { id: string; company_id: string }) => {
      const company = await fetchCompany(inv.company_id);
      return { id: inv.id, company_id: inv.company_id, company_name: company?.name ?? 'Azienda' };
    })
  );
  return results;
}

/** Lista inviti pendenti dell'azienda corrente */
export async function listPendingInvites(companyId: string): Promise<CompanyInvite[]> {
  const { data } = await supabase
    .from('company_invites')
    .select('id, company_id, invited_email, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return (data as CompanyInvite[]) ?? [];
}

/** Revoca un invito */
export async function revokeInvite(inviteId: string): Promise<void> {
  await supabase.from('company_invites').delete().eq('id', inviteId);
}
