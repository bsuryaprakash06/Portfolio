const ALLOWED_ORIGINS = new Set([
  "https://sureyeah.cv",
  "https://www.sureyeah.cv",
]);

/**
 * Resolve safe CORS origin for production domain, Vercel previews, and localhost.
 */
function resolveOrigin(origin) {
  if (!origin) return "*";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return "https://sureyeah.cv";
}

export function applyCors(req, res, methods = "GET, OPTIONS") {
  const origin = req.headers?.origin;
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

export function sendJson(res, statusCode, payload) {
  if (statusCode === 204) {
    if (typeof res.status === "function") {
      res.status(204).end();
    } else {
      res.writeHead(204);
      res.end();
    }
    return;
  }

  const body = JSON.stringify(payload);
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(statusCode).json(payload);
    return;
  }

  res.writeHead(statusCode);
  res.end(body);
}

export async function readJsonBody(req, maxBytes = 16 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") return req.body;
    if (typeof req.body === "string") {
      return req.body.trim() ? JSON.parse(req.body) : {};
    }
  }

  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      const err = new Error("Payload too large");
      err.statusCode = 413;
      throw err;
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("Invalid JSON body");
    err.statusCode = 400;
    throw err;
  }
}
