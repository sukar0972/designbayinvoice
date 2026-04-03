create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create unique index if not exists organization_members_user_active_idx
  on public.organization_members (user_id)
  where status = 'active';

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists organization_invites_pending_email_idx
  on public.organization_invites (organization_id, lower(email))
  where status = 'pending';

drop trigger if exists handle_organizations_updated_at on public.organizations;
create trigger handle_organizations_updated_at
before update on public.organizations
for each row
execute function public.handle_updated_at();

alter table public.business_profiles add column if not exists organization_id uuid;
alter table public.invoices add column if not exists organization_id uuid;

insert into public.organizations (id, owner_user_id, name)
select
  source.owner_user_id,
  source.owner_user_id,
  max(source.organization_name)
from (
  select
    business_profiles.user_id as owner_user_id,
    coalesce(business_profiles.company_name, '') as organization_name
  from public.business_profiles
  where business_profiles.user_id is not null

  union all

  select
    invoices.user_id as owner_user_id,
    '' as organization_name
  from public.invoices
  where invoices.user_id is not null
) source
group by source.owner_user_id
on conflict (id) do nothing;

update public.business_profiles
set organization_id = user_id
where organization_id is null
  and user_id is not null;

update public.invoices
set organization_id = user_id
where organization_id is null
  and user_id is not null;

insert into public.organization_members (
  organization_id,
  user_id,
  email,
  role,
  status
)
select
  organizations.id,
  organizations.owner_user_id,
  lower(coalesce(users.email, '')),
  'owner',
  'active'
from public.organizations
join auth.users as users
  on users.id = organizations.owner_user_id
on conflict (organization_id, user_id) do update
set
  email = excluded.email,
  role = excluded.role,
  status = 'active';

alter table public.business_profiles alter column organization_id set not null;
alter table public.invoices alter column organization_id set not null;

alter table public.business_profiles drop constraint if exists business_profiles_pkey;
alter table public.business_profiles add constraint business_profiles_pkey primary key (organization_id);

alter table public.business_profiles alter column user_id drop not null;
alter table public.invoices alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_profiles_organization_id_fkey'
  ) then
    alter table public.business_profiles
      add constraint business_profiles_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_organization_id_fkey'
  ) then
    alter table public.invoices
      add constraint invoices_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete cascade;
  end if;
end
$$;

drop index if exists public.invoices_user_invoice_number_idx;
create unique index if not exists invoices_organization_invoice_number_idx
  on public.invoices (organization_id, invoice_number);

drop policy if exists "business_profiles_select_own" on public.business_profiles;
drop policy if exists "business_profiles_insert_own" on public.business_profiles;
drop policy if exists "business_profiles_update_own" on public.business_profiles;
drop policy if exists "invoices_select_own" on public.invoices;
drop policy if exists "invoices_insert_own" on public.invoices;
drop policy if exists "invoices_update_own" on public.invoices;
drop policy if exists "invoices_delete_own" on public.invoices;
drop policy if exists "branding_assets_select_own" on storage.objects;
drop policy if exists "branding_assets_insert_own" on storage.objects;
drop policy if exists "branding_assets_update_own" on storage.objects;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

create or replace function public.current_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
    and status = 'active'
  order by created_at asc
  limit 1
$$;

create or replace function public.is_active_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  )
$$;

create or replace function public.is_org_owner(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  )
$$;

