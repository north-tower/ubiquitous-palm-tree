"use client";

import { ConversationsPanel } from "@/components/conversations-panel";
import { OverviewPanel } from "@/components/overview-panel";
import { statusLabel } from "@/components/status-pill";
import {
  ApiError,
  createConnectApi,
  fetchConnectLink,
  messageFromError,
  pairConnectLink,
  stopConnectPair,
} from "@/lib/api";
import type { ConnectLink } from "@/lib/types";
import { QrConnect } from "./qr-connect";
import { useEffect, useMemo, useState } from "react";

type Tab = "overview" | "conversations" | "whatsapp";

function ignoreUnauthorized() {}

export function ConnectScreen({ token }: { token: string }) {
  const api = useMemo(() => createConnectApi(token), [token]);
  const [link, setLink] = useState<ConnectLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const pull = () => {
      fetchConnectLink(token).then(
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
  }, [token, pairing]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6">
      <p className="text-sm font-medium tracking-[0.16em] text-accent uppercase">
        Your desk
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {link?.name ?? "Your WhatsApp number"}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Today&apos;s numbers, the funnel, and conversations on this page are
        only for this business.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!link && !error ? (
        <p className="mt-6 text-sm text-muted">Opening your desk…</p>
      ) : null}

      {link ? (
        <>
          <div className="mt-6 mb-5 flex flex-wrap items-center gap-2">
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
            <span className="ml-auto text-sm text-muted">{statusLabel(link.status)}</span>
          </div>
          {tab === "overview" ? (
            <OverviewPanel
              api={api}
              tenantId="self"
              flow={link.flow}
              onUnauthorized={ignoreUnauthorized}
            />
          ) : null}
          {tab === "conversations" ? (
            <ConversationsPanel
              api={api}
              tenantId="self"
              onUnauthorized={ignoreUnauthorized}
            />
          ) : null}
          {tab === "whatsapp" ? (
            <section className="max-w-xl rounded-2xl border border-line bg-card p-5">
              <QrConnect
                link={link}
                onPair={() => pairConnectLink(token)}
                onStopPair={() => stopConnectPair(token)}
                onActiveChange={setPairing}
                connectedNote="This number is connected."
              />
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

