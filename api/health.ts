import { applyCors, sendJson, type HttpRequest, type HttpResponse } from "../lib/http.js";

export interface HealthResponse {
  ok: true;
  service: string;
  domain: string;
  status: string;
  region: string;
  timestamp: string;
}

export default function handler(req: HttpRequest, res: HttpResponse): void {
  if (applyCors(req, res, "GET, OPTIONS")) return;

  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const payload: HealthResponse = {
    ok: true,
    service: "sureyeah-cv",
    domain: "SureYeah.cv",
    status: "building it.",
    region: process.env.VERCEL_REGION || "local",
    timestamp: new Date().toISOString(),
  };

  sendJson(res, 200, payload);
}
