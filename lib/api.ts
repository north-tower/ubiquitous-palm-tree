import {
  nairobiDayEndExclusiveIso,
  nairobiDayStartIso,
} from "./format";
import type {
  ConnectLink,
  ConversationDetail,
  ConversationListResult,
  CreateTenantResult,
  DashboardFunnel,
  DashboardTenantSummary,
  DashboardTenantWhatsapp,
  DashboardToday,
  DemoAnalyticsRow,
  IndustryFlowRecord,
  LeadScore,
  UpsertIndustryFlowBody,
  PortalSession,
  PortalUser,
  TenantFlow,
} from "./types";

export type Credentials = {
  user: string;
  pass: string;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong";
}

function basicAuth(credentials: Credentials): string {
  const bytes = new TextEncoder().encode(
    `${credentials.user}:${credentials.pass}`,
  );
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

async function request<T>(
  path: string,
  credentials: Credentials,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", basicAuth(credentials));
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`/backend${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach this app's API proxy. Is the dev server running?",
      0,
    );
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message) {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        message = body.message.map(String).join(", ");
      }
    } catch {
      // Keep the status text when the body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export type ConversationQuery = {
  leadScore?: LeadScore | "";
  demoMode?: string;
  from?: string;
  to?: string;
  page: number;
};

export type TenantReadApi = {
  today: (tenantId: string) => Promise<DashboardToday>;
  funnel: (tenantId: string) => Promise<DashboardFunnel>;
  demoAnalytics: (tenantId: string) => Promise<DemoAnalyticsRow[]>;
  conversations: (
    tenantId: string,
    query: ConversationQuery,
  ) => Promise<ConversationListResult>;
  conversation: (tenantId: string, id: string) => Promise<ConversationDetail>;
  handoffConversation: (
    tenantId: string,
    id: string,
  ) => Promise<ConversationDetail>;
  resumeAutomation: (
    tenantId: string,
    id: string,
  ) => Promise<ConversationDetail>;
};

function conversationQueryParams(
  query: ConversationQuery,
  tenantId?: string,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: "25",
  });
  if (tenantId) {
    params.set("tenantId", tenantId);
  }
  if (query.leadScore) {
    params.set("leadScore", query.leadScore);
  }
  const demoMode = query.demoMode?.trim();
  if (demoMode) {
    params.set("demoMode", demoMode);
  }
  if (query.from) {
    params.set("from", nairobiDayStartIso(query.from));
  }
  if (query.to) {
    params.set("to", nairobiDayEndExclusiveIso(query.to));
  }
  return params;
}

export function createDashboardApi(credentials: Credentials) {
  const tenantQuery = (tenantId: string) =>
    `tenantId=${encodeURIComponent(tenantId)}`;

  return {
    listTenants: () =>
      request<DashboardTenantSummary[]>("/dashboard/tenants", credentials),

    createTenant: (body: {
      name: string;
      flow: TenantFlow;
      email?: string;
      firstName?: string;
      lastName?: string;
      appUrl?: string;
    }) =>
      request<CreateTenantResult>("/dashboard/tenants", credentials, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    resendOnboarding: (tenantId: string, appUrl?: string) =>
      request<NonNullable<CreateTenantResult["onboarding"]>>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/resend-onboarding`,
        credentials,
        {
          method: "POST",
          body: JSON.stringify(appUrl ? { appUrl } : {}),
        },
      ),

    tenantWhatsapp: (tenantId: string) =>
      request<DashboardTenantWhatsapp>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/whatsapp`,
        credentials,
      ),

    pairTenant: (tenantId: string) =>
      request<DashboardTenantWhatsapp>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/whatsapp/pair`,
        credentials,
        { method: "POST", body: "{}" },
      ),

    stopTenantPair: (tenantId: string) =>
      request<DashboardTenantWhatsapp>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/whatsapp/pair/stop`,
        credentials,
        { method: "POST", body: "{}" },
      ),

    today: (tenantId: string) =>
      request<DashboardToday>(
        `/dashboard/today?${tenantQuery(tenantId)}`,
        credentials,
      ),

    funnel: (tenantId: string) =>
      request<DashboardFunnel>(
        `/dashboard/funnel?${tenantQuery(tenantId)}`,
        credentials,
      ),

    demoAnalytics: (tenantId: string) =>
      request<DemoAnalyticsRow[]>(
        `/dashboard/demo-analytics?${tenantQuery(tenantId)}`,
        credentials,
      ),

    conversations: (tenantId: string, query: ConversationQuery) =>
      request<ConversationListResult>(
        `/dashboard/conversations?${conversationQueryParams(query, tenantId).toString()}`,
        credentials,
      ),

    conversation: (tenantId: string, id: string) =>
      request<ConversationDetail>(
        `/dashboard/conversations/${encodeURIComponent(id)}?${tenantQuery(tenantId)}`,
        credentials,
      ),

    handoffConversation: (tenantId: string, id: string) =>
      request<ConversationDetail>(
        `/dashboard/conversations/${encodeURIComponent(id)}/handoff?${tenantQuery(tenantId)}`,
        credentials,
        { method: "POST", body: "{}" },
      ),

    resumeAutomation: (tenantId: string, id: string) =>
      request<ConversationDetail>(
        `/dashboard/conversations/${encodeURIComponent(id)}/resume-automation?${tenantQuery(tenantId)}`,
        credentials,
        { method: "POST", body: "{}" },
      ),

    listIndustryFlows: (tenantId: string) =>
      request<IndustryFlowRecord[]>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/industry-flows`,
        credentials,
      ),

    createIndustryFlow: (tenantId: string, body: UpsertIndustryFlowBody) =>
      request<IndustryFlowRecord>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/industry-flows`,
        credentials,
        { method: "POST", body: JSON.stringify(body) },
      ),

    updateIndustryFlow: (
      tenantId: string,
      flowId: string,
      body: UpsertIndustryFlowBody,
    ) =>
      request<IndustryFlowRecord>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/industry-flows/${encodeURIComponent(flowId)}`,
        credentials,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
  };
}

