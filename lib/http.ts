import type { IncomingMessage, ServerResponse } from "node:http";

const ALLOWED_ORIGINS = new Set<string>([
  "https://sureyeah.cv",
  "https://www.sureyeah.cv",
]);

export interface HttpRequest extends IncomingMessage {
  body?: unknown;
}

export interface HttpResponse extends ServerResponse {
  status?: (code: number) => {
    json: (payload: unknown) => void;
    end: () => void;
  };
  json?: (payload: unknown) => void;
}

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

function resolveOrigin(origin: string | undefined): string {
  if (!origin) return "*";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return "https://sureyeah.cv";
}

export function applyCors(
  req: HttpRequest,
  res: HttpResponse,
  methods = "GET, OPTIONS"
): boolean {
  const originHeader = req.headers?.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  res.setHeader("Access-Control-Allow-Origin", resolveOrigin(origin));
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    sendJson(res, 204, null);
    return true;
  }
  return false;
}

export function sendJson(
  res: HttpResponse,
  statusCode: number,
  payload: unknown
): void {
  if (statusCode === 204) {
    if (typeof res.status === "function") {
      res.status(204).end();
    } else {
      res.writeHead(204);
      res.end();
    }
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (typeof res.status === "function") {
    res.status(statusCode).json(payload);
    return;
  }

  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(
  req: HttpRequest,
  maxBytes = 16 * 1024
): Promise<Record<string, unknown>> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object" && !Array.isArray(req.body)) {
      return req.body as Record<string, unknown>;
    }
    if (typeof req.body === "string") {
      return req.body.trim()
        ? (JSON.parse(req.body) as Record<string, unknown>)
        : {};
    }
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buf.length;
    if (total > maxBytes) {
      throw new HttpError(413, "Payload too large");
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new HttpError(400, "JSON body must be an object");
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, "Invalid JSON body");
  }
}
