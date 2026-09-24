import type {
  BaileysSessionStatus,
  LeadScore,
  TenantOwnerStatus,
} from "@/lib/types";

const SCORE_STYLES: Record<LeadScore, string> = {
  HOT: "bg-rose-100 text-rose-800",
  WARM: "bg-amber-100 text-amber-900",
  COLD: "bg-sky-100 text-sky-900",
};

export function ScoreBadge({ score }: { score: LeadScore | null }) {
  if (!score) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide ${SCORE_STYLES[score]}`}
    >
      {score}
    </span>
  );
}

const STATUS_STYLES: Record<BaileysSessionStatus | "offline", string> = {
  connected: "bg-emerald-400",
  waiting_for_scan: "bg-amber-300",
  logged_out: "bg-rose-400",
  offline: "bg-stone-400",
};

const STATUS_LABELS: Record<BaileysSessionStatus | "offline", string> = {
  connected: "Connected",
  waiting_for_scan: "Waiting for scan",
  logged_out: "Logged out",
  offline: "No session",
};

export function statusLabel(status: BaileysSessionStatus | null): string {
  return STATUS_LABELS[status ?? "offline"];
}

export function SessionStatusDot({
  status,
}: {
  status: BaileysSessionStatus | null;
}) {
  const key = status ?? "offline";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[key]}`}
      title={STATUS_LABELS[key]}
      aria-label={STATUS_LABELS[key]}
    />
  );
}

export function StatusDot({
  status,
}: {
  status: BaileysSessionStatus | null;
}) {
  const key = status ?? "offline";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <SessionStatusDot status={status} />
      {STATUS_LABELS[key]}
    </span>
  );
}

const STATUS_PILL_STYLES: Record<BaileysSessionStatus | "offline", string> = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-900",
  waiting_for_scan: "border-amber-200 bg-amber-50 text-amber-950",
  logged_out: "border-rose-200 bg-rose-50 text-rose-900",
  offline: "border-stone-200 bg-stone-100 text-stone-700",
};

export function StatusPill({
  status,
}: {
  status: BaileysSessionStatus | null;
}) {
  const key = status ?? "offline";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL_STYLES[key]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLES[key]}`} />
      {STATUS_LABELS[key]}
    </span>
  );
}

export type TenantDeskCategory =
  | "connected"
  | "needs_attention"
  | "not_set_up";

const DESK_CATEGORY_ORDER: Record<TenantDeskCategory, number> = {
  needs_attention: 0,
  not_set_up: 1,
  connected: 2,
};

export function tenantDeskCategory(
  status: BaileysSessionStatus | null,
  ownerStatus: TenantOwnerStatus | null,
): TenantDeskCategory {
  if (status === "connected") {
    return "connected";
  }
  if (
    status === "waiting_for_scan" ||
    status === "logged_out" ||
    ownerStatus === "invited"
  ) {
    return "needs_attention";
  }
  return "not_set_up";
}

export function compareTenantsByDeskStatus<
  T extends {
    name: string;
    status: BaileysSessionStatus | null;
    ownerStatus: TenantOwnerStatus | null;
  },
>(a: T, b: T): number {
  const catA = tenantDeskCategory(a.status, a.ownerStatus);
  const catB = tenantDeskCategory(b.status, b.ownerStatus);
  const byCategory = DESK_CATEGORY_ORDER[catA] - DESK_CATEGORY_ORDER[catB];
  if (byCategory !== 0) {
    return byCategory;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function deskCategoryLabel(category: TenantDeskCategory): string {
  switch (category) {
    case "connected":
      return "Connected";
    case "needs_attention":
      return "Needs attention";
    case "not_set_up":
      return "Not set up";
  }
}
