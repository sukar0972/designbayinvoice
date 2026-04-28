create index if not exists invoices_organization_created_at_idx
  on public.invoices (organization_id, created_at desc);

create index if not exists invoices_organization_id_idx
  on public.invoices (organization_id, id);

create index if not exists organization_invites_email_status_expires_idx
  on public.organization_invites (lower(email), status, expires_at);

create index if not exists organization_invites_organization_status_created_idx
  on public.organization_invites (organization_id, status, created_at desc);

create index if not exists organization_members_organization_created_idx
  on public.organization_members (organization_id, created_at);
