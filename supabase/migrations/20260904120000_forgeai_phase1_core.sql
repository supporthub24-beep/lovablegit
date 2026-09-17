-- ForgeAI Phase 1 core schema
-- Multi-tenant AI web-dev platform: profiles, workspaces, members, plans,
-- subscriptions, projects, files, snapshots, chats, messages, providers,
-- usage events, request logs, audit logs, integrations, feature flags.
--
-- Security model:
--   * Every tenant-owned table has RLS enabled.
--   * Roles live in public.user_roles and are read through public.has_role().
--   * No foreign keys to auth.users; user data lives in public.profiles.
--   * Service-role operations happen only inside Edge Functions.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
    CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'deleted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'not_configured'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_visibility') THEN
    CREATE TYPE public.project_visibility AS ENUM ('private', 'workspace', 'public');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'deleted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_status') THEN
    CREATE TYPE public.chat_status AS ENUM ('active', 'archived', 'error');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_role') THEN
    CREATE TYPE public.message_role AS ENUM ('system', 'user', 'assistant', 'tool');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usage_status') THEN
    CREATE TYPE public.usage_status AS ENUM ('success', 'error', 'rate_limited', 'quota_exceeded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE public.integration_status AS ENUM ('connected', 'disconnected', 'error', 'not_configured');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- user_roles + has_role()
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Security definer so RLS on user_roles cannot recurse into itself.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  display_name text,
  avatar_url text,
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  status public.account_status NOT NULL DEFAULT 'active',
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  active boolean NOT NULL DEFAULT true,
  limits_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  features_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active plans" ON public.plans;
CREATE POLICY "Anyone can read active plans"
  ON public.plans
  FOR SELECT
  TO authenticated, anon
  USING (active = true);

DROP POLICY IF EXISTS "Admins can read all plans" ON public.plans;
CREATE POLICY "Admins can read all plans"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans"
  ON public.plans
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_plans_updated_at ON public.plans;
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the three public plans. Billing is not configured, so no plan is
-- marked as purchased anywhere; these rows only describe entitlements.
INSERT INTO public.plans (name, slug, monthly_price_cents, currency, active, limits_json, features_json)
VALUES
  (
    'Free',
    'free',
    0,
    'usd',
    true,
    '{"requests_per_minute": 5, "requests_per_day": 50, "requests_per_month": 500, "max_prompt_chars": 8000, "max_attachment_bytes": 5242880, "max_projects": 3, "max_file_bytes": 262144, "max_output_tokens": 4096}'::jsonb,
    '{"streaming": true, "github": false, "snapshots": true, "zip_export": true, "team_members": false}'::jsonb
  ),
  (
    'Pro',
    'pro',
    2000,
    'usd',
    true,
    '{"requests_per_minute": 30, "requests_per_day": 1000, "requests_per_month": 20000, "max_prompt_chars": 32000, "max_attachment_bytes": 20971520, "max_projects": 50, "max_file_bytes": 1048576, "max_output_tokens": 16384}'::jsonb,
    '{"streaming": true, "github": true, "snapshots": true, "zip_export": true, "team_members": false}'::jsonb
  ),
  (
    'Team',
    'team',
    4900,
    'usd',
    true,
    '{"requests_per_minute": 60, "requests_per_day": 5000, "requests_per_month": 100000, "max_prompt_chars": 64000, "max_attachment_bytes": 52428800, "max_projects": 500, "max_file_bytes": 4194304, "max_output_tokens": 32768}'::jsonb,
    '{"streaming": true, "github": true, "snapshots": true, "zip_export": true, "team_members": true}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans (id) ON DELETE SET NULL,
  status public.member_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx ON public.workspaces (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their workspaces" ON public.workspaces;
CREATE POLICY "Members can read their workspaces"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspaces.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
CREATE POLICY "Users can create their own workspaces"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspaces"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspaces.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspaces.id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;
CREATE POLICY "Owners can delete workspaces"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  status public.member_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON public.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON public.workspace_members (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their workspace membership" ON public.workspace_members;
CREATE POLICY "Members can read their workspace membership"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members self
      WHERE self.workspace_id = workspace_members.workspace_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Owners and admins can add members" ON public.workspace_members;
CREATE POLICY "Owners and admins can add members"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members self
      WHERE self.workspace_id = workspace_members.workspace_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Owners and admins can update members" ON public.workspace_members;
CREATE POLICY "Owners and admins can update members"
  ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members self
      WHERE self.workspace_id = workspace_members.workspace_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members self
      WHERE self.workspace_id = workspace_members.workspace_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.workspace_members;
CREATE POLICY "Owners and admins can remove members"
  ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members self
      WHERE self.workspace_id = workspace_members.workspace_id
        AND self.user_id = auth.uid()
        AND self.status = 'active'
        AND self.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP TRIGGER IF EXISTS set_workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER set_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  provider_customer_id text,
  provider_subscription_id text,
  plan_id uuid REFERENCES public.plans (id) ON DELETE SET NULL,
  status public.subscription_status NOT NULL DEFAULT 'not_configured',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_workspace_id_idx ON public.subscriptions (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_subscription_id_key
  ON public.subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their workspace subscription" ON public.subscriptions;
CREATE POLICY "Members can read their workspace subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = subscriptions.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = subscriptions.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  framework text NOT NULL DEFAULT 'react-vite',
  visibility public.project_visibility NOT NULL DEFAULT 'private',
  status public.project_status NOT NULL DEFAULT 'active',
  default_model_id text,
  storage_path text,
  repo_full_name text,
  repo_branch text NOT NULL DEFAULT 'main',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS projects_workspace_id_idx ON public.projects (workspace_id);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON public.projects (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read workspace projects" ON public.projects;
CREATE POLICY "Members can read workspace projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = projects.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = projects.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can create projects" ON public.projects;
CREATE POLICY "Members can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = projects.workspace_id
          AND w.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = projects.workspace_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
          AND m.role IN ('owner', 'admin', 'member')
      )
    )
  );

DROP POLICY IF EXISTS "Members can update projects" ON public.projects;
CREATE POLICY "Members can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = projects.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'member')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = projects.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'member')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Owners and admins can delete projects" ON public.projects;
CREATE POLICY "Owners and admins can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = projects.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read project membership" ON public.project_members;
CREATE POLICY "Members can read project membership"
  ON public.project_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Project owners can manage membership" ON public.project_members;
CREATE POLICY "Project owners can manage membership"
  ON public.project_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP TRIGGER IF EXISTS set_project_members_updated_at ON public.project_members;
CREATE TRIGGER set_project_members_updated_at
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  path text NOT NULL,
  language text,
  content text NOT NULL DEFAULT '',
  storage_path text,
  size_bytes integer NOT NULL DEFAULT 0,
  checksum text,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);

CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON public.project_files (project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.project_files TO service_role;

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read project files" ON public.project_files;
CREATE POLICY "Members can read project files"
  ON public.project_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
            )
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can write project files" ON public.project_files;
CREATE POLICY "Members can write project files"
  ON public.project_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'member')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can update project files" ON public.project_files;
CREATE POLICY "Members can update project files"
  ON public.project_files
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'member')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'member')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can delete project files" ON public.project_files;
CREATE POLICY "Members can delete project files"
  ON public.project_files
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'member')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP TRIGGER IF EXISTS set_project_files_updated_at ON public.project_files;
CREATE TRIGGER set_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Snapshot',
  manifest_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_snapshots_project_id_idx ON public.project_snapshots (project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_snapshots TO authenticated;
GRANT ALL ON public.project_snapshots TO service_role;

ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read project snapshots" ON public.project_snapshots;
CREATE POLICY "Members can read project snapshots"
  ON public.project_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_snapshots.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can create project snapshots" ON public.project_snapshots;
CREATE POLICY "Members can create project snapshots"
  ON public.project_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_snapshots.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'member')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can delete project snapshots" ON public.project_snapshots;
