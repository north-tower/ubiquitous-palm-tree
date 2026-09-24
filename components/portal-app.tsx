"use client";

import { PortalScreen } from "@/components/portal-screen";
import {
  createPortalApi,
  isUnauthorized,
  messageFromError,
  portalLogin,
} from "@/lib/api";
import {
  clearPortalSession,
  loadPortalSession,
  savePortalSession,
} from "@/lib/portal-session";
import type { PortalSession } from "@/lib/types";
import { useCallback, useEffect, useState, type FormEvent } from "react";

export function PortalApp() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<PortalSession | null>(null);

  const logout = useCallback(() => {
    clearPortalSession();
    setSession(null);
  }, []);

  useEffect(() => {
    const saved = loadPortalSession();
    if (!saved) {
      setBooting(false);
      return;
    }
    createPortalApi(saved.token)
      .me()
      .then((user) => {
        setSession({ token: saved.token, user });
      })
      .catch(() => {
        clearPortalSession();
      })
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-muted">
        Opening your desk…
      </main>
    );
  }

  if (!session) {
    return (
      <PortalLogin
        onSuccess={(next) => {
          savePortalSession({ token: next.token, email: next.user.email });
          setSession(next);
        }}
      />
    );
  }

  return <PortalScreen session={session} onLogout={logout} />;
}

function PortalLogin({
  onSuccess,
}: {
  onSuccess: (session: PortalSession) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const next = await portalLogin(email.trim(), password);
      onSuccess(next);
    } catch (caught) {
      setError(
        isUnauthorized(caught)
          ? "Those credentials were not accepted."
          : messageFromError(caught),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <p className="text-sm font-medium tracking-[0.16em] text-accent uppercase">
            Tenant portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Use the email and password you set when you accepted your invitation.
          </p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
