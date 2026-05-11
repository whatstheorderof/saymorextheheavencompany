-- Say More Paid MVP schema
-- Run in Supabase SQL editor after creating a project and enabling email auth.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null,
  status text not null default 'active',
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pack_id)
);

create table if not exists public.trial_usage (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text,
  pack_id text not null,
  draw_count integer not null default 0,
  shuffle_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_key, pack_id)
);

grant select on table public.purchases to authenticated;
grant select on table public.trial_usage to authenticated;
grant select, insert, update, delete on table public.purchases to service_role;
grant select, insert, update, delete on table public.trial_usage to service_role;

alter table public.purchases enable row level security;
alter table public.trial_usage enable row level security;

drop policy if exists "Users can read their purchases" on public.purchases;
create policy "Users can read their purchases"
  on public.purchases
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read their trial usage" on public.trial_usage;
create policy "Users can read their trial usage"
  on public.trial_usage
  for select
  using (auth.uid() = user_id);

-- Writes are performed by server routes using SUPABASE_SERVICE_ROLE_KEY.