CREATE POLICY "Members can delete project snapshots"
  ON public.project_snapshots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_snapshots.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin')
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ---------------------------------------------------------------------------
-- chats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  model_id text,
  status public.chat_status NOT NULL DEFAULT 'active',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chats_project_id_idx ON public.chats (project_id);
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON public.chats (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read project chats" ON public.chats;
CREATE POLICY "Members can read project chats"
  ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = chats.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
          )
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can create chats" ON public.chats;
CREATE POLICY "Members can create chats"
  ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = chats.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.workspace_members m
            WHERE m.workspace_id = p.workspace_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role IN ('owner', 'admin', 'member')
          )
        )
    )
  );

DROP POLICY IF EXISTS "Chat owners can update chats" ON public.chats;
CREATE POLICY "Chat owners can update chats"
  ON public.chats
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Chat owners can delete chats" ON public.chats;
CREATE POLICY "Chat owners can delete chats"
  ON public.chats
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_chats_updated_at ON public.chats;
CREATE TRIGGER set_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.message_role NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider text,
  model_id text,
  token_usage_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sequence_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON public.chat_messages (chat_id, sequence_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read chat messages" ON public.chat_messages;
CREATE POLICY "Members can read chat messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = c.project_id
              AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.workspace_members m
                  WHERE m.workspace_id = p.workspace_id
                    AND m.user_id = auth.uid()
                    AND m.status = 'active'
                )
              )
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Members can create chat messages" ON public.chat_messages;
CREATE POLICY "Members can create chat messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = c.project_id
              AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.workspace_members m
                  WHERE m.workspace_id = p.workspace_id
                    AND m.user_id = auth.uid()
                    AND m.status = 'active'
                    AND m.role IN ('owner', 'admin', 'member')
                )
              )
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Message owners can update messages" ON public.chat_messages;
CREATE POLICY "Message owners can update messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Message owners can delete messages" ON public.chat_messages;
CREATE POLICY "Message owners can delete messages"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- ai_providers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  server_only boolean NOT NULL DEFAULT true,
  capabilities_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_models_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  rate_limit_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_providers TO authenticated;
