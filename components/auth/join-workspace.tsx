"use client";

import { startTransition, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { acceptOrganizationInvite } from "@/app/actions";
import type { InviteAcceptanceResult, PendingOrganizationInvite } from "@/types/domain";

type JoinWorkspaceProps = {
  invites: PendingOrganizationInvite[];
  userEmail: string;
  embedded?: boolean;
};

function getInviteErrorMessage(result: InviteAcceptanceResult) {
  if (result.ok) {
    return null;
  }

  switch (result.reason) {
    case "invalid":
      return "This invite is no longer available.";
    case "expired":
      return "This invite expired. Ask the organization owner to send a new one.";
    case "revoked":
      return "This invite was revoked by the organization owner.";
    case "accepted":
      return "This invite has already been accepted.";
    case "already_member":
      return "This account already belongs to another organization.";
    case "email_mismatch":
      return `This invite was sent to ${result.invitedEmail}. Sign in with that exact email to join.`;
    case "missing_token":
      return "This invite could not be processed.";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function JoinWorkspace({
  invites,
  userEmail,
  embedded = false,
}: JoinWorkspaceProps) {
  const router = useRouter();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(inviteId: string) {
    setJoiningId(inviteId);
    setError(null);

    try {
      const result = await acceptOrganizationInvite(inviteId);

      if (result.ok || result.reason === "already_member") {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError(getInviteErrorMessage(result));
      router.refresh();
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Unable to join the workspace right now.",
      );
    } finally {
      setJoiningId(null);
    }
  }

  const content = (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card-surface px-6 py-8 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          Workspace access
        </p>
        <h1 className="display-font mt-4 text-4xl leading-none">Join a workspace</h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
          Signed in as <span className="font-medium text-[var(--foreground)]">{userEmail}</span>.
          Choose the workspace you want to join.
        </p>
        {error ? (
          <div className="mt-6 rounded-md border border-[#fec5c3] bg-[#fed3d1] p-4 text-sm font-medium text-[#8a1c08]">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        {invites.map((invite) => (
          <section className="card-surface overflow-hidden" key={invite.id}>
            <div className="px-6 py-5 border-b border-[var(--border)] bg-[#fafbfb]">
              <h2 className="text-xl font-semibold">{invite.organizationName}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Invited email: {invite.email}
              </p>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--muted)]">
                Invite expires {formatDate(invite.expiresAt)}
              </div>
              <button
                className="btn btn-primary shadow-sm justify-center"
                disabled={joiningId === invite.id}
                onClick={() => startTransition(() => handleJoin(invite.id))}
                type="button"
              >
                {joiningId === invite.id ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Join workspace
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16 text-[var(--foreground)]">
      {content}
    </main>
  );
}
