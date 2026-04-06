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

grant execute on function public.reserve_invoice_sequence() to authenticated;
