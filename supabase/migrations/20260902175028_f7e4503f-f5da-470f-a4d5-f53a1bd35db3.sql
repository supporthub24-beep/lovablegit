CREATE TABLE public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  kind text not null default 'openai_compatible',
  base_url text not null,
  api_key text not null,
  models text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT ALL ON public.ai_providers TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ai providers" ON public.ai_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_providers TO authenticated;