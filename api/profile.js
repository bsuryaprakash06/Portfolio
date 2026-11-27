import { applyCors, sendJson } from "../lib/http.js";

const PROFILE = {
  name: "Surya Prakash B",
  domain: "SureYeah.cv",
  tagline: "I simplify the way you work.",
  status: "building it.",
  copyrightYear: 2026,
  links: {
    github: "https://github.com/bsuryaprakash06",
    linkedin: "https://www.linkedin.com/in/bsuryaprakash06",
    twitter: "https://x.com/shenzoz",
    email: "suryaprakashb2006@gmail.com",
  },
};

export default function handler(req, res) {
  if (applyCors(req, res, "GET, OPTIONS")) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  return sendJson(res, 200, {
    ok: true,
    profile: PROFILE,
  });
}
