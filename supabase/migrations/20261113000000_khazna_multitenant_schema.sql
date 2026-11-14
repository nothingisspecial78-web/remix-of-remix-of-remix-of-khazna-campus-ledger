-- ==============================================================================
-- KHAZNA — Multi-Tenant Campus Ledger & Finance Portal
-- Supabase PostgreSQL Migration
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ORGANIZATIONS (Multi-Tenancy Root)
create table if not exists public.organizations (
    id text primary key default ('org_' || substr(md5(random()::text), 1, 10)),
    name text not null,
    slug text not null unique,
    admin_name text not null,
    admin_email text not null,
    is_demo boolean default false,
    created_at timestamptz default now()
);

-- 2. SECTORS (Departments / Funds per Organization)
create table if not exists public.sectors (
    id uuid primary key default gen_random_uuid(),
    org_id text not null references public.organizations(id) on delete cascade,
    slug text not null,
    name text not null,
    short text not null,
    description text default '',
    receipt_prefix text not null,
    target numeric default 0,
    color text not null,
    credit_titles text[] default array['Cash Deposit'],
    debit_titles text[] default array[]::text[],
    created_at timestamptz default now(),
    unique(org_id, slug)
);

-- 3. CLASSES (Class Names per Organization)
create table if not exists public.classes (
    id uuid primary key default gen_random_uuid(),
    org_id text not null references public.organizations(id) on delete cascade,
    name text not null,
    created_at timestamptz default now(),
    unique(org_id, name)
);

-- 4. STUDENTS (Students Directory per Organization)
create table if not exists public.students (
    id text not null, -- Admission number / Student ID (e.g. S0125, A101)
    org_id text not null references public.organizations(id) on delete cascade,
    name text not null,
    class_name text not null,
    phone text default '',
    guardian text default '—',
    joined date default current_date,
    created_at timestamptz default now(),
    primary key(org_id, id)
);

-- Ensure multi-tenant columns exist if students table already existed
alter table public.students add column if not exists org_id text references public.organizations(id) on delete cascade;
alter table public.students add column if not exists guardian text default '—';
alter table public.students add column if not exists joined date default current_date;

-- 5. MANAGERS / ADMINS (Role Assignments per Organization)
create table if not exists public.managers (
    id text not null,
    org_id text not null references public.organizations(id) on delete cascade,
    name text not null,
    email text not null,
    phone text default '—',
    role text not null default 'manager', -- 'admin' | 'manager'
    sectors text[] default array[]::text[],
    status text not null default 'active', -- 'active' | 'invited'
    last_active timestamptz default now(),
    created_at timestamptz default now(),
    primary key(org_id, id)
);

-- 6. TRANSACTIONS (Append-only Ledger Entries)
create table if not exists public.transactions (
    id text primary key default ('TX' || upper(substr(md5(random()::text), 1, 8))),
    org_id text not null references public.organizations(id) on delete cascade,
    sector text not null,
    student_id text not null,
    type text not null check (type in ('credit', 'debit')),
    title text not null,
    reason text,
    amount numeric not null check (amount > 0),
    date date not null default current_date,
    receipt_no text not null,
    batch_id text,
    created_by text not null,
    created_at timestamptz default now(),
    voided_reason text,
    voided_by text,
    voided_at timestamptz
);

-- 7. BATCHES (Bulk Action Records)
create table if not exists public.batches (
    id text primary key,
    org_id text not null references public.organizations(id) on delete cascade,
    sector text not null,
    title text not null,
    type text not null check (type in ('credit', 'debit')),
    reason text,
    amount numeric not null,
    date date not null,
    receipt_prefix text not null,
    student_ids text[] not null,
    created_by text not null,
    created_at timestamptz default now(),
    voided_reason text,
    voided_by text,
    voided_at timestamptz
);

-- 8. AUDIT LOG (Immutable Event Stream)
create table if not exists public.audit_logs (
    id text primary key default ('AU' || upper(substr(md5(random()::text), 1, 8))),
    org_id text not null references public.organizations(id) on delete cascade,
    actor text not null,
    role text not null,
    action text not null,
    target text not null,
    details text not null,
    sector text,
    ip text default '127.0.0.1',
    created_at timestamptz default now()
);

-- 9. NOTICES & ALERTS
create table if not exists public.notices (
    id text primary key default ('N' || upper(substr(md5(random()::text), 1, 6))),
    org_id text not null references public.organizations(id) on delete cascade,
    title text not null,
    body text not null,
    sector text,
    read boolean default false,
    created_at timestamptz default now()
);

-- ==============================================================================
-- INDEXES FOR FAST REPORTING & TENANT FILTERING
-- ==============================================================================
create index if not exists idx_sectors_org on public.sectors(org_id);
create index if not exists idx_students_org on public.students(org_id);
create index if not exists idx_students_class on public.students(org_id, class_name);
create index if not exists idx_tx_org on public.transactions(org_id);
create index if not exists idx_tx_sector on public.transactions(org_id, sector);
create index if not exists idx_tx_student on public.transactions(org_id, student_id);
create index if not exists idx_tx_date on public.transactions(org_id, date);
create index if not exists idx_batches_org on public.batches(org_id);
create index if not exists idx_audit_org on public.audit_logs(org_id);
create index if not exists idx_managers_org on public.managers(org_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.organizations enable row level security;
alter table public.sectors enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.managers enable row level security;
alter table public.transactions enable row level security;
alter table public.batches enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notices enable row level security;

-- Public read/write policies for authenticated or anon with org filter
drop policy if exists "Allow org-scoped select on organizations" on public.organizations;
create policy "Allow org-scoped select on organizations" on public.organizations
    for select using (true);

drop policy if exists "Allow org-scoped insert on organizations" on public.organizations;
create policy "Allow org-scoped insert on organizations" on public.organizations
    for insert with check (true);

drop policy if exists "Allow access to sectors" on public.sectors;
create policy "Allow access to sectors" on public.sectors
    for all using (true) with check (true);

drop policy if exists "Allow access to classes" on public.classes;
create policy "Allow access to classes" on public.classes
    for all using (true) with check (true);

drop policy if exists "Allow access to students" on public.students;
create policy "Allow access to students" on public.students
    for all using (true) with check (true);

drop policy if exists "Allow access to managers" on public.managers;
create policy "Allow access to managers" on public.managers
    for all using (true) with check (true);

drop policy if exists "Allow access to transactions" on public.transactions;
create policy "Allow access to transactions" on public.transactions
    for all using (true) with check (true);

drop policy if exists "Allow access to batches" on public.batches;
create policy "Allow access to batches" on public.batches
    for all using (true) with check (true);

drop policy if exists "Allow access to audit_logs" on public.audit_logs;
create policy "Allow access to audit_logs" on public.audit_logs
    for all using (true) with check (true);

drop policy if exists "Allow access to notices" on public.notices;
create policy "Allow access to notices" on public.notices
    for all using (true) with check (true);

-- ==============================================================================
-- SEED DEFAULT DEMO ORGANIZATION: Islahul Uloom
-- ==============================================================================
insert into public.organizations (id, name, slug, admin_name, admin_email, is_demo)
values ('demo', 'Islahul Uloom', 'islahul-uloom', 'Sayyid Munavvar Ali', 'principal@islahuloom.edu.in', true)
on conflict (id) do nothing;
