import { type NextRequest } from "next/server";

function backendBase(): string {
  const raw = process.env.API_URL ?? "http://localhost:3000";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function isProxiedPath(path: string[]): boolean {
  if (path.length === 0) {
    return false;
  }
  if (path[0] === "dashboard" || path[0] === "portal") {
    return true;
  }
  return isConnectPath(path);
}

const CONNECT_READS = new Set([
  "today",
  "funnel",
  "demo-analytics",
  "conversations",
]);

function isConnectPath(path: string[]): boolean {
  if (path[0] !== "connect" || path[1] === undefined || path[1].length === 0) {
    return false;
  }
  if (path.length === 2) {
    return true;
  }
  if (
    path.length === 3 &&
    (CONNECT_READS.has(path[2]) || path[2] === "pair")
  ) {
    return true;
  }
  if (path.length === 4 && path[2] === "pair" && path[3] === "stop") {
    return true;
  }
  return path.length === 4 && path[2] === "conversations" && path[3].length > 0;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const invalidSegment = path.some(
    (segment) => segment === "." || segment === ".." || segment.includes("\\"),
  );
  if (!isProxiedPath(path) || invalidSegment) {
    return Response.json({ message: "Unknown dashboard route" }, { status: 404 });
  }

  const target = new URL(`${path.join("/")}${request.nextUrl.search}`, backendBase());
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let response: Response;
  try {
    response = await fetch(target, init);
  } catch {
    return Response.json(
      {
        message:
          "Cannot reach the API. Start the backend on port 3000, or set API_URL.",
      },
      { status: 502 },
    );
  }

  const body = await response.arrayBuffer();
  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) {
    responseHeaders.set("content-type", responseType);
  }
  return new Response(body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
