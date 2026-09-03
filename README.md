# Document Geeks — Node.js SMTP server + Static Assets

The site serves the contact form from Node.js and sends submissions through
SMTP2GO's SMTP relay on port 587. The SMTP password must only exist in the
server environment.

## Required server settings

Configure these environment variables on the Node.js server:

```env
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=587
SMTP_USER=leirret@dgls.xyz
SMTP_PASSWORD=your-smtp2go-password
CONTACT_FROM_EMAIL=noreply@dgls.xyz
CONTACT_TO_EMAIL=Info@DocumentGeeks.com
```

`CONTACT_FROM_EMAIL` must be a sender verified in SMTP2GO. Never commit the
password or `.dev.vars`.

## Important SMTP2GO requirement

`CONTACT_FROM_EMAIL` must be authorized in your SMTP2GO account. If you use `noreply@dgls.xyz`, then `dgls.xyz` (or that sender address) must be verified in SMTP2GO.

## Run

```bash
npm install
npm start
```

The Node.js server serves files from `public/` and handles `POST /api/contact`.
Point the domain's reverse proxy to the Node.js process (default port `3000`).
Cloudflare Workers cannot send through SMTP port 587, so do not deploy the
contact handler with `wrangler deploy`.

## How the form works

- `public/contact.html` contains the form.
- `public/assets/main.js` POSTs JSON to `/api/contact`.
- `server.js` validates the form and sends mail through SMTP2GO.
- `public/assets/main.js` submits the form to `/api/contact`.

## Troubleshooting

If the form fails, the page now displays the actual SMTP2GO failure message when available.

You can also view Worker logs in Cloudflare Dashboard. The Worker logs the SMTP2GO response (never the API key).
