# Document Geeks — Cloudflare Worker + Static Assets

The contact form sends submissions through SMTP2GO's HTTPS API.

## Cloudflare settings

In the `documentgeeks-uk` Worker, open **Settings > Variables and Secrets**:

1. Add `SMTP2GO_API_KEY` as a **Secret**.
2. Add `CONTACT_FROM_EMAIL` as a variable using a sender verified in SMTP2GO.
3. Add `CONTACT_TO_EMAIL` as a variable, normally `Info@DocumentGeeks.com`.

Do not commit `.dev.vars` or the API key.

## Local test

Install Wrangler, then from the repository root run:

```bash
npm install
npx wrangler dev
```

Wrangler loads local values from `.dev.vars`. Replace its API-key placeholder
with a valid SMTP2GO HTTP API key before testing. The local URL is usually
`http://localhost:8787`.

## Deploy

After the local test succeeds:

```bash
npx wrangler deploy
```

Static files are served from `public/`, while `/api/contact` is handled by
`src/index.js`.
