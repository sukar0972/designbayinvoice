import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
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
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
