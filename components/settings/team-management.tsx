"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, Mail, ShieldCheck, UserMinus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  inviteOrganizationMember,
  removeOrganizationMember,
  revokeOrganizationInvite,
} from "@/app/actions";
import { env } from "@/lib/env";
import { buildInviteRedirectUrl } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/client";
import type {
  OrganizationInvite,
  OrganizationMember,
  OrganizationRole,
} from "@/types/domain";

type TeamManagementProps = {
  currentMemberRole: OrganizationRole;
  invites: OrganizationInvite[];
  members: OrganizationMember[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatInviteStatus(invite: OrganizationInvite) {
  if (invite.status === "pending" && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }

  return invite.status;
}

export function TeamManagement({
  currentMemberRole,
  invites,
  members,
}: TeamManagementProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const canManage = currentMemberRole === "owner";

  const activeMembers = members.filter((member) => member.status === "active");

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    setInviting(true);
    setError(null);
    setMessage(null);

    try {
      const invite = await inviteOrganizationMember(inviteEmail);
      const origin =
        env.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: invite.email,
        options: {
          emailRedirectTo: buildInviteRedirectUrl(origin, invite.token),
        },
      });

      if (sendError) {
        setError(
          "Invite was created, but the email could not be sent. You can retry with the same address.",
        );
        router.refresh();
        return;
      }

      setInviteEmail("");
      setMessage(`Invite sent to ${invite.email}. It will expire in 7 days.`);
      router.refresh();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to send the invitation right now.",
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    setError(null);
    setMessage(null);

    try {
      await removeOrganizationMember(memberId);
      setMessage("Member removed.");
      router.refresh();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the member right now.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRevoke(inviteId: string) {
    setRevokingId(inviteId);
    setError(null);
    setMessage(null);

    try {
      await revokeOrganizationInvite(inviteId);
      setMessage("Invite revoked.");
      router.refresh();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Unable to revoke the invite right now.",
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="card-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[#fafbfb]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Team access</h2>
            <p className="text-sm text-[var(--muted)]">
              Owners can invite teammates into the same business workspace.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {currentMemberRole}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {message ? (
          <div className="rounded-md border border-[#bae6fd] bg-[#e0f2fe] p-4 text-sm font-medium text-[#006eb3]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-[#fec5c3] bg-[#fed3d1] p-4 text-sm font-medium text-[#8a1c08]">
            {error}
          </div>
        ) : null}

        {canManage ? (
          <form className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[#fafbfb] p-4 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleInvite}>
            <div>
              <label className="field-label">Invite teammate by email</label>
              <input
                className="field"
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <button className="btn btn-primary shadow-sm" disabled={inviting} type="submit">
                {inviting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
                Send invite
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[#fafbfb] p-4 text-sm text-[var(--muted)]">
            Only the organization owner can invite or remove teammates.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Active members
              </h3>
              <span className="text-sm text-[var(--muted)]">{activeMembers.length}</span>
            </div>

            {activeMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                No active members yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activeMembers.map((member) => (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4" key={member.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{member.email}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="rounded-full bg-[#f2f4f7] px-2 py-1 font-medium uppercase tracking-[0.14em]">
                          {member.role}
                        </span>
                        <span>Joined {formatDateTime(member.createdAt)}</span>
                      </div>
                    </div>

                    {canManage && member.role !== "owner" ? (
                      <button
                        className="btn btn-secondary text-xs !py-1.5 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1]"
                        disabled={removingId === member.id}
                        onClick={() => void handleRemove(member.id)}
                        type="button"
                      >
                        {removingId === member.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="mr-1 h-3.5 w-3.5" />
                        )}
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Invites
              </h3>
              <span className="text-sm text-[var(--muted)]">{invites.length}</span>
            </div>

            {invites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                No invites have been sent yet.
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const inviteStatus = formatInviteStatus(invite);

                  return (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-4" key={invite.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{invite.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                          <span className="rounded-full bg-[#f2f4f7] px-2 py-1 font-medium uppercase tracking-[0.14em]">
                            {inviteStatus}
                          </span>
                          <span>Created {formatDateTime(invite.createdAt)}</span>
                          <span>Expires {formatDateTime(invite.expiresAt)}</span>
                        </div>
                      </div>

                      {canManage && invite.status === "pending" ? (
                        <button
                          className="btn btn-secondary text-xs !py-1.5 text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1]"
                          disabled={revokingId === invite.id}
                          onClick={() => void handleRevoke(invite.id)}
                          type="button"
                        >
                          {revokingId === invite.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                          )}
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
