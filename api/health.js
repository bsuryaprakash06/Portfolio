import { applyCors, sendJson } from "../lib/http.js";

export default function handler(req, res) {
  if (applyCors(req, res, "GET, OPTIONS")) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  return sendJson(res, 200, {
    ok: true,
    service: "sureyeah-cv",
    domain: "SureYeah.cv",
    status: "building it.",
    region: process.env.VERCEL_REGION || "local",
    timestamp: new Date().toISOString(),
  });
}
