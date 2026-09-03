# Document Geeks — Cloudflare Worker + Static Assets

This version connects the website contact form directly to `/api/contact` and sends messages using SMTP2GO.

## Required Cloudflare settings

In Cloudflare Dashboard, open the **same Worker** used for Document Geeks, then go to **Settings > Variables and Secrets**.

Create these values:

1. `SMTP2GO_API_KEY` — **Secret** — your SMTP2GO API key.
2. `CONTACT_FROM_EMAIL` — Variable — an email address or domain sender that is VERIFIED in SMTP2GO. Example only: `noreply@documentgeeks.com`.
3. `CONTACT_TO_EMAIL` — Variable — `Info@DocumentGeeks.com`.

Do **not** put the SMTP2GO API key into `wrangler.jsonc` or any file committed to GitHub.

## Important SMTP2GO requirement

`CONTACT_FROM_EMAIL` must be authorized in your SMTP2GO account. If you use `noreply@dgls.xyz`, then `dgls.xyz` (or that sender address) must be verified in SMTP2GO.

## Deploy

```bash
npm install
npx wrangler deploy
```

Or connect this repository to the existing Cloudflare Worker under **Settings > Builds** and push to the production branch.

If the deployed Worker reports that `SMTP2GO_API_KEY` is not configured, add the
secret to that Worker before deploying:

```bash
npx wrangler secret put SMTP2GO_API_KEY
```

Paste the SMTP2GO API key when Wrangler prompts for it. Secrets are not included
by `wrangler deploy`, so this command must be run once for each Worker
environment (such as production or staging).

## How the form works

- `public/contact.html` contains the form.
- `public/assets/main.js` POSTs JSON to `/api/contact`.
- `src/index.js` validates the form and calls SMTP2GO.
- Static site files continue to be served through the `ASSETS` binding.

## Troubleshooting

If the form fails, the page now displays the actual SMTP2GO failure message when available.

You can also view Worker logs in Cloudflare Dashboard. The Worker logs the SMTP2GO response (never the API key).
