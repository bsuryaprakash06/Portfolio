import { applyCors, readJsonBody, sendJson } from "../lib/http.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sanitizeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

async function sendViaResend({ name, email, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.CONTACT_FROM_EMAIL || "portfolio@sureyeah.cv";
  const to = process.env.CONTACT_TO_EMAIL || "suryaprakashb2006@gmail.com";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `SureYeah.cv <${from}>`,
      to: [to],
      reply_to: email,
      subject: `[SureYeah.cv] Note from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API responded with ${response.status}`);
  }
  return true;
}

async function sendViaWebhook({ name, email, message }) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `**New SureYeah.cv Note**\n**Name:** ${name}\n**Email:** ${email}\n**Message:** ${message}`,
      name,
      email,
      message,
      source: "SureYeah.cv",
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}`);
  }
  return true;
}

export default async function handler(req, res) {
  if (applyCors(req, res, "POST, OPTIONS")) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, {
      ok: false,
      error: err.message || "Invalid request payload",
    });
  }

  // Honeypot trap for automated spam bots
  if (sanitizeText(body.website, 120)) {
    return sendJson(res, 200, {
      ok: true,
      message: "Thanks for reaching out.",
      delivered: { email: false, webhook: false },
    });
  }

  const name = sanitizeText(body.name, 80);
  const email = sanitizeText(body.email, 160);
  const message = sanitizeText(body.message, 2000);

  if (!name || name.length < 2) {
    return sendJson(res, 400, {
      ok: false,
      error: "Please enter your name (at least 2 characters).",
    });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return sendJson(res, 400, {
      ok: false,
      error: "Please enter a valid email address.",
    });
  }

  if (!message || message.length < 5) {
    return sendJson(res, 400, {
      ok: false,
      error: "Please write a short message (at least 5 characters).",
    });
  }

  try {
    const [emailDelivered, webhookDelivered] = await Promise.all([
      sendViaResend({ name, email, message }),
      sendViaWebhook({ name, email, message }),
    ]);

    if (!emailDelivered && !webhookDelivered) {
      console.info(
        `[SureYeah.cv contact] Received message from ${name} <${email}> (no forwarding env configured yet).`
      );
    }

    return sendJson(res, 200, {
      ok: true,
      message:
        emailDelivered || webhookDelivered
          ? "Message sent — I'll get back to you soon."
          : "Message received. Direct email: suryaprakashb2006@gmail.com",
      delivered: {
        email: emailDelivered,
        webhook: webhookDelivered,
      },
    });
  } catch (err) {
    console.error("[SureYeah.cv contact error]", err);
    return sendJson(res, 502, {
      ok: false,
      error:
        "Could not forward your message right now. Please email suryaprakashb2006@gmail.com directly.",
    });
  }
}
