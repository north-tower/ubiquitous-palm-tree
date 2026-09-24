"use client";

import {
  fetchInvitePreview,
  isUnauthorized,
  messageFromError,
  portalAcceptInvite,
} from "@/lib/api";
import { savePortalSession } from "@/lib/portal-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export function AcceptPortalInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [preview, setPreview] = useState<{
    valid: boolean;
    firstName?: string;
    tenantName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvitePreview(token).then(setPreview).catch(() => setPreview({ valid: false }));
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await portalAcceptInvite(token, password);
      savePortalSession({ token: session.token, email: session.user.email });
      router.replace("/portal");
    } catch (caught) {
      setError(
        isUnauthorized(caught)
          ? "This invitation is no longer valid."
          : messageFromError(caught),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!preview) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-muted">
        Checking your invitation…
      </main>
    );
  }

  if (!preview.valid) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Invitation expired</h1>
        <p className="mt-2 text-sm text-muted">
          Ask your administrator to resend onboarding from the staff desk.
        </p>
        <Link href="/portal/login" className="mt-6 inline-block text-sm text-accent underline">
          Sign in instead
        </Link>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <p className="text-sm font-medium tracking-[0.16em] text-accent uppercase">
            Welcome{preview.firstName ? `, ${preview.firstName}` : ""}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Set your password
          </h1>
          <p className="mt-2 text-sm text-muted">
            {preview.tenantName
              ? `Create a password for ${preview.tenantName}. You will use it to sign in to your desk any time.`
              : "Create a password to sign in to your desk any time."}
          </p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Confirm password</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Open my desk"}
        </button>
      </form>
    </main>
  );
}
