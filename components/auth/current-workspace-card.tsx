"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { leaveCurrentWorkspace } from "@/app/actions";
import { ConfirmDialog } from "@/components/shell/confirm-dialog";
import type { OrganizationRole } from "@/types/domain";

type CurrentWorkspaceCardProps = {
  workspaceName: string;
  role: OrganizationRole;
  hasPendingInvites: boolean;
};

export function CurrentWorkspaceCard({
  workspaceName,
  role,
  hasPendingInvites,
}: CurrentWorkspaceCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDestroyOpen, setConfirmDestroyOpen] = useState(false);

  async function handleLeaveWorkspace(destroyWorkspace = false) {
    setPending(true);
    setError(null);

    try {
      const result = await leaveCurrentWorkspace({ destroyWorkspace });

      if (!result.ok) {
        setError(result.error);
        setConfirmDestroyOpen(Boolean(result.requiresWorkspaceDeletionConfirmation));
        return;
      }

      setConfirmDestroyOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Current workspace
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{workspaceName}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Role: <span className="font-medium text-[var(--foreground)]">{role}</span>
      </p>
      {error ? (
        <div className="mt-4 rounded-md border border-[#fec5c3] bg-[#fed3d1] p-4 text-sm font-medium text-[#8a1c08]">
          {error}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="btn btn-primary shadow-sm" href="/dashboard">
          Go to dashboard
        </Link>
        <button
          className="btn btn-secondary shadow-sm text-[var(--danger)] hover:bg-[#fed3d1] hover:border-[#fed3d1]"
          disabled={pending}
          onClick={() => startTransition(() => void handleLeaveWorkspace())}
          type="button"
        >
          {pending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-1.5 h-4 w-4" />
          )}
          Leave workspace
        </button>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Leaving removes this account from the current workspace.
        {role === "owner"
          ? " If another active member exists, ownership will transfer automatically. If you are the only active member, you can choose to permanently delete the workspace."
          : ""}
        {hasPendingInvites
          ? " After leaving, you can accept a pending invite below."
          : ""}
      </p>
      <ConfirmDialog
        cancelLabel="Keep workspace"
        confirmLabel="Delete workspace"
        description="You are the only active member in this workspace. Deleting it will permanently remove the workspace, invoices, settings, pending invites, and billing profile."
        loading={pending}
        onCancel={() => setConfirmDestroyOpen(false)}
        onConfirm={() => {
          startTransition(() => void handleLeaveWorkspace(true));
        }}
        open={confirmDestroyOpen}
        title="Delete this workspace permanently?"
      />
    </div>
  );
}
