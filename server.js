const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "Info@DocumentGeeks.com";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "noreply@dgls.xyz";

function jsonResponse(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]
  ));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleContact(request, response) {
  let data;
  try {
    data = JSON.parse(await readRequestBody(request));
  } catch {
    return jsonResponse(response, 400, { ok: false, error: "The form data could not be read." });
  }

  if (clean(data.website, 200)) {
    return jsonResponse(response, 200, { ok: true });
  }

  const firstName = clean(data.firstName, 80);
  const lastName = clean(data.lastName, 80);
  const email = clean(data.email, 254);
  const phone = clean(data.phone, 60);
  const service = clean(data.service, 120) || "New Order";
  const message = clean(data.message, 10000);
  const smsConsent = data.smsConsent === true;

  if (!firstName || !lastName || !email || !message) {
    return jsonResponse(response, 400, { ok: false, error: "Please complete all required fields." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(response, 400, { ok: false, error: "Please enter a valid email address." });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error("SMTP settings are not configured.");
    return jsonResponse(response, 500, { ok: false, error: "Email service is not configured." });
  }

  const fullName = `${firstName} ${lastName}`;
  const text = [
    "New Document Geeks website submission",
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Service: ${service}`,
    `SMS opt-in: ${smsConsent ? "Yes" : "No"}`,
    "",
    "Message:",
    message,
  ].join("\n");
  const html = `<h2>New Document Geeks website submission</h2>` +
    `<p><strong>Name:</strong> ${escapeHtml(fullName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}<br>` +
    `<strong>Service:</strong> ${escapeHtml(service)}<br>` +
    `<strong>SMS opt-in:</strong> ${smsConsent ? "Yes" : "No"}</p>` +
    `<p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: `Document Geeks Website <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Website request: ${service} — ${fullName}`,
      text,
      html,
    });
  } catch (error) {
    console.error("SMTP send failed:", error);
    return jsonResponse(response, 502, { ok: false, error: "The email could not be sent. Please try again." });
  }

  return jsonResponse(response, 200, {
    ok: true,
    message: "Thank you. Your request has been sent to Document Geeks.",
  });
}

function serveStatic(request, response) {
  const requestedPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    return jsonResponse(response, 403, { ok: false, error: "Forbidden." });
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && new URL(request.url, "http://localhost").pathname === "/api/contact") {
    await handleContact(request, response);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    jsonResponse(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }
  serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`Document Geeks server listening on port ${PORT}`);
});