export type DashboardApi = ReturnType<typeof createDashboardApi>;

export function portalLogin(
  email: string,
  password: string,
): Promise<PortalSession> {
  return publicRequest<PortalSession>("/portal/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function portalAcceptInvite(
  token: string,
  password: string,
): Promise<PortalSession> {
  return publicRequest<PortalSession>(
    `/portal/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    },
  );
}

export function fetchInvitePreview(token: string): Promise<{
  valid: boolean;
  firstName?: string;
  tenantName?: string;
}> {
  return publicRequest(
    `/portal/invitations/${encodeURIComponent(token)}`,
  );
}

export function createPortalApi(sessionToken: string) {
  const auth = `Bearer ${sessionToken}`;
  const bearer = <T>(path: string, init?: RequestInit) =>
    bearerRequest<T>(path, auth, init);

  return {
    me: () => bearer<PortalUser & { tenantName: string; flow: TenantFlow }>("/portal/me"),

    logout: () =>
      bearer<{ ok: true }>("/portal/logout", { method: "POST", body: "{}" }),

    whatsapp: () => bearer<ConnectLink>("/portal/whatsapp"),

    pairWhatsapp: () =>
      bearer<ConnectLink>("/portal/whatsapp/pair", {
        method: "POST",
        body: "{}",
      }),

    stopPairWhatsapp: () =>
      bearer<ConnectLink>("/portal/whatsapp/pair/stop", {
        method: "POST",
        body: "{}",
      }),

    today: () => bearer<DashboardToday>("/portal/today"),
    funnel: () => bearer<DashboardFunnel>("/portal/funnel"),
    demoAnalytics: () =>
      bearer<DemoAnalyticsRow[]>("/portal/demo-analytics"),
    conversations: (_tenantId: string, query: ConversationQuery) =>
      bearer<ConversationListResult>(
        `/portal/conversations?${conversationQueryParams(query).toString()}`,
      ),
    conversation: (_tenantId: string, id: string) =>
      bearer<ConversationDetail>(
        `/portal/conversations/${encodeURIComponent(id)}`,
      ),
    handoffConversation: async () => {
      throw new ApiError("Handoff is only available on the staff desk.", 403);
    },
    resumeAutomation: async () => {
      throw new ApiError("Resume is only available on the staff desk.", 403);
    },
  };
}

export type PortalApi = ReturnType<typeof createPortalApi>;

async function bearerRequest<T>(
  path: string,
  authorization: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", authorization);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`/backend${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach this app's API proxy. Is the dev server running?",
      0,
    );
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message) {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        message = body.message.map(String).join(", ");
      }
    } catch {
      // Keep the status text when the body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

/** Public tenant page. Does not send the staff Basic auth header. */
export function fetchConnectLink(token: string): Promise<ConnectLink> {
  return publicRequest<ConnectLink>(`/connect/${encodeURIComponent(token)}`);
}

export function pairConnectLink(token: string): Promise<ConnectLink> {
  return publicRequest<ConnectLink>(
    `/connect/${encodeURIComponent(token)}/pair`,
    { method: "POST", body: "{}" },
  );
}

export function stopConnectPair(token: string): Promise<ConnectLink> {
  return publicRequest<ConnectLink>(
    `/connect/${encodeURIComponent(token)}/pair/stop`,
    { method: "POST", body: "{}" },
  );
}

export function createConnectApi(token: string): TenantReadApi {
  const root = `/connect/${encodeURIComponent(token)}`;
  return {
    today: () => publicRequest<DashboardToday>(`${root}/today`),
    funnel: () => publicRequest<DashboardFunnel>(`${root}/funnel`),
    demoAnalytics: () =>
      publicRequest<DemoAnalyticsRow[]>(`${root}/demo-analytics`),
    conversations: (_tenantId, query) =>
      publicRequest<ConversationListResult>(
        `${root}/conversations?${conversationQueryParams(query).toString()}`,
      ),
    conversation: (_tenantId, id) =>
      publicRequest<ConversationDetail>(
        `${root}/conversations/${encodeURIComponent(id)}`,
      ),
    handoffConversation: async () => {
      throw new ApiError("Handoff is only available on the staff desk.", 403);
    },
    resumeAutomation: async () => {
      throw new ApiError("Resume is only available on the staff desk.", 403);
    },
  };
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`/backend${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach this app's API proxy. Is the dev server running?",
      0,
    );
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string" && body.message) {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        message = body.message.map(String).join(", ");
      }
    } catch {
      // Keep the status text when the body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
