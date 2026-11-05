"use client";

import { flowLabel, formatPhone, primaryChannelLabel } from "@/lib/format";
import {
  type DeskAudience,
  whatsappStatusLabel,
} from "@/lib/owner-copy";
import {
  hostedWhatsappWebhookPath,
  isHostedWhatsappPrimary,
  type DashboardTenantWhatsapp,
  type TenantFlow,
  type TenantPrimaryChannel,
} from "@/lib/types";
import { Lock } from "lucide-react";
import { QrConnect } from "./qr-connect";
import { statusLabel } from "./status-pill";

export function WhatsappPanel({
  link,
  connectToken,
  flow,
  primaryChannel,
  telnyxWhatsappFrom,
  onPair,
  onStopPair,
  onActiveChange,
  audience = "staff",
}: {
  link: DashboardTenantWhatsapp | null;
  connectToken: string | null;
  flow: TenantFlow;
  primaryChannel: TenantPrimaryChannel | null;
  telnyxWhatsappFrom?: string | null;
  onPair: () => Promise<unknown>;
  onStopPair: () => Promise<unknown>;
  onActiveChange: (active: boolean) => void;
  audience?: DeskAudience;
}) {
  const ownerView = audience === "owner";
  const usesHosted = isHostedWhatsappPrimary(primaryChannel);
  const webhookPath = hostedWhatsappWebhookPath(primaryChannel);

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">
        {usesHosted ? (
          <section className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {primaryChannelLabel(primaryChannel)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {primaryChannel === "telnyx" && telnyxWhatsappFrom ? (
                <>
                  Outbound WhatsApp uses{" "}
                  <span className="font-medium text-foreground">
                    {formatPhone(telnyxWhatsappFrom)}
                  </span>
                  . Point Telnyx inbound webhooks at{" "}
                </>
              ) : (
                <>
                  This tenant sends and receives through the provider number on
                  the API server. Point the provider inbound webhook at{" "}
                </>
              )}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
                {webhookPath ?? "/webhooks/…"}
              </code>
              . QR pairing is not used for hosted WhatsApp tenants.
            </p>
          </section>
        ) : !link ? (
          <section className="rounded-2xl border border-line bg-card p-6">
            <p className="text-sm text-muted">Checking the WhatsApp link…</p>
          </section>
        ) : ownerView ? (
          <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <QrConnect
              link={link}
              layout="compact"
              hideOwnerLink
              onPair={onPair}
              onStopPair={onStopPair}
              onActiveChange={onActiveChange}
              connectedNote="This number is connected."
            />
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

      {link || usesHosted ? (
        <aside className="w-full shrink-0 space-y-4 xl:w-72">
          <DetailsCard
            link={link}
            flow={flow}
            primaryChannel={primaryChannel}
            telnyxWhatsappFrom={telnyxWhatsappFrom}
            audience={audience}
          />
          {!ownerView && !usesHosted ? <ConnectLinkSecurityNotice /> : null}
        </aside>
      ) : null}
    </div>
  );
}

function DetailsCard({
  link,
  flow,
  primaryChannel,
  telnyxWhatsappFrom,
  audience,
}: {
  link: DashboardTenantWhatsapp | null;
  flow: TenantFlow;
  primaryChannel: TenantPrimaryChannel | null;
  telnyxWhatsappFrom?: string | null;
  audience: DeskAudience;
}) {
  const phone = link?.linkedPhone ? formatPhone(link.linkedPhone) : null;
  const linkedLabel =
    link?.status === "connected" && audience === "staff"
      ? "Linked number"
      : "Last linked number";
  const usesHosted = isHostedWhatsappPrimary(primaryChannel);

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="text-sm font-semibold">Details</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted">Channel</dt>
          <dd className="font-medium text-right">
            {primaryChannelLabel(primaryChannel)}
          </dd>
        </div>
        {!usesHosted && link ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Status</dt>
            <dd className="font-medium text-right">
              {audience === "owner"
                ? whatsappStatusLabel(link.status, "owner")
                : statusLabel(link.status)}
            </dd>
          </div>
        ) : null}
        {usesHosted && primaryChannel === "telnyx" && telnyxWhatsappFrom ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">WhatsApp number</dt>
            <dd className="font-medium text-right">
              {formatPhone(telnyxWhatsappFrom)}
            </dd>
          </div>
        ) : null}
        {phone && !usesHosted ? (
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