create or replace function public.lookup_invite_by_token(invite_token uuid)
returns table (
  id uuid,
  organization_id uuid,
  invited_by_user_id uuid,
  email text,
  token uuid,
  status text,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by_user_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    organization_invites.id,
    organization_invites.organization_id,
    organization_invites.invited_by_user_id,
    organization_invites.email,
    organization_invites.token,
    organization_invites.status,
    organization_invites.expires_at,
    organization_invites.accepted_at,
    organization_invites.accepted_by_user_id,
    organization_invites.created_at
  from public.organization_invites
  where organization_invites.token = invite_token
  limit 1
$$;

create or replace function public.reserve_invoice_sequence()
returns table (sequence_number integer, invoice_number text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_sequence integer;
  current_prefix text;
  org_id uuid;
begin
  org_id := public.current_organization_id();

  update public.business_profiles
  set next_invoice_sequence = next_invoice_sequence + 1
  where organization_id = org_id
  returning next_invoice_sequence - 1, invoice_prefix
  into current_sequence, current_prefix;

  if current_sequence is null then
    raise exception 'Business profile not found for authenticated organization';
  end if;

  return query
  select
    current_sequence,
    upper(coalesce(nullif(trim(current_prefix), ''), 'INV')) || '-' ||
    to_char(current_date, 'YYYY') || '-' ||
    lpad(current_sequence::text, 3, '0');
end;
$$;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_active_org_member(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.lookup_invite_by_token(uuid) to authenticated;
grant execute on function public.reserve_invoice_sequence() to authenticated;

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (public.is_active_org_member(id));

create policy "organizations_insert_owner"
on public.organizations
for insert
to authenticated
with check (id = auth.uid() and owner_user_id = auth.uid());

create policy "organizations_update_owner"
on public.organizations
for update
to authenticated
using (public.is_org_owner(id))
with check (public.is_org_owner(id));

create policy "organization_members_select_visible"
on public.organization_members
for select
to authenticated
using (public.is_active_org_member(organization_id) or user_id = auth.uid());

create policy "organization_members_insert_managed"
on public.organization_members
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and role = 'owner'
    and status = 'active'
    and organization_id = auth.uid()
  )
  or public.is_org_owner(organization_id)
  or (
    user_id = auth.uid()
    and role = 'member'
    and status = 'active'
    and exists (
      select 1
      from public.organization_invites
      where organization_invites.organization_id = organization_members.organization_id
        and lower(organization_invites.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and organization_invites.status = 'pending'
        and organization_invites.expires_at > timezone('utc', now())
    )
  )
);

create policy "organization_members_update_managed"
on public.organization_members
for update
to authenticated
using (
  public.is_org_owner(organization_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organization_invites
      where organization_invites.organization_id = organization_members.organization_id
        and lower(organization_invites.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and organization_invites.status = 'pending'
        and organization_invites.expires_at > timezone('utc', now())
    )
  )
)
with check (
  public.is_org_owner(organization_id)
  or (
    user_id = auth.uid()
    and role = 'member'
    and status = 'active'
    and exists (
      select 1
      from public.organization_invites
      where organization_invites.organization_id = organization_members.organization_id
        and lower(organization_invites.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and organization_invites.status = 'pending'
        and organization_invites.expires_at > timezone('utc', now())
    )
  )
);

create policy "organization_invites_select_owned_or_addressed"
on public.organization_invites
for select
to authenticated
using (
  public.is_org_owner(organization_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "organization_invites_insert_owner"
on public.organization_invites
for insert
to authenticated
with check (
  public.is_org_owner(organization_id)
  and invited_by_user_id = auth.uid()
  and status = 'pending'
);

create policy "organization_invites_update_owned_or_addressed"
on public.organization_invites
for update
to authenticated
using (
  public.is_org_owner(organization_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_org_owner(organization_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "business_profiles_select_org"
on public.business_profiles
for select
to authenticated
using (public.is_active_org_member(organization_id));

create policy "business_profiles_insert_org"
on public.business_profiles
for insert
to authenticated
with check (public.is_org_owner(organization_id));

create policy "business_profiles_update_org"
on public.business_profiles
for update
to authenticated
using (public.is_active_org_member(organization_id))
with check (public.is_active_org_member(organization_id));

create policy "invoices_select_org"
on public.invoices
for select
to authenticated
using (public.is_active_org_member(organization_id));

create policy "invoices_insert_org"
on public.invoices
for insert
to authenticated
with check (public.is_active_org_member(organization_id));

create policy "invoices_update_org"
on public.invoices
for update
to authenticated
using (public.is_active_org_member(organization_id))
with check (public.is_active_org_member(organization_id));

create policy "invoices_delete_org"
on public.invoices
for delete
to authenticated
using (public.is_active_org_member(organization_id));

create policy "branding_assets_select_org"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'branding-assets'
  and public.current_organization_id()::text = (storage.foldername(name))[1]
);

create policy "branding_assets_insert_org"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'branding-assets'
  and public.current_organization_id()::text = (storage.foldername(name))[1]
);

create policy "branding_assets_update_org"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'branding-assets'
  and public.current_organization_id()::text = (storage.foldername(name))[1]
);
