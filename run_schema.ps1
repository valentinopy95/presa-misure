$token = "sbp_e98b666ad0f5ea6ff8a1666def007695bba23246"
$ref   = "vhsfdvkuzqqlmpuucfbt"
$url   = "https://api.supabase.com/v1/projects/$ref/database/query"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

function RunSQL($sql) {
    $body = [System.Text.Encoding]::UTF8.GetBytes(($sql | ConvertTo-Json -Compress | ForEach-Object { "{`"query`":$_}" }))
    try {
        $r = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body ($sql | ConvertTo-Json | ForEach-Object { "{`"query`":$_}" }) -ContentType "application/json"
        Write-Host "OK: $sql" -ForegroundColor Green
    } catch {
        Write-Host "ERR: $_" -ForegroundColor Red
    }
}

$statements = @(
    "create table if not exists public.companies (id uuid default gen_random_uuid() primary key, name text not null, code text unique not null, owner_id uuid references auth.users(id) on delete set null, created_at timestamptz default now())",
    "create table if not exists public.profiles (id uuid references auth.users(id) on delete cascade primary key, full_name text, company_id uuid references public.companies(id) on delete set null, created_at timestamptz default now())",
    "alter table public.companies enable row level security",
    "alter table public.profiles enable row level security",
    "do `$`$ begin if not exists (select 1 from pg_policies where tablename='companies' and policyname='Authenticated can read companies') then create policy `"Authenticated can read companies`" on public.companies for select using (auth.uid() is not null); end if; end `$`$",
    "do `$`$ begin if not exists (select 1 from pg_policies where tablename='companies' and policyname='Authenticated can create company') then create policy `"Authenticated can create company`" on public.companies for insert with check (auth.uid() is not null); end if; end `$`$",
    "do `$`$ begin if not exists (select 1 from pg_policies where tablename='companies' and policyname='Owner can update company') then create policy `"Owner can update company`" on public.companies for update using (owner_id = auth.uid()); end if; end `$`$",
    "do `$`$ begin if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users read own profile') then create policy `"Users read own profile`" on public.profiles for select using (id = auth.uid()); end if; end `$`$",
    "do `$`$ begin if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users insert own profile') then create policy `"Users insert own profile`" on public.profiles for insert with check (id = auth.uid()); end if; end `$`$",
    "do `$`$ begin if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users update own profile') then create policy `"Users update own profile`" on public.profiles for update using (id = auth.uid()); end if; end `$`$",
    "create or replace function public.handle_new_user() returns trigger as `$func`$ begin insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict (id) do nothing; return new; end; `$func`$ language plpgsql security definer",
    "drop trigger if exists on_auth_user_created on auth.users",
    "create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user()"
)

foreach ($stmt in $statements) {
    $bodyJson = "{`"query`":`"$($stmt.Replace('"','\"'))`"}"
    try {
        $r = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $bodyJson -ContentType "application/json"
        Write-Host "OK" -ForegroundColor Green
        $r | ConvertTo-Json | Write-Host
    } catch {
        Write-Host "ERRORE: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Done." -ForegroundColor Cyan
