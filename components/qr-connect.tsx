"use client";

import { messageFromError } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import type { BaileysSessionStatus } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { statusLabel } from "./status-pill";

const KEEPALIVE_MS = 12_000;

export type QrLink = {
  status: BaileysSessionStatus | null;
  linkedPhone: string | null;
  qrDataUrl: string | null;
};

export function QrConnect({
  link,
  onPair,
  onStopPair,
  onActiveChange,
  connectedNote,
}: {
  link: QrLink;
  onPair: () => Promise<unknown>;
  onStopPair: () => Promise<unknown>;
  onActiveChange?: (active: boolean) => void;
  connectedNote: string;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ignoreWaiting = useRef(false);
  const onPairRef = useRef(onPair);
  const onStopRef = useRef(onStopPair);
  const onActiveRef = useRef(onActiveChange);
  onPairRef.current = onPair;
  onStopRef.current = onStopPair;
  onActiveRef.current = onActiveChange;

  useEffect(() => {
    if (
      link.status === "connected" ||
      link.status === null ||
      link.status === "logged_out"
    ) {
      ignoreWaiting.current = false;
    }
    if (link.status === "connected") {
      setArmed(false);
      return;
    }
    if (link.status === "waiting_for_scan" && !ignoreWaiting.current) {
      setArmed(true);
    }
  }, [link.status]);

  useEffect(() => {
    onActiveRef.current?.(armed);
    return () => {
      if (armed) {
        onActiveRef.current?.(false);
      }
    };
  }, [armed]);

  useEffect(() => {
    if (!armed) {
      return;
    }
    let cancelled = false;
    let timer = 0;

    const beat = () => {
      void onPairRef
        .current()
        .then(() => {
          if (!cancelled) {
            setError(null);
          }
        })
        .catch((caught: unknown) => {
          if (!cancelled) {
            setError(messageFromError(caught));
          }
        })
        .finally(() => {
          if (!cancelled) {
            timer = window.setTimeout(beat, KEEPALIVE_MS);
          }
        });
    };

    beat();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      void onStopRef.current().catch(() => undefined);
    };
  }, [armed]);

  return (
    <>
      <p className="text-sm text-muted">Link status</p>
      <h2 className="mt-1 text-2xl font-semibold">{statusLabel(link.status)}</h2>
      <p className="mt-2 text-sm">
        {link.linkedPhone
          ? `Linked number ${formatPhone(link.linkedPhone)}`
          : "No number linked yet."}
      </p>

      {link.status === "connected" ? (
        <p className="mt-4 text-sm text-muted">{connectedNote}</p>
      ) : null}

      {armed && link.qrDataUrl ? (
        <div className="mt-5">
          {/* The API returns the QR as a data URL, which next/image does not serve. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.qrDataUrl}
            alt="WhatsApp QR code"
            className="h-64 w-64 rounded-xl border border-line bg-white p-2"
          />
          <p className="mt-3 text-sm text-muted">
            On the phone, open WhatsApp, go to Linked devices, and scan this
            code. It stays up to date while this page is open, and stops when
            you leave.
          </p>
        </div>
      ) : null}

      {armed && !link.qrDataUrl ? (
        <p className="mt-4 text-sm text-muted">Generating a QR code…</p>
      ) : null}

      {!armed && link.status !== "connected" ? (
        <p className="mt-4 text-sm text-muted">
          {link.status === "logged_out"
            ? "WhatsApp logged this session out. Generate a QR code when you want to link a phone."
            : "Generate a QR code when you are ready to scan it from the phone."}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

      {link.status === "connected" ? null : armed ? (
        <button
          type="button"
          onClick={() => {
            ignoreWaiting.current = true;
            setArmed(false);
          }}
          className="mt-4 rounded-full border border-line bg-card px-4 py-2 text-sm font-medium"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            ignoreWaiting.current = false;
            setError(null);
            setArmed(true);
          }}
          className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          Generate QR code
        </button>
      )}
    </>
  );
}
