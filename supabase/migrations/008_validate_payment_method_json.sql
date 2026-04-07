create or replace function public.payment_methods_are_valid(methods jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  item jsonb;
  preferred_count integer := 0;
begin
  if jsonb_typeof(methods) <> 'array' then
    return false;
  end if;

  if jsonb_array_length(methods) > 8 then
    return false;
  end if;

  for item in
    select value
    from jsonb_array_elements(methods)
  loop
    if jsonb_typeof(item) <> 'object' then
      return false;
    end if;

    if exists (
      select 1
      from jsonb_object_keys(item) as key_name
      where key_name not in (
        'id',
        'label',
        'details',
        'preferred',
        'processingFeeEnabled',
        'processingFeePercent',
        'processingFeeFlatAmount',
        'stripePaymentLink',
        'stripeQrEnabled'
      )
    ) then
      return false;
    end if;

    if coalesce(length(item->>'id'), 0) = 0 or length(item->>'id') > 120 then
      return false;
    end if;

    if coalesce(length(item->>'label'), 0) = 0 or length(item->>'label') > 80 then
      return false;
    end if;

    if length(coalesce(item->>'details', '')) > 1000 then
      return false;
    end if;

    if item ? 'preferred' and jsonb_typeof(item->'preferred') <> 'boolean' then
      return false;
    end if;

    if coalesce((item->>'preferred')::boolean, false) then
      preferred_count := preferred_count + 1;
    end if;

    if item ? 'processingFeeEnabled' and jsonb_typeof(item->'processingFeeEnabled') <> 'boolean' then
      return false;
    end if;

    if item ? 'processingFeePercent' then
      if jsonb_typeof(item->'processingFeePercent') <> 'number' then
        return false;
      end if;

      if (item->>'processingFeePercent')::numeric < 0 or (item->>'processingFeePercent')::numeric > 100 then
        return false;
      end if;
    end if;

    if item ? 'processingFeeFlatAmount' then
      if jsonb_typeof(item->'processingFeeFlatAmount') <> 'number' then
        return false;
      end if;

      if (item->>'processingFeeFlatAmount')::numeric < 0 or (item->>'processingFeeFlatAmount')::numeric > 100000 then
        return false;
      end if;
    end if;

    if item ? 'stripePaymentLink' then
      if jsonb_typeof(item->'stripePaymentLink') <> 'string' then
        return false;
      end if;

      if length(item->>'stripePaymentLink') > 500 then
        return false;
      end if;

      if item->>'stripePaymentLink' <> '' and item->>'stripePaymentLink' !~ '^https://[^[:space:]]+$' then
        return false;
      end if;

      if item->>'stripePaymentLink' <> '' and coalesce(item->>'label', '') !~* 'card' then
        return false;
      end if;
    end if;

    if item ? 'stripeQrEnabled' and jsonb_typeof(item->'stripeQrEnabled') <> 'boolean' then
      return false;
    end if;

    if coalesce((item->>'stripeQrEnabled')::boolean, false) and coalesce(item->>'stripePaymentLink', '') = '' then
      return false;
    end if;

    if coalesce((item->>'stripeQrEnabled')::boolean, false) and coalesce(item->>'label', '') !~* 'card' then
      return false;
    end if;
  end loop;

  if preferred_count > 1 then
    return false;
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

alter table public.business_profiles
  drop constraint if exists business_profiles_default_payment_methods_valid;

alter table public.business_profiles
  add constraint business_profiles_default_payment_methods_valid
  check (public.payment_methods_are_valid(default_payment_methods));

alter table public.invoices
  drop constraint if exists invoices_payment_methods_valid;

alter table public.invoices
  add constraint invoices_payment_methods_valid
  check (public.payment_methods_are_valid(payment_methods));
