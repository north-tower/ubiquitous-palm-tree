"use client";

import type { DashboardTenantWhatsapp } from "@/lib/types";
import { useState } from "react";
import { QrConnect } from "./qr-connect";

export function WhatsappPanel({
  link,
  connectToken,
  onPair,
  onStopPair,
  onActiveChange,
}: {
  link: DashboardTenantWhatsapp | null;
  connectToken: string | null;
  onPair: () => Promise<unknown>;
  onStopPair: () => Promise<unknown>;
  onActiveChange: (active: boolean) => void;
}) {
  return (
    <section className="max-w-xl rounded-2xl border border-line bg-card p-5">
      <CopyConnectLink token={connectToken} />
      {!link ? (
        <p className="text-sm text-muted">Checking the WhatsApp link…</p>
      ) : (
        <QrConnect
          link={link}
          onPair={onPair}
          onStopPair={onStopPair}
          onActiveChange={onActiveChange}
          connectedNote="Messages to this number are handled by the tenant's flow."
        />
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

