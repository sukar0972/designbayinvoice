create extension if not exists pgcrypto;

create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null default '',
  email text,
  phone text,
  address1 text,
  address2 text,
  city text,
  province text,
  postal_code text,
  country text not null default 'Canada',
  business_number text,
  tax_registrations jsonb not null default '[]'::jsonb,
  invoice_prefix text not null default 'INV',
  next_invoice_sequence integer not null default 1,
  default_currency text not null default 'CAD' check (default_currency in ('CAD', 'USD')),
  default_payment_methods jsonb not null default '[]'::jsonb,
  default_notes text not null default '',
  logo_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  sequence_number integer not null,
  status text not null check (status in ('draft', 'issued', 'partially_paid', 'paid', 'void')),
  currency_code text not null check (currency_code in ('CAD', 'USD')),
  issue_date date not null,
  due_date date not null,
  project_reference text,
  bill_to jsonb not null,
  company_snapshot jsonb not null,
  line_items jsonb not null,
  tax_lines jsonb not null default '[]'::jsonb,
  payment_methods jsonb not null default '[]'::jsonb,
  notes text not null default '',
  amount_paid numeric(12,2) not null default 0,
  subtotal_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists invoices_user_invoice_number_idx
  on public.invoices (user_id, invoice_number);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists handle_business_profiles_updated_at on public.business_profiles;
create trigger handle_business_profiles_updated_at
before update on public.business_profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists handle_invoices_updated_at on public.invoices;
create trigger handle_invoices_updated_at
before update on public.invoices
for each row
execute function public.handle_updated_at();

alter table public.business_profiles enable row level security;
alter table public.invoices enable row level security;

create policy "business_profiles_select_own"
on public.business_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "business_profiles_insert_own"
on public.business_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "business_profiles_update_own"
on public.business_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "invoices_select_own"
on public.invoices
for select
to authenticated
using (auth.uid() = user_id);

create policy "invoices_insert_own"
on public.invoices
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "invoices_update_own"
on public.invoices
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "invoices_delete_own"
on public.invoices
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.reserve_invoice_sequence()
returns table (sequence_number integer, invoice_number text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_sequence integer;
  current_prefix text;
begin
  update public.business_profiles
  set next_invoice_sequence = next_invoice_sequence + 1
  where user_id = auth.uid()
  returning next_invoice_sequence - 1, invoice_prefix
  into current_sequence, current_prefix;

  if current_sequence is null then
    raise exception 'Business profile not found for authenticated user';
  end if;

  return query
  select
    current_sequence,
    upper(coalesce(nullif(trim(current_prefix), ''), 'INV')) || '-' ||
    to_char(current_date, 'YYYY') || '-' ||
    lpad(current_sequence::text, 3, '0');
end;
$$;

grant execute on function public.reserve_invoice_sequence() to authenticated;

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', false)
on conflict (id) do nothing;

create policy "branding_assets_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'branding-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "branding_assets_insert_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'branding-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "branding_assets_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'branding-assets' and auth.uid()::text = (storage.foldername(name))[1]);
