"use client";

import { ConversationsPanel } from "@/components/conversations-panel";
import { DisconnectedBanner } from "@/components/disconnected-banner";
import { OverviewPanel } from "@/components/overview-panel";
import { WhatsappPanel } from "@/components/whatsapp-panel";
import {
  ApiError,
  createPortalApi,
  isUnauthorized,
  messageFromError,
  type PortalApi,
} from "@/lib/api";
import { isWhatsappDisconnected } from "@/lib/owner-copy";
import type { ConnectLink, PortalSession, TenantFlow } from "@/lib/types";
import { MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Tab = "overview" | "conversations" | "whatsapp";

const TAB_LABELS: Record<Tab, string> = {
  overview: "Home",
  conversations: "Chats",
  whatsapp: "WhatsApp",
};

export function PortalScreen({
  session,
  onLogout,
}: {
  session: PortalSession;
  onLogout: () => void;
}) {
  const api = useMemo(
    () => createPortalApi(session.token),
    [session.token],
  );
  const readApi: PortalApi = api;
  const [link, setLink] = useState<ConnectLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [pairing, setPairing] = useState(false);
  const flow = (session.user.flow ?? "techfind_demo") as TenantFlow;
  const disconnected = isWhatsappDisconnected(link?.status ?? null);
  const showWhatsappAlert =
    link?.status === "logged_out" ||
    link?.status === null ||
    link?.status === "waiting_for_scan";

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const pull = () => {
      api.whatsapp().then(
        (next) => {
          if (cancelled) {
            return;
          }
          setLink(next);
          setError(null);
          const waiting = next.status === "waiting_for_scan" || pairing;
          timer = window.setTimeout(pull, waiting ? 3000 : 15000);
        },
        (caught: unknown) => {
          if (cancelled) {
            return;
          }
          if (isUnauthorized(caught)) {
            onLogout();
            return;
          }
          setError(messageFromError(caught));
          if (caught instanceof ApiError && caught.status === 404) {
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
  }, [api, pairing, onLogout]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <MessageSquare className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {link?.name ?? session.user.tenantName}
            </h1>
            <p className="text-sm text-muted">Your WhatsApp desk</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted">Signed in as {session.user.email}</p>
          <button
            type="button"
            onClick={() => {
              void api.logout().finally(onLogout);
            }}
            className="mt-1 rounded-full border border-line bg-card px-3 py-1 text-sm font-medium hover:bg-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <nav
        className="mt-4 flex flex-wrap gap-2"
        aria-label="Portal sections"
      >
        {(
          [
            ["overview", TAB_LABELS.overview],
            ["conversations", TAB_LABELS.conversations],
            ["whatsapp", TAB_LABELS.whatsapp],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`relative rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === id
                ? "bg-accent text-accent-ink"
                : "border border-line bg-card text-foreground"
            }`}
          >
            {label}
            {id === "whatsapp" && showWhatsappAlert && tab !== "whatsapp" ? (
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500"
                aria-hidden
              />
            ) : null}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!link && !error ? (
        <p className="mt-6 text-sm text-muted">Opening your desk…</p>
      ) : null}

      {link && disconnected ? (
        <div className="mt-5">
          <DisconnectedBanner onReconnect={() => setTab("whatsapp")} />
        </div>
      ) : null}

      {link ? (
        <div className="mt-6 min-w-0">
          {tab === "overview" ? (
            <OverviewPanel
              api={readApi}
              tenantId="self"
              flow={flow}
              onUnauthorized={onLogout}
              audience="owner"
              ownerEmail={session.user.email}
              whatsappStatus={link.status}
              linkedPhone={link.linkedPhone}
              ownerStatus="active"
              onConnectWhatsApp={() => setTab("whatsapp")}
            />
          ) : null}
          {tab === "conversations" ? (
            <ConversationsPanel
              api={readApi}
              tenantId="self"
              onUnauthorized={onLogout}
              audience="owner"
            />
          ) : null}
          {tab === "whatsapp" ? (
            <WhatsappPanel
              link={link}
              connectToken={null}
              flow={flow}
              audience="owner"
              onPair={() => api.pairWhatsapp()}
              onStopPair={() => api.stopPairWhatsapp()}
              onActiveChange={setPairing}
            />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
