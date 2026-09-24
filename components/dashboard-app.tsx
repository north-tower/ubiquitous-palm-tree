"use client";

import {
  createDashboardApi,
  isUnauthorized,
  messageFromError,
} from "@/lib/api";
import { flowLabel, formatPhone } from "@/lib/format";
import { clearCredentials, loadCredentials, saveCredentials } from "@/lib/session";
import {
  TENANT_FLOW_OPTIONS,
  type BaileysSessionStatus,
  type DashboardTenantSummary,
  type DashboardTenantWhatsapp,
  type TenantFlow,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ConversationsPanel } from "./conversations-panel";
import { OverviewPanel } from "./overview-panel";
import { StatusDot } from "./status-pill";
import { WhatsappPanel } from "./whatsapp-panel";

type Tab = "overview" | "conversations" | "whatsapp";

export function DashboardApp() {
  const [booting, setBooting] = useState(true);
  const [credentials, setCredentials] = useState<ReturnType<typeof loadCredentials>>(null);
  const logout = useCallback(() => {
    clearCredentials();
    setCredentials(null);
  }, []);

  useEffect(() => {
    const saved = loadCredentials();
    const check = saved
      ? createDashboardApi(saved)
          .listTenants()
          .then(
            () => saved,
            () => {
              clearCredentials();
              return null;
            },
          )
      : Promise.resolve(null);
    check.then((next) => {
      setCredentials(next);
      setBooting(false);
    });
  }, []);

  if (booting) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-muted">
        Opening the desk…
      </main>
    );
  }

  if (!credentials) {
    return <LoginScreen onSuccess={setCredentials} />;
  }

  return <Desk credentials={credentials} onLogout={logout} />;
}

