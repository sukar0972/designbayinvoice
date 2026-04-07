import { JoinWorkspace } from "@/components/auth/join-workspace";
import { CurrentWorkspaceCard } from "@/components/auth/current-workspace-card";
import { requireUser } from "@/lib/auth";
import {
  getOrganizationContextForUser,
  getPendingInvitesForCurrentUser,
} from "@/lib/data";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function WorkspacesPage() {
  const { supabase, user } = await requireUser();
  const [context, invites] = await Promise.all([
    getOrganizationContextForUser(supabase, user),
    getPendingInvitesForCurrentUser(),
  ]);

  if (!context && invites.length > 0) {
    return <JoinWorkspace invites={invites} userEmail={user.email ?? ""} embedded />;
  }

  if (!context && invites.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="card-surface overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[#fafbfb] px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Workspaces
            </p>
            <h1 className="display-font mt-3 text-4xl leading-none">Workspace access</h1>
            <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
              Signed in as <span className="font-medium text-[var(--foreground)]">{user.email}</span>.
            </p>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                No active workspace
              </h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                This account is not currently attached to a workspace and has no pending invites.
                Ask a workspace owner to invite this email address, or sign out and use a different
                account.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const activeContext = context!;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="card-surface overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[#fafbfb] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            Workspaces
          </p>
          <h1 className="display-font mt-3 text-4xl leading-none">Workspace access</h1>
          <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
            Signed in as <span className="font-medium text-[var(--foreground)]">{user.email}</span>.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <CurrentWorkspaceCard
            hasPendingInvites={invites.length > 0}
            role={activeContext.membership.role}
            workspaceName={
              activeContext.organization.name || activeContext.profile.companyName || "Workspace"
            }
          />

          {invites.length > 0 ? (
            <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-5">
              <p className="text-sm font-medium text-[#92400e]">
                This account already belongs to a workspace. Pending invites are visible below, but
                they cannot be accepted until this account is removed from its current workspace.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[#fafbfb] p-5 text-sm text-[var(--muted)]">
              No other pending workspace invites were found for this account.
            </div>
          )}
        </div>
      </section>

      {invites.length > 0 ? (
        <section className="card-surface overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[#fafbfb] px-6 py-4">
            <h2 className="text-base font-semibold">Pending invites</h2>
          </div>
          <div className="grid gap-4 px-6 py-5">
            {invites.map((invite) => (
              <article
                className="rounded-2xl border border-[var(--border)] bg-white p-5"
                key={invite.id}
              >
                <h3 className="text-xl font-semibold text-[var(--foreground)]">
                  {invite.organizationName}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Invited email: {invite.email}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Expires {formatDateTime(invite.expiresAt)}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