GRANT ALL ON public.ai_providers TO service_role;

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read enabled providers" ON public.ai_providers;
CREATE POLICY "Authenticated users can read enabled providers"
  ON public.ai_providers
  FOR SELECT
  TO authenticated
  USING (enabled = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage providers" ON public.ai_providers;
CREATE POLICY "Admins can manage providers"
  ON public.ai_providers
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_ai_providers_updated_at ON public.ai_providers;
CREATE TRIGGER set_ai_providers_updated_at
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Provider metadata only. Secrets live in Edge Function secrets.
INSERT INTO public.ai_providers (provider_key, display_name, enabled, server_only, capabilities_json, allowed_models_json)
VALUES
  (
    'openai',
    'OpenAI',
    false,
    true,
    '{"streaming": true, "vision": true, "tool_calling": true, "context_window": 128000}'::jsonb,
    '["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"]'::jsonb
  ),
  (
    'gemini',
    'Google Gemini',
    false,
    true,
    '{"streaming": true, "vision": true, "tool_calling": true, "context_window": 1000000}'::jsonb,
    '["gemini-2.0-flash", "gemini-1.5-pro"]'::jsonb
  ),
  (
    'deepseek',
    'DeepSeek',
    false,
    true,
    '{"streaming": true, "vision": false, "tool_calling": true, "context_window": 64000}'::jsonb,
    '["deepseek-chat", "deepseek-reasoner"]'::jsonb
  )
ON CONFLICT (provider_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- usage_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces (id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  provider text,
  model_id text,
  request_id text,
  status public.usage_status NOT NULL DEFAULT 'success',
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_cents numeric(12, 4) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON public.usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_workspace_id_idx ON public.usage_events (workspace_id, created_at DESC);

GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own usage" ON public.usage_events;
CREATE POLICY "Users can read their own usage"
  ON public.usage_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = usage_events.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can record their own usage" ON public.usage_events;
CREATE POLICY "Users can record their own usage"
  ON public.usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- api_request_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  user_id uuid,
  route text NOT NULL,
  status_code integer NOT NULL DEFAULT 200,
  error_code text,
  latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_request_logs_request_id_idx ON public.api_request_logs (request_id);
CREATE INDEX IF NOT EXISTS api_request_logs_user_id_idx ON public.api_request_logs (user_id, created_at DESC);

GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own request logs" ON public.api_request_logs;
CREATE POLICY "Users can read their own request logs"
  ON public.api_request_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  workspace_id uuid REFERENCES public.workspaces (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_workspace_id_idx ON public.audit_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs (actor_id, created_at DESC);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Workspace admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = audit_logs.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = audit_logs.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ---------------------------------------------------------------------------
-- integrations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_account_id text,
  encrypted_metadata text,
  status public.integration_status NOT NULL DEFAULT 'not_configured',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS integrations_workspace_id_idx ON public.integrations (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace admins can read integrations" ON public.integrations;
CREATE POLICY "Workspace admins can read integrations"
  ON public.integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = integrations.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = integrations.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Workspace admins can manage integrations" ON public.integrations;
CREATE POLICY "Workspace admins can manage integrations"
  ON public.integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = integrations.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = integrations.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = integrations.workspace_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = integrations.workspace_id
        AND w.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP TRIGGER IF EXISTS set_integrations_updated_at ON public.integrations;
CREATE TRIGGER set_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- feature_flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated users can read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.feature_flags (key, enabled, rules_json)
VALUES
  ('maintenance_mode', false, '{"message": ""}'::jsonb),
  ('signup_enabled', true, '{}'::jsonb),
  ('github_oauth_enabled', false, '{"reason": "GitHub OAuth client credentials are not configured."}'::jsonb),
  ('stripe_billing_enabled', false, '{"reason": "Stripe billing is not configured."}'::jsonb),
  ('preview_sandbox_enabled', true, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- platform_settings (admin-editable key/value store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_settings (key, value)
VALUES
  ('default_provider', '{"provider_key": "openai"}'::jsonb),
  ('limits', '{"max_prompt_chars": 32000, "max_attachment_bytes": 20971520}'::jsonb),
  ('allowed_origins', '{"origins": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- First-login bootstrap: create profile + personal workspace idempotently.
-- Runs as the authenticated user; SECURITY DEFINER so it can insert the
-- workspace membership row for the caller without extra policies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text;
  _display_name text;
  _workspace_id uuid;
  _slug text;
  _free_plan_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  _display_name := COALESCE(split_part(COALESCE(_email, 'builder'), '@', 1), 'builder');

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (_user_id, _email, _display_name)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = now();

  SELECT id INTO _workspace_id
  FROM public.workspaces
  WHERE owner_id = _user_id
  ORDER BY created_at
  LIMIT 1;

  IF _workspace_id IS NULL THEN
    _slug := _display_name || '-' || substr(replace(_user_id::text, '-', ''), 1, 8);
    SELECT id INTO _free_plan_id FROM public.plans WHERE slug = 'free' LIMIT 1;

    INSERT INTO public.workspaces (name, slug, owner_id, plan_id)
    VALUES (_display_name || '''s workspace', _slug, _user_id, _free_plan_id)
    RETURNING id INTO _workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
    VALUES (_workspace_id, _user_id, 'owner', 'active')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    INSERT INTO public.subscriptions (workspace_id, plan_id, status)
    VALUES (_workspace_id, _free_plan_id, 'not_configured')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('user_id', _user_id, 'workspace_id', _workspace_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_user_account() TO authenticated;

-- ---------------------------------------------------------------------------
-- Verification queries (run manually after applying the migration):
--
--   -- RLS is enabled on every tenant table:
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
--   ORDER BY relname;
--
--   -- A user only sees their own profile:
--   SET LOCAL role authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<user-uuid>"}';
--   SELECT * FROM public.profiles;
--
--   -- A user cannot read another workspace's projects:
--   SELECT * FROM public.projects WHERE workspace_id = '<other-workspace-uuid>';
--
--   -- Only admins can read cross-tenant usage:
--   SELECT * FROM public.usage_events;
-- ---------------------------------------------------------------------------
</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>
