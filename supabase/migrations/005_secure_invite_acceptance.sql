create or replace function public.accept_organization_invite_for_current_user(invite_id uuid)
returns table (
  ok boolean,
  reason text,
  organization_id uuid,
  invited_email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  current_user_email text;
  invite_record public.organization_invites%rowtype;
  existing_active_membership public.organization_members%rowtype;
  existing_org_membership public.organization_members%rowtype;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select lower(users.email)
  into current_user_email
  from auth.users as users
  where users.id = current_user_id;

  if current_user_email is null or current_user_email = '' then
    raise exception 'Authenticated user email not found';
  end if;

  select *
  into existing_active_membership
  from public.organization_members
  where user_id = current_user_id
    and status = 'active'
  limit 1;

  if found then
    return query
    select false, 'already_member'::text, null::uuid, null::text;
    return;
  end if;

  select *
  into invite_record
  from public.organization_invites
  where id = invite_id
  for update;

  if not found then
    return query
    select false, 'invalid'::text, null::uuid, null::text;
    return;
  end if;

  if invite_record.status = 'revoked' then
    return query
    select false, 'revoked'::text, null::uuid, invite_record.email;
    return;
  end if;

  if invite_record.status = 'accepted' then
    return query
    select false, 'accepted'::text, invite_record.organization_id, invite_record.email;
    return;
  end if;

  if invite_record.status = 'expired' or invite_record.expires_at <= timezone('utc', now()) then
    if invite_record.status = 'pending' and invite_record.expires_at <= timezone('utc', now()) then
      update public.organization_invites
      set status = 'expired'
      where id = invite_record.id;
    end if;

    return query
    select false, 'expired'::text, null::uuid, invite_record.email;
    return;
  end if;

  if lower(invite_record.email) <> current_user_email then
    return query
    select false, 'email_mismatch'::text, null::uuid, invite_record.email;
    return;
  end if;

  select *
  into existing_org_membership
  from public.organization_members
  where organization_id = invite_record.organization_id
    and user_id = current_user_id
  limit 1;

  if found then
    update public.organization_members
    set
      email = current_user_email,
      role = 'member',
      status = 'active'
    where id = existing_org_membership.id;
  else
    insert into public.organization_members (
      organization_id,
      user_id,
      email,
      role,
      status
    )
    values (
      invite_record.organization_id,
      current_user_id,
      current_user_email,
      'member',
      'active'
    );
  end if;

  update public.organization_invites
  set
    status = 'accepted',
    accepted_at = timezone('utc', now()),
    accepted_by_user_id = current_user_id
  where id = invite_record.id;

  return query
  select true, null::text, invite_record.organization_id, invite_record.email;
end;
$$;

grant execute on function public.accept_organization_invite_for_current_user(uuid) to authenticated;

drop policy if exists "organization_members_insert_managed" on public.organization_members;
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
);

drop policy if exists "organization_members_update_managed" on public.organization_members;
create policy "organization_members_update_managed"
on public.organization_members
for update
to authenticated
using (public.is_org_owner(organization_id))
with check (public.is_org_owner(organization_id));

drop policy if exists "organization_invites_update_owned_or_addressed" on public.organization_invites;
create policy "organization_invites_update_owned_or_addressed"
on public.organization_invites
for update
to authenticated
using (public.is_org_owner(organization_id))
with check (public.is_org_owner(organization_id));
