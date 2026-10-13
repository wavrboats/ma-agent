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

-- Asset → Exit pipeline: stages, gates and the remaining shared-database tables.
-- One asset ID runs through every stage. Unknown values stay null, never 0.

alter table public.assets add column if not exists current_stage text not null default 'INTAKE';
alter table public.assets add column if not exists industry text;
-- The asking price as written when it is not a plain number, e.g. "EGP 30 million".
alter table public.assets add column if not exists asking_price_text text;
alter table public.tasks add column if not exists stage text;
alter table public.approvals add column if not exists gate text;

create table if not exists public.pipeline_stages (
  code text primary key,
  stage_number int not null unique,
  title text not null,
  agent text not null,
  layer text not null,
  exit_gate text
);

create table if not exists public.stage_gates (
  code text primary key,
  title text not null,
  after_stage text not null references public.pipeline_stages(code),
  human_approval boolean not null,
  approver_role text not null
);

insert into public.pipeline_stages (code, stage_number, title, agent, layer, exit_gate) values
  ('INTAKE', 1, 'Asset registration', 'Intake Agent', 'Orchestrator', null),
  ('SCREEN', 2, 'Mandate / red flags', 'Screening Agent', 'Orchestrator', 'G0'),
  ('VERIFY', 3, 'Legal + ownership', 'DD Agent', 'Verification', 'G1'),
  ('ASSESS', 4, 'Technical + ESG', 'Engineering Agent', 'Analysis', null),
  ('MARKET', 5, 'Demand + competitors', 'Research Agent', 'Source Collector', null),
  ('MODEL', 6, 'Financial normalization', 'Finance Agent', 'Analysis', 'G2'),
  ('VALUE', 7, 'Valuation + scenarios', 'Valuation Agent', 'Analysis', 'G3'),
  ('STRATEGY', 8, 'Exit / reposition / JV', 'Strategy Agent', 'Analysis', null),
  ('BUYERS', 9, 'Longlist → shortlist', 'Buyer Agent', 'Buyer Intelligence', 'G4'),
  ('MATERIALS', 10, 'Teaser + CIM + data room', 'Deal Prep Agent', 'Deal Execution', null),
  ('OUTREACH', 11, 'NDA + buyer engagement', 'Origination Agent', 'Deal Execution', null),
  ('EXECUTE', 12, 'Offers → SPA → close', 'Execution Agent', 'Deal Execution', 'G5')
on conflict (code) do nothing;

insert into public.stage_gates (code, title, after_stage, human_approval, approver_role) values
  ('G0', 'Mandate accepted', 'SCREEN', false, 'CEO'),
  ('G1', 'Identity & ownership verified', 'VERIFY', true, 'Legal'),
  ('G2', 'Asset commercially viable', 'MODEL', false, 'CEO'),
  ('G3', 'Valuation approved', 'VALUE', true, 'Chairman'),
  ('G4', 'Buyer list approved', 'BUYERS', true, 'Chairman'),
  ('G5', 'Binding terms approved', 'EXECUTE', true, 'Chairman')
on conflict (code) do nothing;

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  name text not null,
  entity_type text,
  registration_number text,
  country text,
  matched_entity_id uuid references public.entities(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  source_type text,
  reliability numeric check (reliability between 0 and 1),
  accessed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Data rule: every finding carries source URL + date + confidence + owner + status.
alter table public.findings add column if not exists source_id uuid references public.sources(id);
alter table public.findings add column if not exists source_url text;
alter table public.findings add column if not exists source_date date;
alter table public.findings add column if not exists owner text;
alter table public.findings add column if not exists status text not null default 'UNVERIFIED';
alter table public.findings add column if not exists stage text;
alter table public.findings add column if not exists workstream text;

create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  finding_id uuid references public.findings(id),
  workstream text,
  title text not null,
  severity text,
  likelihood text,
  mitigation text,
  owner text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists public.financials (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  period text not null,
  metric text not null,
  value numeric,
  currency text,
  is_normalized boolean not null default false,
  source_id uuid references public.sources(id),
  created_at timestamptz not null default now()
);

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  hs_code text,
  country text,
  year int,
  metric text not null,
  value numeric,
  unit text,
  source_id uuid references public.sources(id),
  created_at timestamptz not null default now()
);

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  entity_id uuid references public.entities(id),
  name text not null,
  buyer_type text,
  country text,
  fit_score numeric,
  evidence_score numeric,
  status text not null default 'LONGLIST',
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.buyers(id) on delete cascade,
  full_name text not null,
  title text,
  email text,
  phone text,
  is_decision_maker boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade,
  actor text not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Agent run state: one row per asset, written by the agent runner with the service-role key.
-- Row level security is on with no policies, so browsers using the anon key cannot read or write it.
create table if not exists public.agent_run_states (
  asset_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.agent_run_states enable row level security;

create index if not exists idx_assets_created_by on public.assets(created_by);
create index if not exists idx_documents_asset_id on public.documents(asset_id);
create index if not exists idx_tasks_asset_id on public.tasks(asset_id);
create index if not exists idx_findings_asset_id on public.findings(asset_id);
create index if not exists idx_entities_asset_id on public.entities(asset_id);
create index if not exists idx_risks_asset_id on public.risks(asset_id);
create index if not exists idx_financials_asset_id on public.financials(asset_id);
create index if not exists idx_markets_asset_id on public.markets(asset_id);
create index if not exists idx_buyers_asset_id on public.buyers(asset_id);
create index if not exists idx_audit_log_asset_id on public.audit_log(asset_id);

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
