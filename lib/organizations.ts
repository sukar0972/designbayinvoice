import type { OrganizationInvite } from "@/types/domain";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInviteExpired(expiresAt: string, now = new Date()) {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function findPendingInviteByEmail(
  invites: OrganizationInvite[],
  email: string,
) {
  const normalized = normalizeEmail(email);
  return invites.find(
    (invite) =>
      invite.status === "pending" && normalizeEmail(invite.email) === normalized,
  );
}
