import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

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

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--accent)] text-white shadow-sm">
            <span className="font-bold text-xl leading-none">D</span>
          </div>
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
      </div>
    </main>
  );
}
