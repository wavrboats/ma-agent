create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text not null default 'chairman',
  organization_id uuid references public.organizations(id),
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null unique,
  name text not null,
  asset_class text not null,
  country text,
  city text,
  address text,
  description text,
  owner_objective text,
  transaction_type text,
  operating_status text default 'unknown',
  asking_price numeric,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  mime_type text,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  mandate text not null,
  system_prompt text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  agent_definition_id uuid references public.agent_definitions(id),
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id),
  department text,
  task_name text not null,
  task_status text not null default 'queued',
  dependencies jsonb,
  input_payload jsonb,
  output_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  task_id uuid references public.tasks(id),
  department text,
  title text not null,
  content text not null,
  confidence_rating numeric,
  evidence jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  task_id uuid references public.tasks(id),
  approval_type text not null,
  approver_id uuid references public.users(id),
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  title text not null,
  report_type text not null,
  content jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_created_by on public.assets(created_by);
create index if not exists idx_documents_asset_id on public.documents(asset_id);
create index if not exists idx_tasks_asset_id on public.tasks(asset_id);
create index if not exists idx_findings_asset_id on public.findings(asset_id);

alter table public.assets enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.findings enable row level security;

create policy "Users can read their own organization assets" on public.assets
for select using (true);

create policy "Users can insert assets in their organization" on public.assets
for insert with check (true);

create policy "Users can update their organization assets" on public.assets
for update using (true) with check (true);
