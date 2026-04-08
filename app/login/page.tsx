import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/site/brand-mark";
import { getOptionalSession } from "@/lib/auth";

function getLoginErrorMessage(error: string | undefined) {
  if (error === "auth_callback") {
    return "Could not complete Google sign-in. Try again from the login page.";
  }

  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { user } = await getOptionalSession();

  if (user) {
    redirect("/auth/finish");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <BrandMark className="h-10 w-10" />
        </div>
        <h2 className="text-center text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          Continue with Google to access your workspace. Invited teammates should use the same email
          address they were invited with.
        </p>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          Or{" "}
          <Link href="/" className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">
            return to the landing page
          </Link>
          {" "}or{" "}
          <Link href="/guest" className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">
            try a guest invoice
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-surface px-4 py-8 sm:px-10">
          <LoginForm initialError={getLoginErrorMessage(error)} />
        </div>
        <div className="mt-4 text-center text-xs leading-6 text-[var(--muted)]">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">
            terms and disclaimer
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">
            privacy policy
          </Link>
          . DesignBayInvoice is provided as is, and you remain responsible for reviewing all
          invoices, taxes, and exports before relying on them.
        </div>
      </div>
    </main>
  );
}
