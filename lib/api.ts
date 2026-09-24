import {
  nairobiDayEndExclusiveIso,
  nairobiDayStartIso,
} from "./format";
import type {
  ConversationDetail,
  ConversationListResult,
  DashboardFunnel,
  DashboardTenantSummary,
  DashboardTenantWhatsapp,
  DashboardToday,
  DemoAnalyticsRow,
  LeadScore,
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

export function createDashboardApi(credentials: Credentials) {
  const tenantQuery = (tenantId: string) =>
    `tenantId=${encodeURIComponent(tenantId)}`;

  return {
    listTenants: () =>
      request<DashboardTenantSummary[]>("/dashboard/tenants", credentials),

    createTenant: (body: { name: string; flow: TenantFlow }) =>
      request<{ id: string }>("/dashboard/tenants", credentials, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    tenantWhatsapp: (tenantId: string) =>
      request<DashboardTenantWhatsapp>(
        `/dashboard/tenants/${encodeURIComponent(tenantId)}/whatsapp`,
        credentials,
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

    conversations: (tenantId: string, query: ConversationQuery) => {
      const params = new URLSearchParams({
        tenantId,
        page: String(query.page),
        pageSize: "25",
      });
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
      return request<ConversationListResult>(
        `/dashboard/conversations?${params.toString()}`,
        credentials,
      );
    },

    conversation: (tenantId: string, id: string) =>
      request<ConversationDetail>(
        `/dashboard/conversations/${encodeURIComponent(id)}?${tenantQuery(tenantId)}`,
        credentials,
      ),
  };
}

export type DashboardApi = ReturnType<typeof createDashboardApi>;
