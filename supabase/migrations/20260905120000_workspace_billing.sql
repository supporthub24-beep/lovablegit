-- Workspace-scoped billing: plans, subscriptions, usage metering, invoices and RLS.
--
-- This migration is additive and idempotent. It creates the tables the
-- workspace billing UI reads from, seeds the Free / Pro / Team plans, and
-- installs row level security so a workspace's billing data is only visible
-- to its members (and to platform admins).

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  currency text not null default 'usd',
  features_json jsonb not null default '[]'::jsonb,
  limits_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plans is
  'Subscription plans available to workspaces. Seeded with Free, Pro and Team.';

alter table public.plans enable row level security;

drop policy if exists "plans are readable by authenticated users" on public.plans;
create policy "plans are readable by authenticated users"
  on public.plans for select
  to authenticated
  using (is_active);

drop policy if exists "plans are manageable by admins" on public.plans;
create policy "plans are manageable by admins"
  on public.plans for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'not_configured',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'One row per workspace subscription. status = not_configured when no payment provider keys are set.';

create index if not exists subscriptions_workspace_id_idx
  on public.subscriptions (workspace_id, created_at desc);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions are readable by workspace members" on public.subscriptions;
create policy "subscriptions are readable by workspace members"
  on public.subscriptions for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "subscriptions are writable by workspace owners and admins" on public.subscriptions;
create policy "subscriptions are writable by workspace owners and admins"
  on public.subscriptions for all
  to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    public.is_workspace_admin(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- ---------------------------------------------------------------------------
-- workspace_usage
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default date_trunc('month', now()) + interval '1 month',
  messages_used integer not null default 0 check (messages_used >= 0),
  projects_used integer not null default 0 check (projects_used >= 0),
  members_used integer not null default 0 check (members_used >= 0),
  tokens_used bigint not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start)
);

comment on table public.workspace_usage is
  'Metered usage per workspace per billing period, compared against the plan limits.';

create index if not exists workspace_usage_workspace_id_idx
  on public.workspace_usage (workspace_id, period_start desc);

alter table public.workspace_usage enable row level security;

drop policy if exists "usage is readable by workspace members" on public.workspace_usage;
create policy "usage is readable by workspace members"
  on public.workspace_usage for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "usage is writable by workspace members" on public.workspace_usage;
