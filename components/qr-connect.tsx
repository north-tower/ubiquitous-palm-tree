"use client";

import { messageFromError } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import type { BaileysSessionStatus } from "@/lib/types";
import { Check, Clock, QrCode, Unlink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConnectLinkField } from "./connect-link-field";
import { statusLabel } from "./status-pill";

const KEEPALIVE_MS = 12_000;

export type QrLink = {
  status: BaileysSessionStatus | null;
  linkedPhone: string | null;
  qrDataUrl: string | null;
};

const SCAN_STEPS = [
  "Open WhatsApp on the phone.",
  "Settings → Linked devices → Link a device.",
  "Scan the code above.",
] as const;

export function QrConnect({
  link,
  onPair,
  onStopPair,
  onActiveChange,
  connectedNote,
  layout = "compact",
  connectToken,
  hideOwnerLink = false,
  startPairing = false,
}: {
  link: QrLink;
  onPair: () => Promise<unknown>;
  onStopPair: () => Promise<unknown>;
  onActiveChange?: (active: boolean) => void;
  connectedNote: string;
  layout?: "compact" | "desk";
  connectToken?: string | null;
  hideOwnerLink?: boolean;
  startPairing?: boolean;
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
    if (startPairing && link.status !== "connected") {
      ignoreWaiting.current = false;
      setArmed(true);
    }
  }, [startPairing, link.status]);

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

  if (layout === "desk") {
    return (
      <DeskQrConnect
        link={link}
        armed={armed}
        error={error}
        connectToken={connectToken}
        hideOwnerLink={hideOwnerLink}
        onGenerate={() => {
          ignoreWaiting.current = false;
          setError(null);
          setArmed(true);
        }}
        onStop={() => {
          ignoreWaiting.current = true;
          setArmed(false);
        }}
      />
    );
  }

  return (
    <>
      <p className="text-sm text-muted">Link status</p>
      <h2 className="mt-1 text-2xl font-semibold">{statusLabel(link.status)}</h2>
      <p className="mt-2 text-sm">
        {link.linkedPhone
          ? `Last linked number ${formatPhone(link.linkedPhone)}`
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
          <ScanSteps />
        </div>
      ) : null}

      {armed && !link.qrDataUrl ? (
        <p className="mt-4 text-sm text-muted">Generating a QR code…</p>
      ) : null}

      {!armed && link.status !== "connected" ? (
        <>
          <p className="mt-4 text-sm text-muted">
            {link.status === "logged_out"
              ? "WhatsApp logged this session out. Generate a QR code when you want to link a phone."
              : "Generate a QR code when you are ready to scan it from the phone."}
          </p>
          <ScanSteps muted />
        </>
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

function DeskQrConnect({
  link,
  armed,
  error,
  connectToken,
  hideOwnerLink,
  onGenerate,
  onStop,
}: {
  link: QrLink;
  armed: boolean;
  error: string | null;
  connectToken: string | null | undefined;
  hideOwnerLink?: boolean;
  onGenerate: () => void;
  onStop: () => void;
}) {
  const phone = link.linkedPhone ? formatPhone(link.linkedPhone) : null;
  const showQr = armed && link.status !== "connected";
  const hasQrImage = showQr && Boolean(link.qrDataUrl);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card">
      <StatusBanner status={link.status} phone={phone} armed={armed} />

      <div className="grid gap-8 p-6 lg:grid-cols-2 lg:gap-10 lg:p-8">
        <div className="min-w-0">
          {link.status === "connected" ? (
            <ConnectedLeftColumn />
          ) : (
            <ScanLeftColumn
              armed={armed}
              hasQrImage={hasQrImage}
              qrDataUrl={link.qrDataUrl}
              waitingForScan={link.status === "waiting_for_scan"}
              onGenerate={onGenerate}
              onStop={onStop}
            />
          )}
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        </div>

        {!hideOwnerLink ? (
          <div className="min-w-0 lg:border-l lg:border-line lg:pl-10">
            <OwnerLinkColumn connectToken={connectToken} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatusBanner({
  status,
  phone,
  armed,
}: {
  status: BaileysSessionStatus | null;
  phone: string | null;
  armed: boolean;
}) {
  if (status === "connected" && phone) {
    return (
      <div className="flex gap-4 border-b border-line bg-emerald-50/80 px-6 py-5 lg:px-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-emerald-950">Linked to {phone}</p>
          <p className="mt-0.5 text-sm text-emerald-900/80">
            The bot is receiving and replying to messages on this number.
          </p>
        </div>
      </div>
    );
  }

  if (status === "waiting_for_scan" || (armed && status !== "connected")) {
    return (
      <div className="flex gap-4 border-b border-line bg-amber-50/90 px-6 py-5 lg:px-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <Clock className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-amber-950">Waiting for the phone to scan</p>
          <p className="mt-0.5 text-sm text-amber-900/80">
            This page updates on its own. Leave it open until the phone finishes
            linking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 border-b border-line bg-rose-50/90 px-6 py-5 lg:px-8">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <Unlink className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="font-semibold text-rose-950">WhatsApp logged this number out</p>
        <p className="mt-0.5 text-sm text-rose-900/80">
          {phone
            ? `The bot cannot receive or reply on ${phone} until you link the phone again.`
            : "The bot cannot receive or reply until you link a phone again."}
        </p>
      </div>
    </div>
  );
}

function ConnectedLeftColumn() {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Switch to a different number</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        In WhatsApp on the phone: Settings → Linked devices → select this device
        → Log out. Then generate a new QR code here to link another number.
      </p>
    </div>
  );
}

function ScanLeftColumn({
  armed,
  hasQrImage,
  qrDataUrl,
  waitingForScan,
  onGenerate,
  onStop,
}: {
  armed: boolean;
  hasQrImage: boolean;
  qrDataUrl: string | null;
  waitingForScan: boolean;
  onGenerate: () => void;
  onStop: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Scan it here</h2>

      <div className="mt-4 flex flex-col items-start">
        {hasQrImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl!}
              alt="WhatsApp QR code"
              className="h-56 w-56 rounded-xl border border-line bg-white p-2 sm:h-64 sm:w-64"
            />
            <p className="mt-3 max-w-sm text-sm text-muted">
              WhatsApp refreshes this code on its own. Keep this page open.
            </p>
            <button
              type="button"
              onClick={onStop}
              className="mt-4 rounded-full border border-line bg-white px-5 py-2 text-sm font-medium hover:bg-stone-50"
            >
              Stop pairing
            </button>
          </>
        ) : (
          <>
            <div className="flex h-56 w-56 flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-stone-50/80 sm:h-64 sm:w-64">
              {armed ? (
                <p className="text-sm text-muted">Generating a QR code…</p>
              ) : (
                <>
                  <QrCode className="h-10 w-10 text-stone-300" aria-hidden />
                  <p className="mt-2 text-sm text-muted">No code yet</p>
                </>
              )}
            </div>
            {!armed ? (
              <button
                type="button"
                onClick={onGenerate}
                className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
              >
                Generate QR code
              </button>
            ) : (
              <button
                type="button"
                onClick={onStop}
                className="mt-4 rounded-full border border-line bg-white px-5 py-2 text-sm font-medium hover:bg-stone-50"
              >
                Stop pairing
              </button>
            )}
          </>
        )}
      </div>

      {(hasQrImage || waitingForScan) && armed ? <ScanSteps /> : null}
      {!armed && !waitingForScan ? <ScanSteps muted /> : null}
    </div>
  );
}

function ScanSteps({ muted }: { muted?: boolean }) {
  return (
    <ol className={`mt-8 space-y-3 ${muted ? "opacity-70" : ""}`}>
      {SCAN_STEPS.map((text, index) => (
        <li key={text} className="flex gap-3 text-sm leading-snug">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
            {index + 1}
          </span>
          <span className="pt-0.5">{text}</span>
        </li>
      ))}
    </ol>
  );
}

function OwnerLinkColumn({ connectToken }: { connectToken: string | null | undefined }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Or send the owner a link</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        They open it on a computer and scan the code themselves. No desk login
        needed.
      </p>
      {connectToken ? (
        <div className="mt-5">
          <ConnectLinkField token={connectToken} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Connect link is not available for this tenant.</p>
      )}
    </div>
  );
}
