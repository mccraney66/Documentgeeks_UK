// Document Geeks Cloudflare Worker
// Serves the static website and sends contact-form submissions through SMTP2GO.

const SMTP2GO_API_URL = "https://api.smtp2go.com/v3/email/send";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function handleContact(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "The form data could not be read." }, 400);
  }

  // Honeypot. Normal users never fill this field.
  if (clean(data.website, 200)) {
    return jsonResponse({ ok: true }, 200);
  }

  const firstName = clean(data.firstName, 80);
  const lastName = clean(data.lastName, 80);
  const email = clean(data.email, 254);
  const phone = clean(data.phone, 60);
  const service = clean(data.service, 120);
  const message = clean(data.message, 10000);
  const smsConsent = data.smsConsent === true;

  if (!firstName || !lastName || !email || !message) {
    return jsonResponse({ ok: false, error: "Please complete all required fields." }, 400);
  }

  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  if (!env.SMTP2GO_API_KEY) {
    return jsonResponse({
      ok: false,
      error: "SMTP2GO_API_KEY is not configured in this Worker."
    }, 500);
  }

  // IMPORTANT: This must be an address/domain verified in your SMTP2GO account.
  const fromEmail = clean(env.CONTACT_FROM_EMAIL, 254);
  const toEmail = clean(env.CONTACT_TO_EMAIL || "Info@DocumentGeeks.com", 254);

  if (!fromEmail) {
    return jsonResponse({
      ok: false,
      error: "CONTACT_FROM_EMAIL is not configured. Set it to a sender verified by SMTP2GO."
    }, 500);
  }

  const displayService = service || "New Order";
  const fullName = `${firstName} ${lastName}`;

  const textBody = [
    "New Document Geeks website submission",
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Service: ${displayService}`,
    `SMS opt-in: ${smsConsent ? "Yes" : "No"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const htmlBody =
    `<h2>New Document Geeks website submission</h2>` +
    `<p><strong>Name:</strong> ${escapeHtml(fullName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}<br>` +
    `<strong>Service:</strong> ${escapeHtml(displayService)}<br>` +
    `<strong>SMS opt-in:</strong> ${smsConsent ? "Yes" : "No"}</p>` +
    `<p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  const payload = {
    sender: `Document Geeks Website <${fromEmail}>`,
    to: [toEmail],
    subject: `Website request: ${displayService} — ${fullName}`,
    text_body: textBody,
    html_body: htmlBody,
    custom_headers: [{ header: "Reply-To", value: email }],
    fastaccept: true,
  };

  let smtpResponse;
  try {
    smtpResponse = await fetch(SMTP2GO_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "X-Smtp2go-Api-Key": env.SMTP2GO_API_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("SMTP2GO network error", error);
    return jsonResponse({
      ok: false,
      error: "The email service could not be reached. Please try again or call 951-923-2527."
    }, 502);
  }

  const result = await smtpResponse.json().catch(() => ({}));
  console.log("SMTP2GO response", JSON.stringify(result));

  const succeeded = Number(result?.data?.succeeded || 0);
  const failed = Number(result?.data?.failed || 0);
  const failures = Array.isArray(result?.data?.failures) ? result.data.failures : [];

  if (!smtpResponse.ok || succeeded < 1 || failed > 0) {
    const providerError =
      failures.join(" | ") ||
      result?.data?.error ||
      result?.data?.error_code ||
      `SMTP2GO returned HTTP ${smtpResponse.status}.`;

    console.error("SMTP2GO send failed", providerError);
    return jsonResponse({
      ok: false,
      error: `Email was not sent: ${providerError}`
    }, 502);
  }

  return jsonResponse({
    ok: true,
    message: "Thank you. Your request has been sent to Document Geeks.",
    requestId: result?.request_id || null,
  }, 200);
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
      } catch (error) {
        console.error("Unexpected contact-form error", error);
        return jsonResponse({
          ok: false,
          error: "An unexpected error occurred. Please try again or call 951-923-2527."
        }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
