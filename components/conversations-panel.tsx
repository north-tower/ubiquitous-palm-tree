"use client";

import {
  isUnauthorized,
  messageFromError,
  type ConversationQuery,
  type DashboardApi,
} from "@/lib/api";
import { formatPhone, formatWhen, labelize } from "@/lib/format";
import type { ConversationDetail, ConversationListResult, LeadScore } from "@/lib/types";
import { useEffect, useState } from "react";
import { ScoreBadge } from "./status-pill";

const EMPTY_FILTERS: ConversationQuery = {
  leadScore: "",
  demoMode: "",
  from: "",
  to: "",
  page: 1,
};

export function ConversationsPanel({
  api,
  tenantId,
  onUnauthorized,
}: {
  api: DashboardApi;
  tenantId: string;
  onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState<ConversationQuery>(EMPTY_FILTERS);
  const [query, setQuery] = useState<ConversationQuery>(EMPTY_FILTERS);
  const [loaded, setLoaded] = useState<{
    key: string;
    result: ConversationListResult;
  } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<{
    id: string;
    detail: ConversationDetail;
  } | null>(null);
  const [detailFailure, setDetailFailure] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const queryKey = JSON.stringify(query);
  const result = loaded?.key === queryKey ? loaded.result : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const loading = result === null && error === null;
  const detail = detailState?.id === selectedId ? detailState.detail : null;
  const detailError =
    detailFailure?.id === selectedId ? detailFailure.message : null;

  useEffect(() => {
    let cancelled = false;
    api.conversations(tenantId, query).then(
      (next) => {
        if (!cancelled) {
          setLoaded({ key: queryKey, result: next });
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
        setFailure({ key: queryKey, message: messageFromError(caught) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, tenantId, query, queryKey, onUnauthorized]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const conversationId = selectedId;
    let cancelled = false;
    api.conversation(tenantId, conversationId).then(
      (next) => {
        if (!cancelled) {
          setDetailState({ id: conversationId, detail: next });
          setDetailFailure(null);
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
        setDetailFailure({
          id: conversationId,
          message: messageFromError(caught),
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, tenantId, selectedId, onUnauthorized]);

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <section className="min-w-0 rounded-2xl border border-line bg-card p-4">
        <form
          className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({ ...draft, page: 1 });
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-muted">Lead score</span>
            <select
              value={draft.leadScore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  leadScore: event.target.value as LeadScore | "",
                }))
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            >
              <option value="">Any</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Demo</span>
            <input
              value={draft.demoMode}
              onChange={(event) =>
                setDraft((current) => ({ ...current, demoMode: event.target.value }))
              }
              placeholder="salon or solar"
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">From</span>
            <input
              type="date"
              value={draft.from}
              onChange={(event) =>
                setDraft((current) => ({ ...current, from: event.target.value }))
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">To</span>
            <input
              type="date"
              value={draft.to}
              onChange={(event) =>
                setDraft((current) => ({ ...current, to: event.target.value }))
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_FILTERS);
                setQuery(EMPTY_FILTERS);
              }}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium"
            >
              Reset
            </button>
            <p className="ml-auto text-sm text-muted">
              {result ? `${result.total} conversations` : ""}
            </p>
          </div>
        </form>

        {error ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Business</th>
                <th className="py-2 font-medium">Score</th>
                <th className="py-2 font-medium">State</th>
                <th className="py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {(result?.items ?? []).map((item) => {
                const selected = item.id === selectedId;
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-t border-line ${selected ? "bg-emerald-50" : "hover:bg-stone-50"}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td className="py-2 pr-3 font-medium">
                      {formatPhone(item.customerPhone)}
                    </td>
                    <td className="py-2 pr-3">
                      {item.businessName || item.industry || item.demoMode || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <ScoreBadge score={item.leadScore} />
                    </td>
                    <td className="py-2 pr-3">{labelize(item.currentState)}</td>
                    <td className="py-2 text-muted">{formatWhen(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading ? <p className="py-4 text-sm text-muted">Loading conversations…</p> : null}
          {!loading && result && result.items.length === 0 ? (
            <p className="py-4 text-sm text-muted">No conversations match these filters.</p>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={!result || result.page <= 1}
            onClick={() =>
              setQuery((current) => ({ ...current, page: current.page - 1 }))
            }
            className="rounded-full border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {result?.page ?? query.page} of {pageCount}
          </span>
          <button
            type="button"
            disabled={!result || result.page >= pageCount}
            onClick={() =>
              setQuery((current) => ({ ...current, page: current.page + 1 }))
            }
            className="rounded-full border border-line px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-line bg-card p-4">
        {!selectedId ? (
          <p className="text-sm text-muted">Select a conversation to read it.</p>
        ) : detailError ? (
          <p className="text-sm text-rose-800">{detailError}</p>
        ) : !detail ? (
          <p className="text-sm text-muted">Loading conversation…</p>
        ) : (
          <ConversationBody detail={detail} />
        )}
      </section>
    </div>
  );
}

function ConversationBody({ detail }: { detail: ConversationDetail }) {
  const lead = detail.lead;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{formatPhone(detail.customerPhone)}</h2>
        <p className="text-sm text-muted">
          {labelize(detail.currentState)}
          {detail.demoMode ? ` · ${labelize(detail.demoMode)}` : ""}
          {detail.nextAction ? ` · ${detail.nextAction}` : ""}
        </p>
      </div>

      {lead ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Business" value={lead.businessName} />
          <Field label="Score" value={lead.leadScore} />
          <Field label="Pain point" value={lead.painPoint} />
          <Field label="Daily enquiries" value={lead.dailyEnquiryVolume} />
          <Field label="Staff" value={lead.staffCount} />
          <Field label="Current process" value={lead.currentProcess} />
          <Field label="Existing system" value={lead.existingSystem} />
          <Field
            label="Summary"
            value={lead.conversationSummary}
            className="sm:col-span-2"
          />
          {lead.requestedFeatures.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-muted">Requested features</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {lead.requestedFeatures.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-stone-100 px-2 py-0.5 text-xs"
                  >
                    {feature}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-sm text-muted">No lead profile yet.</p>
      )}

      <ol className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
        {detail.messages.map((message) => {
          const outbound = message.direction === "out";
          return (
            <li
              key={message.id}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                outbound
                  ? "ml-auto bg-accent text-accent-ink"
                  : "bg-stone-100 text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.text || "(no text)"}</p>
              <p className={`mt-1 text-xs ${outbound ? "text-emerald-100" : "text-muted"}`}>
                {outbound ? "Desk" : "Customer"} · {formatWhen(message.createdAt)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value === null || value === "" ? "—" : value}</dd>
    </div>
  );
}
