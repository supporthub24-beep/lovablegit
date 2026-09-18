-- Workspace-scoped GitHub connections.
--
-- Each row links one workspace (project) to a GitHub repository and records the
-- branch plus the permission flags the AI workspace may use when reading files,
-- writing files and opening pull requests.
--
-- The table is scoped to the owning user through RLS: a user may only see and
-- modify connections that belong to them. The workspace (project) must also
-- belong to the same user, which is enforced with a foreign key plus a policy
-- check against public.projects.

create table if not exists public.github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  repo_full_name text not null,
  branch text not null default 'main',
  can_read_files boolean not null default true,
  can_write_files boolean not null default false,
  can_open_pr boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint github_connections_repo_full_name_format
    check (repo_full_name ~ '^[^/\s]+/[^/\s]+$'),
  constraint github_connections_branch_not_blank
    check (length(btrim(branch)) > 0)
);

-- One connection per workspace. A null project_id represents the account-wide
-- default connection, so it is covered by a separate partial unique index.
create unique index if not exists github_connections_project_unique
  on public.github_connections (project_id)
  where project_id is not null;

create unique index if not exists github_connections_user_default_unique
  on public.github_connections (user_id)
  where project_id is null;

create index if not exists github_connections_user_id_idx
  on public.github_connections (user_id);

create index if not exists github_connections_project_id_idx
  on public.github_connections (project_id);

-- Keep updated_at accurate on every write.
create or replace function public.set_github_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_github_connections_updated_at on public.github_connections;
create trigger set_github_connections_updated_at
  before update on public.github_connections
  for each row
  execute function public.set_github_connections_updated_at();

alter table public.github_connections enable row level security;

-- Owners can read their own connections.
drop policy if exists "github_connections_select_own" on public.github_connections;
create policy "github_connections_select_own"
  on public.github_connections
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Owners can create connections for themselves. When a workspace is supplied it
-- must belong to the same user.
drop policy if exists "github_connections_insert_own" on public.github_connections;
create policy "github_connections_insert_own"
  on public.github_connections
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.user_id = auth.uid()
      )
    )
  );

-- Owners can update their own connections and cannot move them to another user
-- or to a workspace they do not own.
drop policy if exists "github_connections_update_own" on public.github_connections;
create policy "github_connections_update_own"
  on public.github_connections
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1
        from public.projects p
        where p.id = project_id
          and p.user_id = auth.uid()
      )
    )
  );

-- Owners can delete their own connections.
drop policy if exists "github_connections_delete_own" on public.github_connections;
create policy "github_connections_delete_own"
  on public.github_connections
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.github_connections to authenticated;
grant all on public.github_connections to service_role;
</｜｜DSML｜｜ parameter>