create policy "usage is writable by workspace members"
  on public.workspace_usage for all
  to authenticated
  using (
    public.is_workspace_member(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    public.is_workspace_member(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  number text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'draft',
  provider text,
  provider_invoice_id text,
  hosted_invoice_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.invoices is
  'Subscription invoices issued for a workspace.';

create index if not exists invoices_workspace_id_idx
  on public.invoices (workspace_id, created_at desc);

alter table public.invoices enable row level security;

drop policy if exists "invoices are readable by workspace members" on public.invoices;
create policy "invoices are readable by workspace members"
  on public.invoices for select
  to authenticated
  using (
    public.is_workspace_member(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "invoices are writable by workspace admins" on public.invoices;
create policy "invoices are writable by workspace admins"
  on public.invoices for all
  to authenticated
  using (
    public.is_workspace_admin(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  )
  with check (
    public.is_workspace_admin(workspace_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists workspace_usage_touch_updated_at on public.workspace_usage;
create trigger workspace_usage_touch_updated_at
  before update on public.workspace_usage
  for each row execute function public.touch_updated_at();

drop trigger if exists invoices_touch_updated_at on public.invoices;
create trigger invoices_touch_updated_at
  before update on public.invoices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- seed plans
-- ---------------------------------------------------------------------------
insert into public.plans (slug, name, description, monthly_price_cents, currency, features_json, limits_json, sort_order)
values
  (
    'free',
    'Free',
    'For trying ideas and small side projects.',
    0,
    'usd',
    '["1 workspace","3 projects","50 AI messages / month","Live preview and code editor","GitHub import and push"]'::jsonb,
    '{"projects":3,"messages_per_month":50,"members":1,"tokens_per_month":50000}'::jsonb,
    0
  ),
  (
    'pro',
    'Pro',
    'For solo builders shipping real products.',
    2000,
    'usd',
    '["Unlimited projects","2,000 AI messages / month","Image and logo generation","Version history and rollback","Priority AI model access"]'::jsonb,
    '{"projects":0,"messages_per_month":2000,"members":1,"tokens_per_month":2000000}'::jsonb,
    1
  ),
  (
    'team',
    'Team',
    'For teams building together in one workspace.',
    6000,
    'usd',
    '["Everything in Pro","Up to 10 workspace members","Shared billing and invoices","Role-based access control","Usage reporting per member"]'::jsonb,
    '{"projects":0,"messages_per_month":10000,"members":10,"tokens_per_month":10000000}'::jsonb,
    2
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  currency = excluded.currency,
  features_json = excluded.features_json,
  limits_json = excluded.limits_json,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- attach the free plan to workspaces that do not have one yet
-- ---------------------------------------------------------------------------
update public.workspaces
set plan_id = (select id from public.plans where slug = 'free')
where plan_id is null;

-- ---------------------------------------------------------------------------
-- helper: current usage row for a workspace, creating it when missing
-- ---------------------------------------------------------------------------
create or replace function public.ensure_workspace_usage(p_workspace_id uuid)
returns public.workspace_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.workspace_usage;
begin
  select * into result
  from public.workspace_usage
  where workspace_id = p_workspace_id
    and period_start = date_trunc('month', now())
  limit 1;

  if result.id is null then
    insert into public.workspace_usage (workspace_id, period_start, period_end)
    values (
      p_workspace_id,
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
    on conflict (workspace_id, period_start) do update
      set updated_at = now()
    returning * into result;
  end if;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- helper: record a metered message against a workspace
-- ---------------------------------------------------------------------------
create or replace function public.record_workspace_message(
  p_workspace_id uuid,
  p_tokens integer default 0
)
returns public.workspace_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.workspace_usage;
begin
  perform public.ensure_workspace_usage(p_workspace_id);

  update public.workspace_usage
  set messages_used = messages_used + 1,
      tokens_used = tokens_used + greatest(coalesce(p_tokens, 0), 0),
      updated_at = now()
  where workspace_id = p_workspace_id
    and period_start = date_trunc('month', now())
  returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- helper: switch a workspace plan without a payment provider
-- ---------------------------------------------------------------------------
create or replace function public.set_workspace_plan(
  p_workspace_id uuid,
  p_plan_slug text
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_plan public.plans;
  result public.subscriptions;
begin
  select * into target_plan
  from public.plans
  where slug = p_plan_slug and is_active
  limit 1;

  if target_plan.id is null then
    raise exception 'unknown_plan';
  end if;

  update public.workspaces
  set plan_id = target_plan.id,
      updated_at = now()
  where id = p_workspace_id;

  select * into result
  from public.subscriptions
  where workspace_id = p_workspace_id
  order by created_at desc
  limit 1;

  if result.id is null then
    insert into public.subscriptions (
      workspace_id,
      plan_id,
      status,
      provider,
      current_period_start,
      current_period_end
    )
    values (
      p_workspace_id,
      target_plan.id,
      case when target_plan.monthly_price_cents = 0 then 'active' else 'not_configured' end,
      null,
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
    returning * into result;
  else
    update public.subscriptions
    set plan_id = target_plan.id,
        status = case
          when target_plan.monthly_price_cents = 0 then 'active'
          else coalesce(nullif(status, 'active'), 'not_configured')
        end,
        current_period_start = date_trunc('month', now()),
        current_period_end = date_trunc('month', now()) + interval '1 month',
        cancel_at_period_end = false,
        updated_at = now()
    where id = result.id
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.ensure_workspace_usage(uuid) to authenticated;
grant execute on function public.record_workspace_message(uuid, integer) to authenticated;
grant execute on function public.set_workspace_plan(uuid, text) to authenticated;
