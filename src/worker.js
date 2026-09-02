// Cloudflare Worker: serves the static site and handles the contact form
// by relaying submissions over real SMTP (STARTTLS) to SMTP2GO's mail
// server, using Cloudflare's TCP socket support — no desktop email client
// involved.

import { connect } from "cloudflare:sockets";

const TO_EMAIL = "Info@DocumentGeeks.com";
const FROM_EMAIL = "noreply@dgls.xyz";
const SMTP_HOST = "mail.smtp2go.com";
const SMTP_PORT = 587;

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

function b64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

// Minimal SMTP client: connects, STARTTLS upgrades, AUTH LOGIN, sends one
// message, then quits. Throws on any unexpected/error SMTP reply code.
class SmtpClient {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.buffer = "";
  }

  async readReply() {
    // SMTP multi-line replies look like "250-foo\r\n250 bar\r\n"; the last
    // line has a space (not a dash) after the code.
    while (true) {
      const lines = this.buffer.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (/^\d{3} /.test(line)) {
          this.buffer = lines.slice(i + 1).join("\r\n");
          return line;
        }
      }
      const { value, done } = await this.reader.read();
      if (done) throw new Error("SMTP connection closed unexpectedly.");
      this.buffer += new TextDecoder().decode(value);
    }
  }

  async send(command) {
    await this.writer.write(new TextEncoder().encode(command + "\r\n"));
  }

  async command(cmd, expectedCode) {
    if (cmd !== null) await this.send(cmd);
    const reply = await this.readReply();
    const code = reply.slice(0, 3);
    if (expectedCode && code !== expectedCode) {
      throw new Error(`SMTP error (expected ${expectedCode}): ${reply}`);
    }
    return reply;
  }

  async close() {
    try {
      this.reader.releaseLock();
    } catch {}
    try {
      this.writer.releaseLock();
    } catch {}
    try {
      await this.socket.close();
    } catch {}
  }
}

async function sendMail(env, { to, from, replyTo, subject, text, html }) {
  const socket = connect(
    { hostname: SMTP_HOST, port: SMTP_PORT },
    { secureTransport: "starttls" }
  );

  const client = new SmtpClient(socket);
  try {
    await client.command(null, "220");
    await client.command(`EHLO dgls.xyz`, "250");
    await client.command("STARTTLS", "220");

    // Upgrade the plain socket to TLS now that STARTTLS was accepted.
    const secureSocket = socket.startTls();
    const secureClient = new SmtpClient(secureSocket);

    await secureClient.command(`EHLO dgls.xyz`, "250");
    await secureClient.command("AUTH LOGIN", "334");
    await secureClient.command(b64(env.SMTP_USERNAME), "334");
    await secureClient.command(b64(env.SMTP_PASSWORD), "235");
    await secureClient.command(`MAIL FROM:<${from}>`, "250");
    await secureClient.command(`RCPT TO:<${to}>`, "250");
    await secureClient.command("DATA", "354");

    const boundary = "----dgcontact" + crypto.randomUUID().replace(/-/g, "");
    const headers = [
      `From: ${from}`,
      `To: ${to}`,
      replyTo ? `Reply-To: ${replyTo}` : null,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ]
      .filter(Boolean)
      .join("\r\n");

    const mime =
      `${headers}\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset="utf-8"\r\n\r\n` +
      `${text}\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/html; charset="utf-8"\r\n\r\n` +
      `${html}\r\n\r\n` +
      `--${boundary}--\r\n`;

    // Dot-stuff lines that start with "." per SMTP DATA rules.
    const dataStuffed = mime.replace(/\r\n\./g, "\r\n..");

    await secureClient.send(dataStuffed + "\r\n.");
    await secureClient.command(null, "250");
    await secureClient.command("QUIT", "221");
    await secureClient.close();
  } finally {
    try {
      await client.close();
    } catch {}
  }
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

  const credentialsConfigured = env.SMTP_USERNAME && env.SMTP_PASSWORD;
  if (!credentialsConfigured) {
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

  try {
    await sendMail(env, {
      to: TO_EMAIL,
      from: FROM_EMAIL,
      replyTo: email,
      subject: `Website contact form: ${service || "New Order"} — ${firstName} ${lastName}`,
      text: textBody,
      html: htmlBody,
    });
  } catch (err) {
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
