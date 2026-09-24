import type { BaileysSessionStatus, LeadScore } from "@/lib/types";

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

export function StatusDot({
  status,
}: {
  status: BaileysSessionStatus | null;
}) {
  const key = status ?? "offline";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[key]}`} />
      {STATUS_LABELS[key]}
    </span>
  );
}
