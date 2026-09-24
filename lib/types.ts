export type LeadScore = "HOT" | "WARM" | "COLD";

export type TenantFlow = "techfind_demo" | "enquiry_intake";

export type BaileysSessionStatus =
  | "waiting_for_scan"
  | "connected"
  | "logged_out";

export type ConversationState =
  | "NEW"
  | "TECHFIND_GREETING"
  | "INDUSTRY_DISCOVERY"
  | "DEMO_SELECTED"
  | "DEMO_RUNNING"
  | "DEMO_TRANSACTION"
  | "VALUE_REVEAL"
  | "BUSINESS_QUALIFICATION"
  | "LEAD_SCORED"
  | "MEETING_OFFERED"
  | "MEETING_BOOKED"
  | "HUMAN_HANDOFF";

export type DashboardToday = {
  whatsappConversations: number;
  newProspects: number;
  simulationsStarted: number;
  simulationsCompleted: number;
  qualifiedLeads: number;
  hotLeads: number;
  meetingsBooked: number;
  humanHandoffs: number;
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

export type DashboardFunnel = {
  stages: FunnelStage[];
};

export type ConversationListItem = {
  id: string;
  customerPhone: string;
  businessName: string | null;
  industry: string | null;
  leadScore: LeadScore | null;
  currentState: ConversationState;
  demoMode: string | null;
  assignedSalesperson: string | null;
  nextAction: string | null;
  createdAt: string;
};

export type ConversationListResult = {
  items: ConversationListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ConversationMessage = {
  id: string;
  direction: "in" | "out";
  text: string | null;
  createdAt: string;
};

export type ConversationDetail = {
  id: string;
  customerPhone: string;
  currentState: ConversationState;
  demoMode: string | null;
  assignedSalesperson: string | null;
  nextAction: string | null;
  createdAt: string;
  lead: {
    businessName: string | null;
    industry: string | null;
    leadScore: LeadScore | null;
    painPoint: string | null;
    dailyEnquiryVolume: number | null;
    currentProcess: string | null;
    staffCount: number | null;
    existingSystem: string | null;
    conversationSummary: string | null;
    requestedFeatures: string[];
  } | null;
  messages: ConversationMessage[];
};

export type DemoAnalyticsRow = {
  demoMode: string;
  started: number;
  completed: number;
  leads: number;
  meetings: number;
};

export type DashboardTenantSummary = {
  id: string;
  name: string;
  flow: TenantFlow;
  linkedPhone: string | null;
  status: BaileysSessionStatus | null;
};

export type DashboardTenantWhatsapp = {
  status: BaileysSessionStatus | null;
  linkedPhone: string | null;
  qrDataUrl: string | null;
};

export const TENANT_FLOW_OPTIONS: { value: TenantFlow; label: string }[] = [
  { value: "techfind_demo", label: "Techfind demo" },
  { value: "enquiry_intake", label: "Enquiry intake" },
];
