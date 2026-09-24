import { TENANT_FLOW_OPTIONS, type TenantFlow } from "./types";

const NAIROBI = "Africa/Nairobi";

export function labelize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function flowLabel(flow: TenantFlow): string {
  return (
    TENANT_FLOW_OPTIONS.find((option) => option.value === flow)?.label ??
    labelize(flow)
  );
}

export function formatPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  if (/^\d{8,15}$/.test(trimmed)) {
    return `+${trimmed}`;
  }
  return trimmed;
}

export function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Inclusive Nairobi calendar day, as the API's exclusive `to` bound expects. */
export function nairobiDayStartIso(day: string): string {
  return `${day}T00:00:00.000+03:00`;
}

export function nairobiDayEndExclusiveIso(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + 1));
  return `${next.toISOString().slice(0, 10)}T00:00:00.000+03:00`;
}

/** Calendar date `YYYY-MM-DD` in Nairobi. */
export function nairobiTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NAIROBI }).format(new Date());
}

export function nairobiYmdDaysAgo(days: number): string {
  const today = nairobiTodayYmd();
  const [year, month, date] = today.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date - days));
  return shifted.toISOString().slice(0, 10);
}

export type ConversationDatePreset = "all" | "today" | "7d" | "30d" | "custom";

export function datePresetRange(preset: ConversationDatePreset): {
  from: string;
  to: string;
} {
  const today = nairobiTodayYmd();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: nairobiYmdDaysAgo(6), to: today };
    case "30d":
      return { from: nairobiYmdDaysAgo(29), to: today };
    case "all":
    case "custom":
    default:
      return { from: "", to: "" };
  }
}

export function isLikelyLidPhone(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@lid")) {
    return true;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 15;
}

export function conversationDisplayName(input: {
  customerPhone: string;
  businessName: string | null;
}): string {
  if (input.businessName?.trim()) {
    return input.businessName.trim();
  }
  if (isLikelyLidPhone(input.customerPhone)) {
    const digits = input.customerPhone.replace(/\D/g, "");
    const tail = digits.slice(-4) || "????";
    return `Unknown number · LID …${tail}`;
  }
  return formatPhone(input.customerPhone);
}

export function formatRelativeActivity(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = new Date();
  const sameYear =
    new Intl.DateTimeFormat("en-KE", { timeZone: NAIROBI, year: "numeric" }).format(
      date,
    ) ===
    new Intl.DateTimeFormat("en-KE", { timeZone: NAIROBI, year: "numeric" }).format(
      now,
    );
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatDaySeparator(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: NAIROBI,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function nairobiDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone: NAIROBI }).format(date);
}
