// Cloudflare Worker: serves the static site and handles the contact form
// by relaying submissions through the SMTP2GO HTTP API (no desktop email
// client involved).

const TO_EMAIL = "Info@DocumentGeeks.com";
const FROM_EMAIL = "noreply@dgls.xyz";
const SMTP2GO_API_URL = "https://api.smtp2go.com/v3/email/send";

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const email = String(data.email || "").trim();
  const phone = String(data.phone || "").trim();
  const service = String(data.service || "").trim();
  const message = String(data.message || "").trim();
  const smsConsent = Boolean(data.smsConsent);

  if (!firstName || !lastName || !email || !message) {
    return jsonResponse({ ok: false, error: "Missing required fields." }, 400);
  }

  const apiKey = env.SMTP2GO_API_KEY;
  if (!apiKey) {
    return jsonResponse({ ok: false, error: "Email service is not configured." }, 500);
  }

  const textBody =
    `New contact form submission\n\n` +
    `Name: ${firstName} ${lastName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "n/a"}\n` +
    `Service: ${service || "n/a"}\n` +
    `SMS opt-in: ${smsConsent ? "Yes" : "No"}\n\n` +
    `Message:\n${message}\n`;

  const htmlBody =
    `<h2>New contact form submission</h2>` +
    `<p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Phone:</strong> ${escapeHtml(phone || "n/a")}<br>` +
    `<strong>Service:</strong> ${escapeHtml(service || "n/a")}<br>` +
    `<strong>SMS opt-in:</strong> ${smsConsent ? "Yes" : "No"}</p>` +
    `<p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  const payload = {
    api_key: apiKey,
    to: [TO_EMAIL],
    sender: FROM_EMAIL,
    subject: `Website contact form: ${service || "New Order"} — ${firstName} ${lastName}`,
    text_body: textBody,
    html_body: htmlBody,
    custom_headers: email
      ? [{ header: "Reply-To", value: email }]
      : undefined,
  };

  const res = await fetch(SMTP2GO_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json().catch(() => ({}));
  const succeeded = res.ok && result?.data?.succeeded > 0;

  if (!succeeded) {
    return jsonResponse({ ok: false, error: "Failed to send email." }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
      }
      try {
        return await handleContact(request, env);
      } catch (err) {
        return jsonResponse({ ok: false, error: "Unexpected error." }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