function LoginScreen({
  onSuccess,
}: {
  onSuccess: (credentials: { user: string; pass: string }) => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { user: user.trim(), pass };
    setSubmitting(true);
    setError(null);
    try {
      await createDashboardApi(next).listTenants();
      saveCredentials(next);
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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
      <section className="hidden bg-sidebar px-12 py-16 text-stone-100 lg:flex lg:flex-col lg:justify-between">
        <p className="text-sm font-medium tracking-[0.18em] text-emerald-200 uppercase">
          WhatsApp desk
        </p>
        <div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight">
            Tenants, live links, and the conversations behind them.
          </h1>
          <p className="mt-4 max-w-md text-stone-300">
            Sign in with the dashboard user from the API. The browser talks to
            this app, and this app forwards each call to the backend.
          </p>
        </div>
        <p className="text-sm text-stone-400">Nairobi day boundaries on the overview.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div className="lg:hidden">
            <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">
              WhatsApp desk
            </p>
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted">
            Use <span className="font-medium">DASHBOARD_BASIC_AUTH_USER</span> and{" "}
            <span className="font-medium">DASHBOARD_BASIC_AUTH_PASSWORD</span> from
            the API environment.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">User</span>
            <input
              autoComplete="username"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              required
              className="w-full rounded-xl border border-line bg-card px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(event) => setPass(event.target.value)}
              required
              className="w-full rounded-xl border border-line bg-card px-3 py-2"
            />
          </label>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-accent px-4 py-2.5 font-semibold text-accent-ink disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Desk({
  credentials,
  onLogout,
}: {
  credentials: { user: string; pass: string };
  onLogout: () => void;
}) {
  const api = useMemo(() => createDashboardApi(credentials), [credentials]);
  const [tenants, setTenants] = useState<DashboardTenantSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [link, setLink] = useState<{
    tenantId: string;
    data: DashboardTenantWhatsapp;
  } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [listError, setListError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [flow, setFlow] = useState<TenantFlow>("techfind_demo");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const listRequest = useRef(0);

  const logout = onLogout;

  const refreshTenants = useCallback(
    async (preferId?: string) => {
      const requestId = ++listRequest.current;
      try {
        const rows = await api.listTenants();
        if (requestId !== listRequest.current) {
          return false;
        }
        setTenants(rows);
        setListError(null);
        setSelectedId((current) => {
          const preferred = preferId ?? current;
          if (preferred && rows.some((row) => row.id === preferred)) {
            return preferred;
          }
          return rows[0]?.id ?? null;
        });
        return true;
      } catch (caught) {
        if (requestId !== listRequest.current) {
          return false;
        }
        if (isUnauthorized(caught)) {
          logout();
          return false;
        }
        setListError(messageFromError(caught));
        return false;
      }
    },
    [api, logout],
  );

  useEffect(() => {
    let cancelled = false;
    const requestId = ++listRequest.current;
    api.listTenants().then(
      (rows) => {
        if (cancelled || requestId !== listRequest.current) {
          return;
        }
        setTenants(rows);
        setListError(null);
        setSelectedId((current) => {
          if (current && rows.some((row) => row.id === current)) {
            return current;
          }
          return rows[0]?.id ?? null;
        });
      },
      (caught: unknown) => {
        if (cancelled || requestId !== listRequest.current) {
          return;
        }
        if (isUnauthorized(caught)) {
          logout();
          return;
        }
        setListError(messageFromError(caught));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, logout]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let cancelled = false;
    let timer = 0;
    const tenantId = selectedId;

    const pull = () => {
      api.tenantWhatsapp(tenantId).then(
        (next) => {
          if (cancelled) {
            return;
          }
          setLink({ tenantId, data: next });
          const waiting = next.status === "waiting_for_scan" || pairing;
          timer = window.setTimeout(pull, waiting ? 3000 : 15000);
        },
        (caught: unknown) => {
          if (cancelled) {
            return;
          }
          if (isUnauthorized(caught)) {
            logout();
            return;
          }
          timer = window.setTimeout(pull, 5000);
        },
      );
    };

    pull();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, selectedId, logout, pairing]);

  const selected = tenants.find((tenant) => tenant.id === selectedId) ?? null;
  const visibleLink = link?.tenantId === selectedId ? link.data : null;
  const liveStatus: BaileysSessionStatus | null =
    visibleLink?.status ?? selected?.status ?? null;

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.createTenant({ name: name.trim(), flow });
      const refreshed = await refreshTenants(created.id);
      if (refreshed) {
        setTab("whatsapp");
        setName("");
      }
    } catch (caught) {
      if (isUnauthorized(caught)) {
        logout();
        return;
      }
      setCreateError(messageFromError(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex flex-col bg-sidebar px-4 py-5 text-stone-100 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium tracking-[0.16em] text-emerald-200 uppercase">
            WhatsApp desk
          </p>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-stone-300 hover:text-white"
          >
            Sign out
          </button>
        </div>

        <p className="mb-2 text-xs font-medium tracking-wide text-stone-400 uppercase">
          Tenants
        </p>
        {listError ? <p className="mb-3 text-sm text-rose-200">{listError}</p> : null}
        <ul className="space-y-1">
          {tenants.map((tenant) => {
            const active = tenant.id === selectedId;
            const status =
              tenant.id === selectedId ? liveStatus : tenant.status;
            return (
              <li key={tenant.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(tenant.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left ${
                    active ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="block font-medium">{tenant.name}</span>
                  <span className="mt-1 block text-xs text-stone-300">
                    {flowLabel(tenant.flow)}
                    {tenant.linkedPhone ? ` · ${formatPhone(tenant.linkedPhone)}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-stone-300">
                    <StatusDot status={status} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {tenants.length === 0 && !listError ? (
          <p className="mt-2 text-sm text-stone-300">No tenants yet.</p>
        ) : null}

        <form onSubmit={onCreate} className="mt-6 space-y-3 border-t border-white/10 pt-4">
          <p className="text-xs font-medium tracking-wide text-stone-400 uppercase">
            New tenant
          </p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Business name"
            required
            maxLength={255}
            className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-emerald-300"
          />
          <select
            value={flow}
            onChange={(event) => setFlow(event.target.value as TenantFlow)}
            className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-300"
          >
            {TENANT_FLOW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="text-foreground">
                {option.label}
              </option>
            ))}
          </select>
          {createError ? <p className="text-sm text-rose-200">{createError}</p> : null}
          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-full bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create tenant"}
          </button>
        </form>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        {!selected ? (
          <div className="mx-auto mt-16 max-w-lg text-center">
            <h1 className="text-2xl font-semibold">Create a tenant to begin</h1>
            <p className="mt-2 text-muted">
              Create a tenant, then open WhatsApp and generate a QR code when
              you are ready to link a phone.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{flowLabel(selected.flow)}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{selected.name}</h1>
              </div>
              <StatusDot status={liveStatus} />
            </header>
            <div className="mb-5 flex gap-2">
              {(
                [
                  ["overview", "Overview"],
                  ["conversations", "Conversations"],
                  ["whatsapp", "WhatsApp"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    tab === id
                      ? "bg-accent text-accent-ink"
                      : "border border-line bg-card text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "overview" ? (
              <OverviewPanel
                key={selected.id}
                api={api}
                tenantId={selected.id}
                flow={selected.flow}
                onUnauthorized={logout}
              />
            ) : null}
            {tab === "conversations" ? (
              <ConversationsPanel
                key={selected.id}
                api={api}
                tenantId={selected.id}
                onUnauthorized={logout}
              />
            ) : null}
            {tab === "whatsapp" ? (
              <WhatsappPanel
                key={selected.id}
                link={visibleLink}
                connectToken={selected.connectToken}
                onPair={() => api.pairTenant(selected.id)}
                onStopPair={() => api.stopTenantPair(selected.id)}
                onActiveChange={setPairing}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
