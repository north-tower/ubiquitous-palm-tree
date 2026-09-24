"use client";

import { formatPhone } from "@/lib/format";
import type { DashboardTenantWhatsapp } from "@/lib/types";
import { statusLabel } from "./status-pill";

export function WhatsappPanel({
  link,
}: {
  link: DashboardTenantWhatsapp | null;
}) {
  if (!link) {
    return <p className="text-sm text-muted">Checking the WhatsApp link…</p>;
  }

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
    </section>
  );
}
