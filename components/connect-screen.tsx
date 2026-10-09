"use client";

import { DisconnectedBanner } from "@/components/disconnected-banner";
import { QrConnect } from "@/components/qr-connect";
import {
  ApiError,
  fetchConnectLink,
  messageFromError,
  pairConnectLink,
  stopConnectPair,
} from "@/lib/api";
import { formatPhone, primaryChannelLabel } from "@/lib/format";
import { isWhatsappDisconnected } from "@/lib/owner-copy";
import type { ConnectLink } from "@/lib/types";
import { useEffect, useState } from "react";

export function ConnectScreen({ token }: { token: string }) {
  const [link, setLink] = useState<ConnectLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [startPairing, setStartPairing] = useState(false);

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

  const usesTwilio = link?.primaryChannel === "twilio";
  const disconnected =
    !usesTwilio && isWhatsappDisconnected(link?.status ?? null);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-8 sm:px-6">
      <p className="text-sm font-medium tracking-[0.16em] text-accent uppercase">
        WhatsApp linking
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {link?.name ?? "Link your business number"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {usesTwilio
          ? "This business uses Twilio WhatsApp on the server — no QR scan is needed. Sign in to your portal to see chats."
          : "This page is for scanning a QR code only. Sign in to your portal to see chats and today's numbers."}
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!link && !error ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : null}

      {link && disconnected ? (
        <div className="mt-6">
          <DisconnectedBanner onReconnect={() => setStartPairing(true)} />
        </div>
      ) : null}

      {link ? (
        <section className="mt-6 rounded-2xl border border-line bg-card p-5">
          {usesTwilio ? (
            <p className="text-sm leading-relaxed text-muted">
              Channel: {primaryChannelLabel(link.primaryChannel)}. Inbound
              messages arrive via Twilio&apos;s webhook on the API (
              <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
                /webhooks/twilio
              </code>
              ).
            </p>
          ) : (
            <>
              {link.linkedPhone ? (
                <p className="mb-4 text-sm text-muted">
                  Last linked number: {formatPhone(link.linkedPhone)}
                </p>
              ) : null}
              <QrConnect
                link={link}
                startPairing={startPairing}
                onPair={() => pairConnectLink(token)}
                onStopPair={() => stopConnectPair(token)}
                onActiveChange={setPairing}
                connectedNote="This number is connected."
              />
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
