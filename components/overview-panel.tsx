"use client";

import {
  isUnauthorized,
  messageFromError,
  type TenantReadApi,
} from "@/lib/api";
import { labelize } from "@/lib/format";
import type {
  DashboardFunnel,
  DashboardToday,
  DemoAnalyticsRow,
  TenantFlow,
} from "@/lib/types";
import { useEffect, useState } from "react";

type TodayCountKey = Exclude<keyof DashboardToday, "flow">;

const TECHFIND_TODAY_FIELDS: { key: TodayCountKey; label: string }[] = [
  { key: "whatsappConversations", label: "WhatsApp conversations" },
  { key: "newProspects", label: "New prospects" },
  { key: "simulationsStarted", label: "Simulations started" },
  { key: "simulationsCompleted", label: "Simulations completed" },
  { key: "qualifiedLeads", label: "Qualified leads" },
  { key: "hotLeads", label: "Hot leads" },
  { key: "meetingsBooked", label: "Meetings booked" },
  { key: "humanHandoffs", label: "Human handoffs" },
];

const ENQUIRY_TODAY_FIELDS: { key: TodayCountKey; label: string }[] = [
  { key: "whatsappConversations", label: "WhatsApp conversations" },
  { key: "newProspects", label: "New conversations" },
  { key: "enquiriesStarted", label: "Enquiries started" },
  { key: "enquiriesSubmitted", label: "Enquiries filed" },
  { key: "humanHandoffs", label: "Handed to the team" },
];

function resolveFlow(
  today: DashboardToday | null,
  funnel: DashboardFunnel | null,
  hint?: TenantFlow,
): TenantFlow {
  return today?.flow ?? funnel?.flow ?? hint ?? "techfind_demo";
}

export function OverviewPanel({
  api,
  tenantId,
  flow: flowHint,
  onUnauthorized,
}: {
  api: TenantReadApi;
  tenantId: string;
  flow?: TenantFlow;
  onUnauthorized: () => void;
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
  const maxCount = Math.max(...(funnel?.stages.map((stage) => stage.count) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Today</h2>
          <p className="text-sm text-muted">Counts since midnight in Nairobi.</p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium hover:bg-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {todayFields.map((field) => (
          <article
            key={field.key}
            className="rounded-2xl border border-line bg-card px-4 py-3"
          >
            <p className="text-sm text-muted">{field.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {loading || !today ? "…" : today[field.key]}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Funnel</h2>
        <p className="mb-4 text-sm text-muted">
          {flow === "enquiry_intake"
            ? "How far each conversation has reached in the enquiry intake, not only today."
            : "All conversations for this tenant, not only today."}
        </p>
        <div className="space-y-3">
          {(funnel?.stages ?? []).map((stage) => (
            <div key={stage.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-muted">
                    {stage.conversionFromPrevious === null
                      ? ""
                      : `${stage.conversionFromPrevious}% from previous`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
              <p className="w-12 pt-5 text-right text-sm font-semibold">{stage.count}</p>
            </div>
          ))}
          {loading && !funnel ? <p className="text-sm text-muted">Loading funnel…</p> : null}
        </div>
      </section>

      {flow === "techfind_demo" ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Demo analytics</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 font-medium">Demo</th>
                  <th className="py-2 font-medium">Started</th>
                  <th className="py-2 font-medium">Completed</th>
                  <th className="py-2 font-medium">Leads</th>
                  <th className="py-2 font-medium">Meetings</th>
                </tr>
              </thead>
              <tbody>
                {(demos ?? []).map((row) => (
                  <tr key={row.demoMode} className="border-t border-line">
                    <td className="py-2 font-medium">{labelize(row.demoMode)}</td>
                    <td className="py-2">{row.started}</td>
                    <td className="py-2">{row.completed}</td>
                    <td className="py-2">{row.leads}</td>
                    <td className="py-2">{row.meetings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && !demos ? <p className="text-sm text-muted">Loading demos…</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
