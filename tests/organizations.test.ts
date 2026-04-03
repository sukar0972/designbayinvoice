import { describe, expect, it } from "vitest";

import {
  buildInviteAcceptPath,
  buildInviteRedirectUrl,
  findPendingInviteByEmail,
  isInviteExpired,
  normalizeEmail,
} from "@/lib/organizations";
import type { OrganizationInvite } from "@/types/domain";

describe("organization invite helpers", () => {
  it("normalizes emails for exact matching", () => {
    expect(normalizeEmail("  Owner@Example.com ")).toBe("owner@example.com");
  });

  it("detects invite expiry boundaries", () => {
    const now = new Date("2026-04-02T12:00:00.000Z");

    expect(isInviteExpired("2026-04-02T11:59:59.000Z", now)).toBe(true);
    expect(isInviteExpired("2026-04-02T12:00:00.000Z", now)).toBe(true);
    expect(isInviteExpired("2026-04-02T12:00:01.000Z", now)).toBe(false);
  });

  it("builds the nested auth callback redirect for invite acceptance", () => {
    expect(buildInviteAcceptPath("token-123")).toBe("/invite/accept?token=token-123");
    expect(buildInviteRedirectUrl("https://designbayinvoice.netlify.app", "token-123")).toBe(
      "https://designbayinvoice.netlify.app/auth/callback?next=%2Finvite%2Faccept%3Ftoken%3Dtoken-123",
    );
  });

  it("finds pending invites case-insensitively", () => {
    const invites: OrganizationInvite[] = [
      {
        id: "1",
        organizationId: "org",
        invitedByUserId: "owner",
        email: "teammate@example.com",
        token: "token-a",
        status: "pending",
        expiresAt: "2026-04-09T00:00:00.000Z",
        createdAt: "2026-04-02T00:00:00.000Z",
      },
      {
        id: "2",
        organizationId: "org",
        invitedByUserId: "owner",
        email: "former@example.com",
        token: "token-b",
        status: "revoked",
        expiresAt: "2026-04-09T00:00:00.000Z",
        createdAt: "2026-04-02T00:00:00.000Z",
      },
    ];

    expect(findPendingInviteByEmail(invites, "TEAMMATE@example.com")?.id).toBe("1");
    expect(findPendingInviteByEmail(invites, "former@example.com")).toBeUndefined();
  });
});
