"use client";

import { formatPhone } from "@/lib/format";
import type { DashboardTenantWhatsapp } from "@/lib/types";
import { useState } from "react";
import { statusLabel } from "./status-pill";

export function WhatsappPanel({
  link,
  connectToken,
}: {
  link: DashboardTenantWhatsapp | null;
  connectToken: string | null;
}) {
  return (
    <section className="max-w-xl rounded-2xl border border-line bg-card p-5">
      <CopyConnectLink token={connectToken} />
      {!link ? (
        <p className="text-sm text-muted">Checking the WhatsApp link…</p>
      ) : (
        <LinkStatus link={link} />
      )}
    </section>
  );
}

function CopyConnectLink({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  if (!token) {
    return null;
  }

  async function onCopy() {
    const url = `${window.location.origin}/connect/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setManualUrl(null);
      setCopied(true);
    } catch {
      setCopied(false);
      setManualUrl(url);
    }
  }

  return (
    <div className="mb-5 border-b border-line pb-5">
      <p className="text-sm text-muted">Tenant connect link</p>
      <p className="mt-1 text-sm">
        Send this to the business. They open it and scan the QR with the
        WhatsApp account they want to connect. That page does not use your
        desk login.
      </p>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
      >
        {copied ? "Copied" : "Copy connect link"}
      </button>
      {manualUrl ? (
        <input
          readOnly
          value={manualUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
        />
      ) : null}
    </div>
  );
}

function LinkStatus({ link }: { link: DashboardTenantWhatsapp }) {
  return (
    <>
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
            this code. It refreshes while the session is waiting.
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
          Messages to this number are handled by the tenant&apos;s flow.
        </p>
      ) : null}

      {link.status === "logged_out" ? (
        <p className="mt-4 text-sm text-muted">
          WhatsApp logged this session out. Restart the API if a new QR does
          not appear.
        </p>
      ) : null}

      {link.status === null ? (
        <p className="mt-4 text-sm text-muted">
          There is no live session for this tenant. The API starts one when the
          tenant is created and again on boot when Baileys is enabled.
        </p>
      ) : null}
    </>
  );
}
