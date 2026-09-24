"use client";

import {
  isUnauthorized,
  messageFromError,
  type ConversationQuery,
  type TenantReadApi,
} from "@/lib/api";
import {
  conversationAvatarLabel,
  conversationDisplayName,
  datePresetRange,
  formatDaySeparator,
  formatMessageTime,
  formatRelativeActivity,
  labelize,
  nairobiDateKey,
  type ConversationDatePreset,
} from "@/lib/format";
import {
  conversationStateLabel,
  type DeskAudience,
} from "@/lib/owner-copy";
import { WhatsAppFormattedText } from "@/lib/whatsapp-format";
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationListResult,
} from "@/lib/types";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  Hand,
  Info,
  Search,
  UserRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScoreBadge } from "./status-pill";

const EMPTY_FILTERS: ConversationQuery = {
  leadScore: "",
  demoMode: "",
  from: "",
  to: "",
  page: 1,
};

type QueueFilter = "all" | "needs_you" | "bot";

type MessagePreview = {
  text: string;
  at: string;
};

type MessageRole = "customer" | "bot" | "staff";

export function ConversationsPanel({
  api,
  tenantId,
  onUnauthorized,
  onTotalChange,
  audience = "staff",
}: {
  api: TenantReadApi;
  tenantId: string;
  onUnauthorized: () => void;
  onTotalChange?: (total: number | null) => void;
  audience?: DeskAudience;
}) {
  const [datePreset, setDatePreset] = useState<ConversationDatePreset>("all");
  const [draft, setDraft] = useState<ConversationQuery>(EMPTY_FILTERS);
  const [query, setQuery] = useState<ConversationQuery>(EMPTY_FILTERS);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [listSearch, setListSearch] = useState("");
  const [loaded, setLoaded] = useState<{
    key: string;
    result: ConversationListResult;
  } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [detailState, setDetailState] = useState<{
    id: string;
    detail: ConversationDetail;
  } | null>(null);
  const [detailFailure, setDetailFailure] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [previews, setPreviews] = useState<Record<string, MessagePreview>>({});
  const previewRequested = useRef(new Set<string>());

  const queryKey = JSON.stringify(query);
  const result = loaded?.key === queryKey ? loaded.result : null;
  const error = failure?.key === queryKey ? failure.message : null;
  const loading = result === null && error === null;
  const detail = detailState?.id === selectedId ? detailState.detail : null;
  const detailError =
    detailFailure?.id === selectedId ? detailFailure.message : null;

  useEffect(() => {
    onTotalChange?.(result?.total ?? null);
  }, [result?.total, onTotalChange]);

  useEffect(() => {
    if (selectedId || !result?.items.length) {
      return;
    }
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) {
      setSelectedId(result.items[0]!.id);
    }
  }, [result?.items, selectedId]);

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
          const last = next.messages[next.messages.length - 1];
          if (last) {
            setPreviews((current) => ({
              ...current,
              [conversationId]: {
                text: last.text ?? "",
                at: last.createdAt,
              },
            }));
          }
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

  useEffect(() => {
    if (!result?.items.length) {
      return;
    }
    let cancelled = false;
    for (const item of result.items) {
      if (previewRequested.current.has(item.id)) {
        continue;
      }
      previewRequested.current.add(item.id);
      void api.conversation(tenantId, item.id).then(
        (next) => {
          if (cancelled) {
            return;
          }
          const last = next.messages[next.messages.length - 1];
          setPreviews((current) => ({
            ...current,
            [item.id]: {
              text: last?.text ?? "",
              at: last?.createdAt ?? item.createdAt,
            },
          }));
        },
        () => {
          previewRequested.current.delete(item.id);
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [api, tenantId, result?.items]);

  const filteredItems = useMemo(() => {
    const items = result?.items ?? [];
    const search = listSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (queueFilter === "needs_you" && item.currentState !== "HUMAN_HANDOFF") {
        return false;
      }
      if (queueFilter === "bot" && item.currentState === "HUMAN_HANDOFF") {
        return false;
      }
      if (!search) {
        return true;
      }
      const preview = previews[item.id]?.text ?? "";
      const haystack = [
        conversationDisplayName(item, audience),
        item.customerPhone,
        item.businessName ?? "",
        item.demoMode ?? "",
        preview,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [result?.items, queueFilter, listSearch, previews, audience]);

  const queueCounts = useMemo(() => {
    const items = result?.items ?? [];
    return {
      all: items.length,
      needs_you: items.filter((item) => item.currentState === "HUMAN_HANDOFF").length,
      bot: items.filter((item) => item.currentState !== "HUMAN_HANDOFF").length,
    };
  }, [result?.items]);

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  function applyFilters(nextDraft: ConversationQuery, preset: ConversationDatePreset) {
    const range = preset === "custom" ? { from: nextDraft.from, to: nextDraft.to } : datePresetRange(preset);
    const applied: ConversationQuery = {
      ...nextDraft,
      from: range.from,
      to: range.to,
      page: 1,
    };
    setDraft({ ...nextDraft, from: range.from, to: range.to });
    setQuery(applied);
  }

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobileThreadOpen(true);
  }

  return (
    <div className="grid min-h-[32rem] gap-0 overflow-hidden rounded-2xl border border-line bg-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-px md:bg-line">
      <section
        className={`flex min-h-0 min-w-0 flex-col bg-card p-4 ${
          mobileThreadOpen ? "hidden md:flex" : "flex"
        }`}
      >
        <label className="relative mb-3 block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={listSearch}
            onChange={(event) => setListSearch(event.target.value)}
            placeholder={
              audience === "owner" ? "Search by number" : "Search number or business"
            }
            className="w-full rounded-xl border border-line bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </label>

        {audience === "staff" ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["all", "All", queueCounts.all],
                ["needs_you", "Needs you", queueCounts.needs_you],
                ["bot", "Bot", queueCounts.bot],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setQueueFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  queueFilter === id
                    ? "bg-foreground text-background"
                    : "border border-line bg-white text-foreground"
                }`}
              >
                {label} {count}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["ready", "Ready to buy"],
                ["week", "This week"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "all") {
                    setQueueFilter("all");
                    setDatePreset("all");
                    applyFilters({ ...draft, leadScore: "" }, "all");
                    return;
                  }
                  if (id === "ready") {
                    setQueueFilter("all");
                    const next = { ...draft, leadScore: "HOT" as const };
                    setDraft(next);
                    applyFilters(next, datePreset);
                    return;
                  }
                  setQueueFilter("all");
                  setDatePreset("7d");
                  applyFilters(draft, "7d");
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  (id === "all" &&
                    queueFilter === "all" &&
                    datePreset === "all" &&
                    !draft.leadScore) ||
                  (id === "ready" && draft.leadScore === "HOT") ||
                  (id === "week" && datePreset === "7d")
                    ? "bg-foreground text-background"
                    : "border border-line bg-white text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <select
            value={datePreset}
            onChange={(event) => {
              const preset = event.target.value as ConversationDatePreset;
              setDatePreset(preset);
              applyFilters(draft, preset);
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            aria-label="Date range"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
          <select
            value={draft.demoMode}
            onChange={(event) => {
              const next = { ...draft, demoMode: event.target.value };
              setDraft(next);
              applyFilters(next, datePreset);
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
            aria-label="Demo filter"
          >
            <option value="">Any demo</option>
            <option value="salon">Salon</option>
            <option value="solar">Solar</option>
          </select>
        </div>

        {datePreset === "custom" ? (
          <form
            className="mb-3 grid gap-2 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters(draft, "custom");
            }}
          >
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
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink sm:col-span-2"
            >
              Apply dates
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <ul className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {loading
            ? Array.from({ length: 5 }, (_, index) => (
                <li key={index} className="animate-pulse px-3 py-3">
                  <div className="h-4 w-2/3 rounded bg-stone-200" />
                  <div className="mt-2 h-3 w-full rounded bg-stone-100" />
                </li>
              ))
            : null}
          {!loading &&
            filteredItems.map((item) => (
              <ConversationListRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                preview={previews[item.id]}
                audience={audience}
                onSelect={() => selectConversation(item.id)}
              />
            ))}
        </ul>

        {!loading && filteredItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No conversations match these filters.
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
          <span>
            {result
              ? `Showing ${filteredItems.length} of ${result.total} · sorted by last activity`
              : ""}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={!result || result.page <= 1}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page - 1 }))
              }
              className="rounded-lg border border-line p-1 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={!result || result.page >= pageCount}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page + 1 }))
              }
              className="rounded-lg border border-line p-1 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </span>
        </div>
      </section>

      <section
        className={`min-h-0 min-w-0 flex-col bg-card ${
          mobileThreadOpen ? "flex" : selectedId ? "hidden md:flex" : "hidden md:flex"
        }`}
      >
        {!selectedId ? (
          <p className="p-6 text-sm text-muted">Select a conversation to read it.</p>
        ) : detailError ? (
          <p className="p-6 text-sm text-rose-800">{detailError}</p>
        ) : !detail ? (
          <p className="p-6 text-sm text-muted">Loading conversation…</p>
        ) : (
          <ConversationThread
            detail={detail}
            audience={audience}
            onBack={() => setMobileThreadOpen(false)}
            onHandoff={async () => {
              const next = await api.handoffConversation(tenantId, detail.id);
              setDetailState({ id: detail.id, detail: next });
            }}
            onResumeAutomation={async () => {
              const next = await api.resumeAutomation(tenantId, detail.id);
              setDetailState({ id: detail.id, detail: next });
            }}
            onUnauthorized={onUnauthorized}
          />
        )}
      </section>
    </div>
  );
}

function ConversationListRow({
  item,
  selected,
  preview,
  audience,
  onSelect,
}: {
  item: ConversationListItem;
  selected: boolean;
  preview?: MessagePreview;
  audience: DeskAudience;
  onSelect: () => void;
}) {
  const inHandoff = item.currentState === "HUMAN_HANDOFF";
  const activityAt = preview?.at ?? item.createdAt;
  const previewText =
    preview?.text?.trim() ||
    (audience === "staff" && inHandoff
      ? "Waiting for staff reply"
      : "Open to load messages");
  const avatar = conversationAvatarLabel(item);
  const stateLabel = conversationStateLabel(item.currentState, audience);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`relative w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
          selected
            ? "bg-emerald-50/90 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
            : "hover:bg-stone-50"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
            {avatar.kind === "initials" ? (
              avatar.text
            ) : (
              <UserRound className="h-4 w-4 text-muted" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="truncate font-medium">
                {conversationDisplayName(item, audience)}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {formatRelativeActivity(activityAt)}
              </span>
            </span>
            <span className="mt-0.5 line-clamp-1 text-sm text-muted">{previewText}</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.demoMode ? (
                <Tag tone="sky">{labelize(item.demoMode)} demo</Tag>
              ) : null}
              {audience === "staff" ? (
                <>
                  <Tag tone="sand">{stateLabel}</Tag>
                  {item.leadScore ? (
                    <ScoreBadge score={item.leadScore} />
                  ) : (
                    <Tag tone="muted">No score</Tag>
                  )}
                  {inHandoff ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-800">
                      <Hand className="h-3 w-3" aria-hidden />
                      Handoff
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs font-medium text-accent">{stateLabel}</span>
              )}
            </span>
          </span>
        </div>
      </button>
    </li>
  );
}

function Tag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "sky" | "sand" | "muted";
}) {
  const styles = {
    sky: "bg-sky-100 text-sky-900",
    sand: "bg-amber-50 text-amber-950",
    muted: "bg-stone-100 text-stone-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

function ConversationThread({
  detail,
  audience,
  onBack,
  onHandoff,
  onResumeAutomation,
  onUnauthorized,
}: {
  detail: ConversationDetail;
  audience: DeskAudience;
  onBack: () => void;
  onHandoff: () => Promise<void>;
  onResumeAutomation: () => Promise<void>;
  onUnauthorized: () => void;
}) {
  const lead = detail.lead;
  const inHandoff = detail.currentState === "HUMAN_HANDOFF";
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [handoffSince, setHandoffSince] = useState<string | null>(null);

  useEffect(() => {
    if (!inHandoff) {
      setHandoffSince(null);
      return;
    }
    if (handoffSince) {
      return;
    }
    const lastInbound = [...detail.messages].reverse().find((m) => m.direction === "in");
    setHandoffSince(lastInbound?.createdAt ?? "");
  }, [detail.id, detail.messages, inHandoff, handoffSince]);

  const resolveRole = useCallback(
    (message: (typeof detail.messages)[number]): MessageRole => {
      if (message.direction === "in") {
        return "customer";
      }
      if (
        inHandoff &&
        handoffSince &&
        message.createdAt > handoffSince
      ) {
        return "staff";
      }
      return "bot";
    },
    [handoffSince, inHandoff],
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (caught: unknown) {
      if (isUnauthorized(caught)) {
        onUnauthorized();
        return;
      }
      setActionError(messageFromError(caught));
    } finally {
      setBusy(false);
    }
  }

  const timeline = useMemo(() => {
    const rows: Array<
      | { kind: "day"; key: string; label: string }
      | { kind: "message"; key: string; message: (typeof detail.messages)[number] }
    > = [];
    let lastDay = "";
    for (const message of detail.messages) {
      const day = nairobiDateKey(message.createdAt);
      if (day !== lastDay) {
        rows.push({
          kind: "day",
          key: `day-${day}`,
          label: formatDaySeparator(message.createdAt),
        });
        lastDay = day;
      }
      rows.push({ kind: "message", key: message.id, message });
    }
    return rows;
  }, [detail.messages]);

  const stateLabel = conversationStateLabel(detail.currentState, audience);

  return (
    <div className="flex h-full min-h-0 max-h-[calc(100vh-12rem)] flex-col md:max-h-[calc(100vh-10rem)]">
      <header className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 rounded-lg border border-line p-1.5 md:hidden"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">
              {conversationDisplayName(
                {
                  customerPhone: detail.customerPhone,
                  businessName: lead?.businessName ?? null,
                },
                audience,
              )}
            </h2>
            <p className="truncate text-sm text-muted">
              {detail.demoMode ? `${labelize(detail.demoMode)} demo` : "No demo"}
              {" · "}
              {stateLabel}
            </p>
          </div>
          {audience === "staff" ? (
            <details className="relative shrink-0 text-sm">
              <summary className="cursor-pointer list-none rounded-full border border-line px-3 py-1 text-muted marker:hidden">
                {lead ? "Lead profile" : "Lead profile not captured"}
              </summary>
              {lead ? (
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-card p-3 shadow-lg">
                  <dl className="space-y-2 text-sm">
                    <Field label="Business" value={lead.businessName} />
                    <Field label="Score" value={lead.leadScore} />
                    <Field label="Summary" value={lead.conversationSummary} />
                  </dl>
                </div>
              ) : (
                <p className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-line bg-card p-3 text-sm text-muted shadow-lg">
                  No lead profile yet.
                </p>
              )}
            </details>
          ) : null}
        </div>
      </header>

      {audience === "owner" ? (
        <div className="mx-4 mt-3 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
          <p className="flex min-w-0 items-center gap-2">
            <Bot className="h-4 w-4 shrink-0" aria-hidden />
            Your assistant is replying to this customer.
          </p>
        </div>
      ) : (
        <div
          className={`mx-4 mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
            inHandoff
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
        >
          <p className="flex min-w-0 items-start gap-2 break-words">
            {inHandoff ? (
              <Hand className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>
              {inHandoff
                ? "You are handling this chat. The bot stays quiet until you hand it back."
                : "Bot is handling this chat. Take over to pause automation for this customer."}
            </span>
          </p>
          {inHandoff ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(onResumeAutomation)}
              className="shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Hand back to bot
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const since = new Date().toISOString();
                  setHandoffSince(since);
                  await onHandoff();
                })
              }
              className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
            >
              Take over chat
            </button>
          )}
        </div>
      )}

      {actionError ? (
        <p className="mx-4 mt-2 shrink-0 text-sm text-rose-800">{actionError}</p>
      ) : null}

      <ol className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {timeline.map((row) =>
          row.kind === "day" ? (
            <li key={row.key} className="flex justify-center py-2">
              <span className="rounded-full bg-stone-100 px-3 py-0.5 text-xs text-muted">
                {row.label}
              </span>
            </li>
          ) : (
            <MessageBubble
              key={row.key}
              message={row.message}
              role={resolveRole(row.message)}
              audience={audience}
            />
          ),
        )}
      </ol>

      {audience === "staff" ? (
        <p className="flex shrink-0 items-start gap-2 border-t border-line px-4 py-3 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Replies are sent by the bot. After you take over, the bot stays quiet in this chat
          until you resume it.
        </p>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  role,
  audience,
}: {
  message: ConversationDetail["messages"][number];
  role: MessageRole;
  audience: DeskAudience;
}) {
  const simulated =
    role === "bot" &&
    message.text?.toLowerCase().includes("simulated demo");

  const body = message.text?.trim() ? message.text : "(no text)";

  if (role === "customer") {
    return (
      <li className="max-w-[88%] min-w-0">
        <div className="rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2 text-sm shadow-sm">
          <WhatsAppFormattedText
            text={body}
            className="break-words whitespace-pre-wrap"
          />
          <p className="mt-1 text-xs text-muted">
            Customer · {formatMessageTime(message.createdAt)}
          </p>
        </div>
      </li>
    );
  }

  if (role === "staff") {
    return (
      <li className="ml-auto max-w-[88%] min-w-0">
        <div className="rounded-2xl rounded-br-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          <WhatsAppFormattedText
            text={body}
            className="break-words whitespace-pre-wrap"
          />
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
            <UserRound className="h-3 w-3" aria-hidden />
            Staff · {formatMessageTime(message.createdAt)}
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className="ml-auto max-w-[88%] min-w-0">
      <div className="rounded-2xl rounded-br-md border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-sm text-emerald-950">
        <WhatsAppFormattedText
          text={body}
          className="break-words whitespace-pre-wrap"
        />
        {simulated ? (
          <p className="mt-1 text-xs italic text-emerald-800/90">Simulated demo</p>
        ) : null}
        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
          <Bot className="h-3 w-3" aria-hidden />
          {audience === "owner" ? "Your assistant" : "Bot"} ·{" "}
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </li>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value === null || value === "" ? "—" : value}</dd>
    </div>
  );
}
