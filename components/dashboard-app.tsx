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
import { LogOut, MessageSquare, Plus, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ConversationsPanel } from "./conversations-panel";
import { OverviewPanel } from "./overview-panel";
import {
  compareTenantsByDeskStatus,
  SessionStatusDot,
  statusLabel,
  StatusPill,
  tenantDeskCategory,
  type TenantDeskCategory,
} from "./status-pill";
import { WhatsappPanel } from "./whatsapp-panel";

type TenantSort = "status" | "name";

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
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [flow, setFlow] = useState<TenantFlow>("techfind_demo");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [newTenantOpen, setNewTenantOpen] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantSort, setTenantSort] = useState<TenantSort>("status");
  const [conversationTotal, setConversationTotal] = useState<number | null>(null);
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
    setConversationTotal(null);
  }, [selectedId]);

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

  const duplicateNameKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tenant of tenants) {
      const key = tenant.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
    );
  }, [tenants]);

  const sidebarTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    const withLiveStatus = tenants.map((tenant) => ({
      ...tenant,
      status:
        tenant.id === selectedId && liveStatus !== null
          ? liveStatus
          : tenant.status,
    }));
    const filtered = query
      ? withLiveStatus.filter((tenant) => {
          const haystack = [
            tenant.name,
            tenant.ownerEmail ?? "",
            flowLabel(tenant.flow),
            tenant.linkedPhone ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : withLiveStatus;
    return [...filtered].sort((a, b) =>
      tenantSort === "name"
        ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        : compareTenantsByDeskStatus(a, b),
    );
  }, [tenants, tenantSearch, tenantSort, selectedId, liveStatus]);

  function closeNewTenantModal() {
    setNewTenantOpen(false);
    setCreateNotice(null);
    setCreateError(null);
  }

  function openNewTenantModal() {
    setCreateError(null);
    setNewTenantOpen(true);
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateNotice(null);
    try {
      const created = await api.createTenant({
        name: name.trim(),
        flow,
        email: ownerEmail.trim(),
        firstName: ownerFirstName.trim(),
        lastName: ownerLastName.trim(),
        appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      const refreshed = await refreshTenants(created.id);
      if (refreshed) {
        setTab("whatsapp");
        setName("");
        setOwnerEmail("");
        setOwnerFirstName("");
        setOwnerLastName("");
        if (created.onboarding) {
          const { emailResult, acceptUrl } = created.onboarding;
          if (emailResult.status === "sent") {
            setCreateNotice("Onboarding email sent to the owner.");
          } else if (emailResult.status === "unavailable") {
            setCreateNotice(
              `Email is not configured. Share this setup link: ${acceptUrl}`,
            );
          } else {
            setCreateNotice(
              `Email failed (${emailResult.error}). Share this setup link: ${acceptUrl}`,
            );
          }
        } else {
          setNewTenantOpen(false);
        }
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

  async function onResendOnboarding() {
    if (!selected) {
      return;
    }
    setResending(true);
    setCreateNotice(null);
    setCreateError(null);
    try {
      const result = await api.resendOnboarding(
        selected.id,
        typeof window !== "undefined" ? window.location.origin : undefined,
      );
      if (result.emailResult.status === "sent") {
        setCreateNotice("Onboarding email resent.");
      } else if (result.emailResult.status === "unavailable") {
        setCreateNotice(`Email is not configured. Setup link: ${result.acceptUrl}`);
      } else {
        setCreateNotice(
          `Email failed (${result.emailResult.error}). Setup link: ${result.acceptUrl}`,
        );
      }
      await refreshTenants(selected.id);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        logout();
        return;
      }
      setCreateError(messageFromError(caught));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex flex-col bg-sidebar px-3 py-4 text-stone-100 lg:sticky lg:top-0 lg:h-screen">
        <div className="mb-5 flex items-center gap-2 px-1">
          <MessageSquare className="h-5 w-5 text-emerald-300" aria-hidden />
          <p className="text-sm font-semibold tracking-wide text-white">WhatsApp Desk</p>
        </div>

        <label className="relative mb-3 block px-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-stone-500"
            aria-hidden
          />
          <input
            type="search"
            value={tenantSearch}
            onChange={(event) => setTenantSearch(event.target.value)}
            placeholder="Search tenants"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pr-3 pl-9 text-sm outline-none placeholder:text-stone-500 focus:border-emerald-400/60"
          />
        </label>

        <div className="mb-4 px-1">
          <button
            type="button"
            onClick={openNewTenantModal}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/10"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New tenant
          </button>
        </div>

        <select
          value={tenantSort}
          onChange={(event) => setTenantSort(event.target.value as TenantSort)}
          className="mb-3 mx-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs outline-none focus:border-emerald-400/60"
          aria-label="Sort tenants"
        >
          <option value="status" className="text-foreground">
            Group by status
          </option>
          <option value="name" className="text-foreground">
            Sort A–Z
          </option>
        </select>

        {listError ? <p className="mb-3 px-1 text-sm text-rose-200">{listError}</p> : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <TenantSidebarList
            tenants={sidebarTenants}
            selectedId={selectedId}
            tenantSort={tenantSort}
            duplicateNameKeys={duplicateNameKeys}
            onSelect={setSelectedId}
          />
          {tenants.length === 0 && !listError ? (
            <p className="mt-2 text-sm text-stone-400">No tenants yet.</p>
          ) : null}
          {tenants.length > 0 && sidebarTenants.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">No tenants match your search.</p>
          ) : null}
        </div>

        <div className="mt-4 border-t border-white/10 px-1 pt-4">
          <p className="text-xs text-stone-500">Signed in as staff</p>
          <button
            type="button"
            onClick={logout}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-stone-300 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {newTenantOpen ? (
        <NewTenantModal
          name={name}
          flow={flow}
          ownerEmail={ownerEmail}
          ownerFirstName={ownerFirstName}
          ownerLastName={ownerLastName}
          creating={creating}
          createError={createError}
          createNotice={createNotice}
          onClose={closeNewTenantModal}
          onNameChange={setName}
          onFlowChange={setFlow}
          onOwnerEmailChange={setOwnerEmail}
          onOwnerFirstNameChange={setOwnerFirstName}
          onOwnerLastNameChange={setOwnerLastName}
          onSubmit={onCreate}
        />
      ) : null}

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
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted">{flowLabel(selected.flow)}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{selected.name}</h1>
                  <StatusPill status={liveStatus} />
                </div>
                {selected.linkedPhone ? (
                  <p className="mt-1 text-sm text-muted">{formatPhone(selected.linkedPhone)}</p>
                ) : null}
                {selected.ownerEmail ? (
                  <p className="mt-0.5 text-sm text-muted">
                    Portal: {selected.ownerEmail}
                    {selected.ownerStatus === "invited" ? " · invite pending" : ""}
                    {selected.ownerStatus === "active" ? " · active" : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {liveStatus !== "connected" ? (
                  <button
                    type="button"
                    onClick={() => setTab("whatsapp")}
                    className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink"
                  >
                    Connect WhatsApp
                  </button>
                ) : null}
                {selected.ownerStatus === "invited" ? (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={() => void onResendOnboarding()}
                    className="rounded-full border border-line bg-card px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {resending ? "Sending…" : "Resend onboarding email"}
                  </button>
                ) : null}
              </div>
            </header>
            {createNotice && !newTenantOpen ? (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {createNotice}
              </p>
            ) : null}
            {createError && !newTenantOpen ? (
              <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {createError}
              </p>
            ) : null}
            <div className="mb-5 flex gap-6 border-b border-line">
              {(
                [
                  ["overview", "Overview", null],
                  ["conversations", "Conversations", conversationTotal],
                  ["whatsapp", "WhatsApp", liveStatus !== "connected" ? "dot" : null],
                ] as const
              ).map(([id, label, badge]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-pressed={tab === id}
                  className={`relative -mb-px inline-flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors ${
                    tab === id
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                  {badge === "dot" ? (
                    <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
                  ) : null}
                  {typeof badge === "number" && badge > 0 ? (
                    <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[0.65rem] font-semibold text-background">
                      {badge}
                    </span>
                  ) : null}
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
                whatsappStatus={liveStatus}
                linkedPhone={selected.linkedPhone}
                ownerStatus={selected.ownerStatus}
                onConnectWhatsApp={() => setTab("whatsapp")}
              />
            ) : null}
            {tab === "conversations" ? (
              <ConversationsPanel
                key={selected.id}
                api={api}
                tenantId={selected.id}
                onUnauthorized={logout}
                onTotalChange={setConversationTotal}
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

function sidebarGroupHeading(category: TenantDeskCategory, count: number): string {
  const label =
    category === "connected"
      ? "Live"
      : category === "needs_attention"
        ? "Needs attention"
        : "Not set up";
  return `${label} · ${count}`;
}

function TenantSidebarList({
  tenants,
  selectedId,
  tenantSort,
  duplicateNameKeys,
  onSelect,
}: {
  tenants: DashboardTenantSummary[];
  selectedId: string | null;
  tenantSort: TenantSort;
  duplicateNameKeys: Set<string>;
  onSelect: (id: string) => void;
}) {
  if (tenantSort === "status") {
    const groups: { category: TenantDeskCategory; tenants: DashboardTenantSummary[] }[] =
      [];
    for (const tenant of tenants) {
      const category = tenantDeskCategory(tenant.status, tenant.ownerStatus);
      const last = groups[groups.length - 1];
      if (!last || last.category !== category) {
        groups.push({ category, tenants: [tenant] });
      } else {
        last.tenants.push(tenant);
      }
    }
    return (
      <div className="space-y-3">
        {groups.map((group) => (
          <section key={group.category}>
            <p className="mb-1.5 px-1 text-[0.65rem] font-semibold tracking-[0.12em] text-stone-500 uppercase">
              {sidebarGroupHeading(group.category, group.tenants.length)}
            </p>
            <ul className="space-y-0.5">
              {group.tenants.map((tenant) => (
                <li key={tenant.id}>
                  <TenantSidebarRow
                    tenant={tenant}
                    active={tenant.id === selectedId}
                    showOwnerEmail={duplicateNameKeys.has(
                      tenant.name.trim().toLowerCase(),
                    )}
                    onSelect={() => onSelect(tenant.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      {tenants.map((tenant) => (
        <li key={tenant.id}>
          <TenantSidebarRow
            tenant={tenant}
            active={tenant.id === selectedId}
            showOwnerEmail={duplicateNameKeys.has(tenant.name.trim().toLowerCase())}
            onSelect={() => onSelect(tenant.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function TenantSidebarRow({
  tenant,
  active,
  showOwnerEmail,
  onSelect,
}: {
  tenant: DashboardTenantSummary;
  active: boolean;
  showOwnerEmail: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg px-2.5 py-2 text-left ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <span className="block truncate text-sm font-semibold text-white">{tenant.name}</span>
      <span className="mt-0.5 block truncate text-xs text-stone-400">
        {flowLabel(tenant.flow)}
        {tenant.linkedPhone ? ` · ${formatPhone(tenant.linkedPhone)}` : ""}
      </span>
      {showOwnerEmail && tenant.ownerEmail ? (
        <span className="mt-0.5 block truncate text-xs text-stone-500">
          {tenant.ownerEmail}
        </span>
      ) : null}
      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-stone-300">
        <SessionStatusDot status={tenant.status} />
        {statusLabel(tenant.status)}
      </span>
    </button>
  );
}

function NewTenantModal({
  name,
  flow,
  ownerEmail,
  ownerFirstName,
  ownerLastName,
  creating,
  createError,
  createNotice,
  onClose,
  onNameChange,
  onFlowChange,
  onOwnerEmailChange,
  onOwnerFirstNameChange,
  onOwnerLastNameChange,
  onSubmit,
}: {
  name: string;
  flow: TenantFlow;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  creating: boolean;
  createError: string | null;
  createNotice: string | null;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onFlowChange: (value: TenantFlow) => void;
  onOwnerEmailChange: (value: string) => void;
  onOwnerFirstNameChange: (value: string) => void;
  onOwnerLastNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [creating, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-stone-900/50" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-tenant-title"
        className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="new-tenant-title" className="text-lg font-semibold">
              New tenant
            </h2>
            <p className="mt-1 text-sm text-muted">
              Creates the tenant and sends portal onboarding when email is configured.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-lg p-1 text-muted hover:bg-background disabled:opacity-60"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Business name</span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              required
              maxLength={255}
              className="w-full rounded-xl border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Flow</span>
            <select
              value={flow}
              onChange={(event) => onFlowChange(event.target.value as TenantFlow)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2"
            >
              {TENANT_FLOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Owner email</span>
            <input
              type="email"
              value={ownerEmail}
              onChange={(event) => onOwnerEmailChange(event.target.value)}
              required
              className="w-full rounded-xl border border-line bg-white px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">First name</span>
              <input
                value={ownerFirstName}
                onChange={(event) => onOwnerFirstNameChange(event.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Last name</span>
              <input
                value={ownerLastName}
                onChange={(event) => onOwnerLastNameChange(event.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2"
              />
            </label>
          </div>
          {createError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {createError}
            </p>
          ) : null}
          {createNotice ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {createNotice}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="rounded-full border border-line bg-card px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {createNotice ? "Done" : "Cancel"}
            </button>
            {!createNotice ? (
              <button
                type="submit"
                disabled={creating}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create tenant"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
