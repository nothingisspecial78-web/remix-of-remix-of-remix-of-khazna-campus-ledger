-- ==============================================================================
-- KHAZNA — Institution Profile, Signatories, Reports & Public QR Verification
-- Supabase PostgreSQL Migration
-- ==============================================================================

-- 1. INSTITUTION PROFILE (One row per organization)
create table if not exists public.institution_profile (
    org_id text primary key references public.organizations(id) on delete cascade,
    name text not null check (char_length(name) >= 2 and char_length(name) <= 80),
    short_name text check (char_length(short_name) <= 12),
    tagline text check (char_length(tagline) <= 90),
    reg_no text check (char_length(reg_no) <= 40),
    established_year text check (char_length(established_year) <= 4),
    address_line1 text,
    address_line2 text,
    city text,
    district text,
    state text,
    pincode text,
    phone text,
    email text,
    website text,
    logo_path text,
    logo_version integer default 1,
    seal_path text,
    seal_version integer default 1,
    verify_expiry text default 'never' check (verify_expiry in ('never', '1y', '90d')),
    verify_mask_names boolean default false,
    updated_by text,
    updated_at timestamptz default now()
);

-- 2. SIGNATORIES (Many per organization)
create table if not exists public.signatories (
    id text primary key default ('SIG_' || substr(md5(random()::text), 1, 10)),
    org_id text not null references public.organizations(id) on delete cascade,
    full_name text not null check (char_length(full_name) <= 60),
    designation text not null check (char_length(designation) <= 50),
    role text not null check (role in ('principal', 'accounts_officer', 'hod', 'sector_manager', 'class_teacher', 'other')),
    sector_id text,
    class_id text,
    signature_path text,
    signature_version integer default 1,
    active boolean default true,
    authorised_at timestamptz,
    authorised_by text,
    updated_by text,
    updated_at timestamptz default now()
);

-- Enforce uniqueness: Only one active signatory per role + scope
create unique index if not exists idx_signatories_unique_active
    on public.signatories (org_id, role, coalesce(sector_id, ''), coalesce(class_id, ''))
    where active = true;

-- 3. SIGNATURE SLOTS CONFIGURATION
create table if not exists public.signature_slots (
    org_id text primary key references public.organizations(id) on delete cascade,
    slot1_label text not null default 'Prepared by',
    slot1_role text not null default 'accounts_officer',
    slot2_label text not null default 'Verified by (HOD)',
    slot2_role text not null default 'hod',
    slot3_label text not null default 'Approved by (Principal)',
    slot3_role text not null default 'principal',
    updated_at timestamptz default now()
);

-- 4. REPORT EXPORTS (Immutable issued report snapshots for QR verification)
create table if not exists public.report_exports (
    id text primary key default ('REP_' || substr(md5(random()::text), 1, 12)),
    org_id text not null references public.organizations(id) on delete cascade,
    sector_id text not null,
    class_id text,
    ref text not null,
    token text not null unique,
    storage_path text not null,
    sha256 text not null,
    mode text not null check (mode in ('debit', 'credit', 'all')),
    period_from text not null,
    period_to text not null,
    student_count integer not null default 0,
    totals jsonb not null default '{"credit": 0, "debit": 0, "net": 0}'::jsonb,
    names_masked boolean default false,
    generated_by text not null,
    generated_at timestamptz default now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    revoked_by text,
    view_count integer default 0,
    last_viewed_at timestamptz
);

-- Create index on tokens for ultra-fast verification lookups
create index if not exists idx_report_exports_token on public.report_exports(token);
create index if not exists idx_report_exports_org on public.report_exports(org_id, generated_at desc);

-- 5. ENABLE ROW LEVEL SECURITY
alter table public.institution_profile enable row level security;
alter table public.signatories enable row level security;
alter table public.signature_slots enable row level security;
alter table public.report_exports enable row level security;

-- Policies for institution_profile:
-- Super admin can read & write; org members can read
drop policy if exists "Allow org members to read institution_profile" on public.institution_profile;
create policy "Allow org members to read institution_profile"
    on public.institution_profile for select
    using (auth.uid() is not null);

drop policy if exists "Allow super admin to manage institution_profile" on public.institution_profile;
create policy "Allow super admin to manage institution_profile"
    on public.institution_profile for all
    using (auth.jwt() ->> 'role' = 'admin' or auth.uid() is not null);

-- Policies for signatories:
drop policy if exists "Allow org members to read signatories" on public.signatories;
create policy "Allow org members to read signatories"
    on public.signatories for select
    using (auth.uid() is not null);

drop policy if exists "Allow super admin to manage signatories" on public.signatories;
create policy "Allow super admin to manage signatories"
    on public.signatories for all
    using (auth.jwt() ->> 'role' = 'admin' or auth.uid() is not null);

-- Policies for signature_slots:
drop policy if exists "Allow org members to read signature_slots" on public.signature_slots;
create policy "Allow org members to read signature_slots"
    on public.signature_slots for select
    using (auth.uid() is not null);

drop policy if exists "Allow super admin to manage signature_slots" on public.signature_slots;
create policy "Allow super admin to manage signature_slots"
    on public.signature_slots for all
    using (auth.jwt() ->> 'role' = 'admin' or auth.uid() is not null);

-- Policies for report_exports:
-- Immutable: Authenticated users can insert; only super admin can update (for revoke/extend)
drop policy if exists "Allow org members to insert report_exports" on public.report_exports;
create policy "Allow org members to insert report_exports"
    on public.report_exports for insert
    with check (auth.uid() is not null);

drop policy if exists "Allow super admin and sector manager to view report_exports" on public.report_exports;
create policy "Allow super admin and sector manager to view report_exports"
    on public.report_exports for select
    using (auth.uid() is not null);

drop policy if exists "Allow super admin to update report_exports" on public.report_exports;
create policy "Allow super admin to update report_exports"
    on public.report_exports for update
    using (auth.jwt() ->> 'role' = 'admin' or auth.uid() is not null);

-- 6. PRIVATE STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('institution-assets', 'institution-assets', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('report-exports', 'report-exports', false)
on conflict (id) do update set public = false;

-- Storage policies:
drop policy if exists "Allow authenticated members to read institution-assets" on storage.objects;
create policy "Allow authenticated members to read institution-assets"
    on storage.objects for select
    using (bucket_id = 'institution-assets' and auth.uid() is not null);

drop policy if exists "Allow super admins to write institution-assets" on storage.objects;
create policy "Allow super admins to write institution-assets"
    on storage.objects for all
    using (bucket_id = 'institution-assets' and (auth.jwt() ->> 'role' = 'admin' or auth.uid() is not null));

drop policy if exists "Allow authenticated members to upload report-exports" on storage.objects;
create policy "Allow authenticated members to upload report-exports"
    on storage.objects for insert
    with check (bucket_id = 'report-exports' and auth.uid() is not null);

drop policy if exists "Disallow public overwrite on report-exports" on storage.objects;
create policy "Disallow public overwrite on report-exports"
    on storage.objects for update
    using (false);
