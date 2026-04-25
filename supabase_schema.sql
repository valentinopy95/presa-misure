-- ─── Esegui questo nel SQL Editor di Supabase ────────────────────────────────

-- Tabella aziende
create table if not exists public.companies (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  code       text unique not null,
  owner_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Tabella profili utente
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz default now()
);

-- Abilita Row Level Security
alter table public.companies enable row level security;
alter table public.profiles  enable row level security;

-- Policy companies: tutti gli autenticati possono leggere (per trovare azienda da codice)
create policy "Authenticated can read companies" on public.companies
  for select using (auth.uid() is not null);

-- Policy companies: solo utenti autenticati possono creare
create policy "Authenticated can create company" on public.companies
  for insert with check (auth.uid() is not null);

-- Policy companies: solo il proprietario può aggiornare
create policy "Owner can update company" on public.companies
  for update using (owner_id = auth.uid());

-- Policy profiles: ogni utente vede e gestisce solo il proprio profilo
create policy "Users read own profile"   on public.profiles
  for select using (id = auth.uid());

create policy "Users insert own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "Users update own profile" on public.profiles
  for update using (id = auth.uid());

-- Trigger: crea profilo automaticamente quando un utente si registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
