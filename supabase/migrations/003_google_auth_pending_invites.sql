create or replace function public.get_pending_invites_for_current_user()
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
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
    organizations.name as organization_name,
    organization_invites.invited_by_user_id,
    organization_invites.email,
    organization_invites.token,
    organization_invites.status,
    organization_invites.expires_at,
    organization_invites.accepted_at,
    organization_invites.accepted_by_user_id,
    organization_invites.created_at
  from public.organization_invites
  join public.organizations
    on organizations.id = organization_invites.organization_id
  where lower(organization_invites.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and organization_invites.status = 'pending'
    and organization_invites.expires_at > timezone('utc', now())
  order by organization_invites.created_at desc
$$;

grant execute on function public.get_pending_invites_for_current_user() to authenticated;
