import type { OrganizationInvite } from "@/types/domain";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInviteExpired(expiresAt: string, now = new Date()) {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function buildInviteAcceptPath(token: string) {
  return `/invite/accept?token=${token}`;
}

export function buildInviteRedirectUrl(origin: string, token: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", buildInviteAcceptPath(token));
  return callbackUrl.toString();
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
