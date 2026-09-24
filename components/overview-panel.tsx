"use client";

import {
  isUnauthorized,
  messageFromError,
  type TenantReadApi,
} from "@/lib/api";
import { labelize } from "@/lib/format";
import type {
  BaileysSessionStatus,
  DashboardFunnel,
  DashboardToday,
  DemoAnalyticsRow,
  FunnelStage,
  TenantFlow,
  TenantOwnerStatus,
} from "@/lib/types";
import { Check, Circle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TodayCountKey = Exclude<keyof DashboardToday, "flow">;

type TodayField = { key: TodayCountKey; label: string; shortLabel: string };

const TECHFIND_TODAY_FIELDS: TodayField[] = [
  { key: "whatsappConversations", label: "WhatsApp conversations", shortLabel: "Conversations" },
  { key: "newProspects", label: "New prospects", shortLabel: "New prospects" },
  { key: "simulationsStarted", label: "Simulations started", shortLabel: "Sims started" },
  { key: "simulationsCompleted", label: "Simulations completed", shortLabel: "Sims completed" },
  { key: "qualifiedLeads", label: "Qualified leads", shortLabel: "Qualified" },
  { key: "hotLeads", label: "Hot leads", shortLabel: "Hot leads" },
  { key: "meetingsBooked", label: "Meetings booked", shortLabel: "Meetings" },
  { key: "humanHandoffs", label: "Human handoffs", shortLabel: "Handoffs" },
];

const ENQUIRY_TODAY_FIELDS: TodayField[] = [
  { key: "whatsappConversations", label: "WhatsApp conversations", shortLabel: "Conversations" },
  { key: "newProspects", label: "New conversations", shortLabel: "New chats" },
  { key: "enquiriesStarted", label: "Enquiries started", shortLabel: "Started" },
  { key: "enquiriesSubmitted", label: "Enquiries filed", shortLabel: "Filed" },
  { key: "humanHandoffs", label: "Handed to the team", shortLabel: "Handoffs" },
];

function resolveFlow(
  today: DashboardToday | null,
  funnel: DashboardFunnel | null,
  hint?: TenantFlow,
): TenantFlow {
  return today?.flow ?? funnel?.flow ?? hint ?? "techfind_demo";
}

function whatsappConversationCount(funnel: DashboardFunnel | null): number {
  return funnel?.stages.find((stage) => stage.key === "whatsapp")?.count ?? 0;
}

function tenantNeverConnected(
  status: BaileysSessionStatus | null | undefined,
  linkedPhone: string | null | undefined,
): boolean {
  if (status === "connected" || status === "logged_out") {
    return false;
  }
  if (linkedPhone) {
    return false;
  }
  return true;
}

function visibleFunnelStages(stages: FunnelStage[]): FunnelStage[] {
  return stages.filter(
    (stage) => !(stage.key === "customer" && stage.count === 0),
  );
}

function formatConversionPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value}%`;
}

function conversionDisplay(
  stage: FunnelStage,
  index: number,
  stages: FunnelStage[],
): string {
  if (index === 0) {
    return "";
  }
  const previousCount = stages[index - 1]?.count ?? 0;
  if (previousCount <= 0) {
    return "—";
  }
  if (stage.conversionFromPrevious === null) {
    return "";
  }
  return formatConversionPercent(stage.conversionFromPrevious);
}

export function OverviewPanel({
  api,
  tenantId,
  flow: flowHint,
  onUnauthorized,
  whatsappStatus,
  linkedPhone,
  ownerStatus,
  onConnectWhatsApp,
}: {
  api: TenantReadApi;
  tenantId: string;
  flow?: TenantFlow;
  onUnauthorized: () => void;
  whatsappStatus?: BaileysSessionStatus | null;
  linkedPhone?: string | null;
  ownerStatus?: TenantOwnerStatus | null;
  onConnectWhatsApp?: () => void;
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${tenantId}:${reloadKey}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    today: DashboardToday;
    funnel: DashboardFunnel;
    demos: DemoAnalyticsRow[];
  } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(
    null,
  );
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.today(tenantId),
      api.funnel(tenantId),
      api.demoAnalytics(tenantId),
    ]).then(
      ([today, funnel, demos]) => {
        if (!cancelled) {
          setLoaded({ key: requestKey, today, funnel, demos });
          setFailure(null);
          setUpdatedAt(new Date());
        }
      },
      (caught: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorized(caught)) {
          onUnauthorized();
          return;
        }
        setFailure({ key: requestKey, message: messageFromError(caught) });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [api, tenantId, onUnauthorized, requestKey]);

  const today = loaded?.key === requestKey ? loaded.today : null;
  const funnel = loaded?.key === requestKey ? loaded.funnel : null;
  const demos = loaded?.key === requestKey ? loaded.demos : null;
  const error = failure?.key === requestKey ? failure.message : null;
  const loading = !today && !error;
  const flow = resolveFlow(today, funnel, flowHint);
  const todayFields =
    flow === "enquiry_intake" ? ENQUIRY_TODAY_FIELDS : TECHFIND_TODAY_FIELDS;

  const funnelStages = useMemo(
    () => visibleFunnelStages(funnel?.stages ?? []),
    [funnel],
  );
  const maxCount = Math.max(...funnelStages.map((stage) => stage.count), 1);
  const customerStageHidden = (funnel?.stages ?? []).some(
    (stage) => stage.key === "customer" && stage.count === 0,
  );

  const showSetupChecklist =
    !loading &&
    !error &&
    tenantNeverConnected(whatsappStatus, linkedPhone) &&
    whatsappConversationCount(funnel) === 0;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {showSetupChecklist ? (
        <SetupChecklist
          ownerStatus={ownerStatus}
          onConnectWhatsApp={onConnectWhatsApp}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Today</h2>
              <p className="text-sm text-muted">
                since midnight, Nairobi
                {updatedAt ? (
                  <>
                    {" "}
                    · updated{" "}
                    {updatedAt.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>

          {loading ? (
            <TodayMetricsSkeleton count={todayFields.length} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-card">
              <div className="flex min-w-max divide-x divide-line">
                {todayFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex min-w-[5.5rem] flex-1 flex-col items-center px-3 py-4 sm:min-w-[6.5rem] sm:px-4"
                  >
                    <p className="text-center text-[0.65rem] font-medium tracking-wide text-muted uppercase sm:text-xs sm:normal-case">
                      {field.shortLabel}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {today![field.key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={
              flow === "techfind_demo"
                ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)]"
                : undefined
            }
          >
            <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Funnel</h2>
                  <p className="text-sm text-muted">
                    {flow === "enquiry_intake"
                      ? "all enquiries, all time"
                      : "all conversations, all time"}
                  </p>
                </div>
                {!loading && funnelStages.length > 0 ? (
                  <p className="text-xs text-muted">Conversion from previous step</p>
                ) : null}
              </div>

              {loading ? (
                <FunnelSkeleton rows={flow === "enquiry_intake" ? 6 : 6} />
              ) : (
                <div className="space-y-2.5">
                  {funnelStages.map((stage, index) => (
                    <FunnelRow
                      key={stage.key}
                      stage={stage}
                      index={index}
                      stages={funnelStages}
                      maxCount={maxCount}
                    />
                  ))}
                </div>
              )}

              {customerStageHidden && !loading ? (
                <p className="mt-4 text-xs text-muted italic">
                  &ldquo;Customer&rdquo; stage is hidden until conversions are tracked.
                </p>
              ) : null}
            </section>

            {flow === "techfind_demo" ? (
              <div className="space-y-4">
                <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
                  <h2 className="mb-3 text-lg font-semibold">By demo</h2>
                  {loading ? (
                    <DemoTableSkeleton />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs text-muted">
                          <tr>
                            <th className="pb-2 font-medium">Demo</th>
                            <th className="pb-2 text-right font-medium">Started</th>
                            <th className="pb-2 text-right font-medium">Done</th>
                            <th className="pb-2 text-right font-medium">Qualified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(demos ?? []).map((row) => (
                            <tr key={row.demoMode} className="border-t border-line">
                              <td className="py-2 font-medium">{labelize(row.demoMode)}</td>
                              <td className="py-2 text-right tabular-nums">{row.started}</td>
                              <td className="py-2 text-right tabular-nums">{row.completed}</td>
                              <td className="py-2 text-right tabular-nums">{row.leads}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(demos ?? []).length === 0 ? (
                        <p className="text-sm text-muted">No demo runs yet.</p>
                      ) : null}
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function FunnelRow({
  stage,
  index,
  stages,
  maxCount,
}: {
  stage: FunnelStage;
  index: number;
  stages: FunnelStage[];
  maxCount: number;
}) {
  const conversion = conversionDisplay(stage, index, stages);
  const barWidth = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

  return (
    <div className="grid grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)_2rem_2.75rem] items-center gap-x-2 text-sm sm:grid-cols-[minmax(6.5rem,9rem)_minmax(0,1fr)_2.5rem_3rem] sm:gap-x-3">
      <span className="truncate text-muted">{stage.label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="text-right text-sm font-semibold tabular-nums">{stage.count}</span>
      <span className="text-right text-xs text-muted tabular-nums sm:text-sm">
        {conversion}
      </span>
    </div>
  );
}

function SetupChecklist({
  ownerStatus,
  onConnectWhatsApp,
}: {
  ownerStatus?: TenantOwnerStatus | null;
  onConnectWhatsApp?: () => void;
}) {
  const portalDone = ownerStatus === "active";
  const portalPending = ownerStatus === "invited";

  const steps = [
    {
      id: "whatsapp",
      title: "Connect WhatsApp",
      detail: "Link the business number from the WhatsApp tab or send them the connect link.",
      done: false,
      action: onConnectWhatsApp ? (
        <button
          type="button"
          onClick={onConnectWhatsApp}
          className="mt-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink"
        >
          Open WhatsApp tab
        </button>
      ) : null,
    },
    {
      id: "portal",
      title: "Owner portal access",
      detail: portalDone
        ? "The owner has signed in to the portal."
        : portalPending
          ? "Onboarding invite sent — they still need to accept and set a password."
          : "Add an owner email when creating the tenant to send portal onboarding.",
      done: portalDone,
      action: null,
    },
    {
      id: "conversations",
      title: "First conversation",
      detail: "Once WhatsApp is linked, message the number to confirm the bot replies.",
      done: false,
      action: null,
    },
  ];

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Get this tenant live</h2>
      <p className="mt-1 text-sm text-muted">
        WhatsApp is not linked yet and there are no conversations. Complete these steps
        to start seeing metrics here.
      </p>
      <ol className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span className="mt-0.5 shrink-0" aria-hidden>
              {step.done ? (
                <Check className="h-5 w-5 text-accent" strokeWidth={2.5} />
              ) : (
                <Circle className="h-5 w-5 text-line" strokeWidth={1.75} />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-medium">
                <span className="text-muted">{index + 1}. </span>
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">{step.detail}</p>
              {step.action}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-stone-200/80 ${className ?? ""}`}
      aria-hidden
    />
  );
}

function TodayMetricsSkeleton({ count }: { count: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-line bg-card"
      aria-busy="true"
      aria-label="Loading today metrics"
    >
      <div className="flex divide-x divide-line">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex min-w-[5.5rem] flex-1 flex-col items-center px-3 py-4 sm:min-w-[6.5rem]"
          >
            <SkeletonBar className="h-3 w-14" />
            <SkeletonBar className="mt-3 h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading funnel">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(5.5rem,7.5rem)_minmax(0,1fr)_2rem_2.75rem] items-center gap-x-2 sm:grid-cols-[minmax(6.5rem,9rem)_minmax(0,1fr)_2.5rem_3rem] sm:gap-x-3"
        >
          <SkeletonBar className="h-3 w-full max-w-[6rem]" />
          <SkeletonBar className="h-2 w-full rounded-full" />
          <SkeletonBar className="ml-auto h-3 w-4" />
          <SkeletonBar className="ml-auto h-3 w-6" />
        </div>
      ))}
    </div>
  );
}

function DemoTableSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading demo analytics">
      <SkeletonBar className="h-3 w-full" />
      <SkeletonBar className="h-3 w-4/5" />
      <SkeletonBar className="h-3 w-3/5" />
    </div>
  );
}
