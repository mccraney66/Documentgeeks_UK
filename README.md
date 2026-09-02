# Document Geeks — editable Cloudflare Worker website

This is the Git-managed source project for DocumentGeeks.com.

## What changed in V8

- Rebuilt `public/services.html` from the Document Geeks service-page wording supplied by the owner.
- Restored the three original service images through their existing Wix-hosted URLs.
- Restored On-Site Scanning, Technical Services and Closed Case Management wording.
- Added Web Hosting, Mobile Copy, Process Serving, Digital Archival and Computer Service Plans to the service grid.
- Added the existing Vimeo tutorial to a clean Video Tutorials section.
- Removed the old Wix editor placeholder text (`I'm a title... Click here to edit me`) and duplicate embeds of the same Vimeo video.
- Added the missing `public/assets/styles.css` and `public/assets/main.js` files so the site package is complete.
- Preserved Perris, CA 92571, office 951-923-2527, fax 951-744-1322, privacy policy and SMS policy.

## One permanent Worker, editable through Git

Do not use Cloudflare Pages Direct Upload for this project if you want source-controlled edits.

1. Create or use one GitHub repository, for example `documentgeeks-website`.
2. Upload the CONTENTS of this folder to the repository. Keep `wrangler.jsonc` in the repo root.
3. In Cloudflare, open **Workers & Pages**.
4. To create a new Worker: **Create application → Import a repository**. Or, for an existing Worker: open it and choose **Settings → Builds → Connect**.
5. Select the GitHub repository and production branch.
6. The Cloudflare Worker name must match `name` in `wrangler.jsonc`. This project uses `documentgeeks`.
7. The default deploy command can remain `npx wrangler deploy`. No separate front-end build command is required for this static HTML site.
8. Deploy and test the workers.dev URL before attaching DocumentGeeks.com as the custom domain.

## Editing later

Edit files in the SAME repository, for example:

- `public/index.html`
- `public/services.html`
- `public/our-team.html`
- `public/privacy.html`
- `public/assets/styles.css`

Commit the change to the production branch. Cloudflare will redeploy the SAME Worker automatically.

## Local editing

```bash
npm install
npm run dev
```

To deploy from your own PC to the same Worker:

```bash
npx wrangler login
npm run deploy
```

Keeping the same `name` in `wrangler.jsonc` updates the same Worker rather than creating a new Worker.
