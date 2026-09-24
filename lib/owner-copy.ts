import type { BaileysSessionStatus, ConversationState, TenantFlow } from "./types";

export type DeskAudience = "staff" | "owner";

type TodayCountKey =
  | "whatsappConversations"
  | "newProspects"
  | "simulationsStarted"
  | "simulationsCompleted"
  | "qualifiedLeads"
  | "hotLeads"
  | "meetingsBooked"
  | "humanHandoffs"
  | "enquiriesStarted"
  | "enquiriesSubmitted";

export type TodayMetricField = {
  key: TodayCountKey;
  label: string;
};

const OWNER_TECHFIND_METRICS: TodayMetricField[] = [
  { key: "whatsappConversations", label: "Customers chatted" },
  { key: "simulationsCompleted", label: "Finished a demo" },
  { key: "hotLeads", label: "Ready to buy" },
  { key: "meetingsBooked", label: "Meetings booked" },
];

const STAFF_TECHFIND_METRICS: TodayMetricField[] = [
  { key: "whatsappConversations", label: "Conversations" },
  { key: "newProspects", label: "New prospects" },
  { key: "simulationsStarted", label: "Sims started" },
  { key: "simulationsCompleted", label: "Sims completed" },
  { key: "qualifiedLeads", label: "Qualified" },
  { key: "hotLeads", label: "Hot leads" },
  { key: "meetingsBooked", label: "Meetings" },
  { key: "humanHandoffs", label: "Handoffs" },
];

const OWNER_ENQUIRY_METRICS: TodayMetricField[] = [
  { key: "whatsappConversations", label: "Customers chatted" },
  { key: "enquiriesSubmitted", label: "Enquiries filed" },
];

const STAFF_ENQUIRY_METRICS: TodayMetricField[] = [
  { key: "whatsappConversations", label: "Conversations" },
  { key: "newProspects", label: "New chats" },
  { key: "enquiriesStarted", label: "Started" },
  { key: "enquiriesSubmitted", label: "Filed" },
  { key: "humanHandoffs", label: "Handoffs" },
];

export function todayMetricsForAudience(
  flow: TenantFlow,
  audience: DeskAudience,
): TodayMetricField[] {
  if (flow === "enquiry_intake") {
    return audience === "owner" ? OWNER_ENQUIRY_METRICS : STAFF_ENQUIRY_METRICS;
  }
  return audience === "owner" ? OWNER_TECHFIND_METRICS : STAFF_TECHFIND_METRICS;
}

const OWNER_FUNNEL_LABELS: Record<string, string> = {
  whatsapp: "Started chatting",
  business_identified: "Told us their business",
  simulation_started: "Tried a demo",
  simulation_completed: "Finished the demo",
  qualified: "A good fit",
  meeting_booked: "Booked a meeting",
  customer: "Became a customer",
  started: "Started an enquiry",
  event_type: "Shared event type",
  date: "Shared preferred date",
  services: "Shared services",
  guests: "Shared guest count",
  venue: "Shared venue",
  budget: "Shared budget",
  details: "Shared extra details",
  confirm: "Ready to confirm",
  submitted: "Filed with you",
};

export function funnelLabelForAudience(
  key: string,
  staffLabel: string,
  audience: DeskAudience,
): string {
  if (audience === "staff") {
    return staffLabel;
  }
  return OWNER_FUNNEL_LABELS[key] ?? staffLabel;
}

export function funnelSectionTitle(audience: DeskAudience): string {
  return audience === "owner" ? "How far customers got" : "Funnel";
}

export function funnelSectionSubtitle(
  flow: TenantFlow,
  audience: DeskAudience,
): string {
  if (audience === "owner") {
    return "Everyone who has messaged you.";
  }
  return flow === "enquiry_intake"
    ? "all enquiries, all time"
    : "all conversations, all time";
}

export function demoSectionTitle(audience: DeskAudience): string {
  return audience === "owner" ? "By service" : "By demo";
}

export function demoTableHeaders(audience: DeskAudience): {
  started: string;
  completed: string;
  leads: string;
} {
  if (audience === "owner") {
    return { started: "Tried", completed: "Finished", leads: "Good fit" };
  }
  return { started: "Started", completed: "Done", leads: "Qualified" };
}

const OWNER_STATE_LABELS: Partial<Record<ConversationState, string>> = {
  INDUSTRY_DISCOVERY: "Telling us about their business",
  VALUE_REVEAL: "Saw what we can do",
};

export function conversationStateLabel(
  state: ConversationState,
  audience: DeskAudience,
): string {
  if (audience === "owner") {
    const mapped = OWNER_STATE_LABELS[state];
    if (mapped) {
      return mapped;
    }
  }
  return state
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function whatsappStatusLabel(
  status: BaileysSessionStatus | null,
  audience: DeskAudience,
): string {
  if (audience === "staff") {
    return status === "connected"
      ? "Connected"
      : status === "waiting_for_scan"
        ? "Waiting for scan"
        : status === "logged_out"
          ? "Logged out"
          : "No session";
  }
  if (status === "connected") {
    return "Connected";
  }
  if (status === "waiting_for_scan") {
    return "Waiting for scan";
  }
  return "WhatsApp not connected";
}

export function isWhatsappDisconnected(
  status: BaileysSessionStatus | null | undefined,
): boolean {
  return status === "logged_out" || status === null;
}

export function ownerHiddenNumberLabel(): string {
  return "Hidden number";
}
