"use client";

import { ConversationsPanel } from "@/components/conversations-panel";
import { OverviewPanel } from "@/components/overview-panel";
import { statusLabel } from "@/components/status-pill";
import {
  ApiError,
  createConnectApi,
  fetchConnectLink,
  messageFromError,
} from "@/lib/api";
import { formatPhone } from "@/lib/format";
import type { ConnectLink } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type Tab = "overview" | "conversations" | "whatsapp";

function ignoreUnauthorized() {}

export function ConnectScreen({ token }: { token: string }) {
  const api = useMemo(() => createConnectApi(token), [token]);
  const [link, setLink] = useState<ConnectLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

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
          const waiting =
            next.status === "waiting_for_scan" || next.status === null;
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
  }, [token]);

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
          {tab === "whatsapp" ? <ConnectStatus link={link} /> : null}
        </>
      ) : null}
    </main>
  );
}

function ConnectStatus({ link }: { link: ConnectLink }) {
  return (
    <section className="max-w-xl rounded-2xl border border-line bg-card p-5">
      <p className="text-sm text-muted">Link status</p>
      <h2 className="mt-1 text-2xl font-semibold">{statusLabel(link.status)}</h2>
      <p className="mt-2 text-sm">
        {link.linkedPhone
          ? `Linked number ${formatPhone(link.linkedPhone)}`
          : "No number linked yet."}
      </p>

      {link.qrDataUrl ? (
        <div className="mt-5">
          {/* The API returns the QR as a data URL, which next/image does not serve. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.qrDataUrl}
            alt="WhatsApp QR code"
            className="h-64 w-64 rounded-xl border border-line bg-white p-2"
          />
          <p className="mt-3 text-sm text-muted">
            On the business phone, open WhatsApp, go to Linked devices, and scan
            this code.
          </p>
        </div>
      ) : null}

      {link.status === "waiting_for_scan" && !link.qrDataUrl ? (
        <p className="mt-4 text-sm text-muted">
          The session is open and the QR is still being generated. Leave this
          page up for a few seconds.
        </p>
      ) : null}

      {link.status === "connected" ? (
        <p className="mt-4 text-sm text-muted">
          This number is connected.
        </p>
      ) : null}

      {link.status === "logged_out" ? (
        <p className="mt-4 text-sm text-muted">
          WhatsApp logged this session out. Ask the operator to restart the API
          if a new QR does not appear.
        </p>
      ) : null}

      {link.status === null ? (
        <p className="mt-4 text-sm text-muted">
          A session has not appeared yet. If this stays empty, the operator
          needs Baileys enabled on the API.
        </p>
      ) : null}
    </section>
  );
}
