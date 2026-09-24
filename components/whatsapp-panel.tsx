"use client";

import { flowLabel, formatPhone } from "@/lib/format";
import type { DashboardTenantWhatsapp, TenantFlow } from "@/lib/types";
import { Lock } from "lucide-react";
import { QrConnect } from "./qr-connect";
import { statusLabel } from "./status-pill";

export function WhatsappPanel({
  link,
  connectToken,
  flow,
  onPair,
  onStopPair,
  onActiveChange,
}: {
  link: DashboardTenantWhatsapp | null;
  connectToken: string | null;
  flow: TenantFlow;
  onPair: () => Promise<unknown>;
  onStopPair: () => Promise<unknown>;
  onActiveChange: (active: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">
        {!link ? (
          <section className="rounded-2xl border border-line bg-card p-6">
            <p className="text-sm text-muted">Checking the WhatsApp link…</p>
          </section>
        ) : (
          <QrConnect
            link={link}
            layout="desk"
            connectToken={connectToken}
            onPair={onPair}
            onStopPair={onStopPair}
            onActiveChange={onActiveChange}
            connectedNote=""
          />
        )}
      </div>

      {link ? (
        <aside className="w-full shrink-0 space-y-4 xl:w-72">
          <DetailsCard link={link} flow={flow} />
          <ConnectLinkSecurityNotice />
        </aside>
      ) : null}
    </div>
  );
}

function DetailsCard({
  link,
  flow,
}: {
  link: DashboardTenantWhatsapp;
  flow: TenantFlow;
}) {
  const phone = link.linkedPhone ? formatPhone(link.linkedPhone) : null;
  const linkedLabel =
    link.status === "connected" ? "Linked number" : "Last linked number";

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="text-sm font-semibold">Details</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Status</dt>
          <dd className="font-medium text-right">{statusLabel(link.status)}</dd>
        </div>
        {phone ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">{linkedLabel}</dt>
            <dd className="font-medium text-right">{phone}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Flow</dt>
          <dd className="font-medium text-right">{flowLabel(flow)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ConnectLinkSecurityNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
      <p className="text-sm leading-relaxed text-amber-950/90">
        Anyone with the connect link can see this business&apos;s numbers and
        conversations. Only send it to the owner.
      </p>
    </div>
  );
}
