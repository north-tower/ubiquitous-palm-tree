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
