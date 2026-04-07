create or replace function public.leave_current_workspace(confirm_destroy boolean default false)
returns table (
  ok boolean,
  reason text,
  organization_id uuid,
  transferred_owner_email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  current_membership public.organization_members%rowtype;
  successor_membership public.organization_members%rowtype;
  successor_email text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into current_membership
  from public.organization_members
  where user_id = current_user_id
    and status = 'active'
  order by created_at asc
  limit 1
  for update;

  if not found then
    return query
    select false, 'not_member'::text, null::uuid, null::text;
    return;
  end if;

  if current_membership.role = 'owner' then
    select *
    into successor_membership
    from public.organization_members
    where public.organization_members.organization_id = current_membership.organization_id
      and public.organization_members.status = 'active'
      and public.organization_members.user_id <> current_user_id
    order by created_at asc
    limit 1
    for update;

    if not found then
      if not confirm_destroy then
        return query
        select false, 'last_owner'::text, current_membership.organization_id, null::text;
        return;
      end if;

      delete from public.organizations
      where id = current_membership.organization_id;

      return query
      select true, 'workspace_deleted'::text, current_membership.organization_id, null::text;
      return;
    end if;

    update public.organization_members
    set role = 'owner'
    where id = successor_membership.id;

    update public.organizations
    set owner_user_id = successor_membership.user_id
    where id = current_membership.organization_id;

    select lower(users.email)
    into successor_email
    from auth.users as users
    where users.id = successor_membership.user_id;
  end if;

  update public.organization_members
  set status = 'removed'
  where id = current_membership.id;

  return query
  select true, null::text, current_membership.organization_id, successor_email;
end;
$$;

grant execute on function public.leave_current_workspace(boolean) to authenticated;
