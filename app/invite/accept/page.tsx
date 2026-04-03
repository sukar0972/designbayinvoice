import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { acceptOrganizationInviteForCurrentUser } from "@/lib/data";

function getInviteMessage(result: Awaited<ReturnType<typeof acceptOrganizationInviteForCurrentUser>>) {
  if (result.ok) {
    return null;
  }

  switch (result.reason) {
    case "missing_token":
      return "This invite link is missing its token.";
    case "invalid":
      return "This invite link is invalid or no longer exists.";
    case "expired":
      return "This invite has expired. Ask the organization owner to send a new one.";
    case "revoked":
      return "This invite was revoked by the organization owner.";
    case "accepted":
      return "This invite has already been accepted.";
    case "already_member":
      return "This account already belongs to another organization.";
    case "email_mismatch":
      return `This invite was sent to ${result.invitedEmail}. Sign in with that exact email to join.`;
  }
}

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await acceptOrganizationInviteForCurrentUser(token);

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-4 py-16 text-[#181818]">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#5a6a9b]">
          Organization invite
        </p>
        <h1 className="display-font mt-4 text-4xl leading-none">Unable to join workspace</h1>
        <p className="mt-4 text-base text-[#5b5b5b]">{getInviteMessage(result)}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary shadow-sm" href="/login">
            Back to login
          </Link>
          <Link className="btn btn-secondary shadow-sm" href="/dashboard">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
