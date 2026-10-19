# Moosh Hair Studio — website

Website for **Moosh Hair Studio**, a ladies-only hair salon in Banjarbaru (since 2008).
A static site with no backend, no database and no third-party scripts, so there is very little that can be attacked.

## How it is built

```
content/site.json     ← ALL editable text: hours, WhatsApp, promo, services, colours, gallery
public/img/           ← photos (WebP, 480px and 800px versions of each)
public/fonts/         ← self-hosted fonts (no Google requests)
src/page.mjs          ← HTML template (every content value is HTML-escaped)
src/styles.css        ← styles
src/js/hair.js        ← the interactive hair renderer (canvas)
src/js/app.js         ← page behaviour: combing, Rumus, colour lab, booking form
scripts/build.mjs     ← builds dist/ and checks site.json for mistakes
scripts/serve.mjs     ← local preview with the production security headers
vercel.json           ← hosting config + security headers (public/_headers has the same for Netlify/Cloudflare)
.pages.yml            ← Pages CMS config, so the owner can edit content in a simple dashboard
```

The build needs Node 20+ and has **zero dependencies**:

```bash
npm run build     # → dist/
npm run preview   # → http://localhost:4173 with real security headers
npm run check     # build + HTML validation
```

## Security

- **Strict Content Security Policy:** scripts, styles, fonts and images load only from this site. There are no inline scripts or inline styles, and the site can't be framed.
- **HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy** (camera, mic and location off), COOP and CORP.
- **No forms are posted anywhere.** The booking form only builds a WhatsApp link in the browser, so there is no server to attack and no customer data is stored.
- **User input is cleaned:** control characters are stripped, length is limited, and it is URL-encoded before going into the WhatsApp link.
- **Content is escaped at build time,** so text edited in the CMS can't inject HTML or scripts. JSON in the page escapes `<`.
- **The build checks the content.** It fails if the WhatsApp number, hours, colours or photo names in `site.json` are malformed, so a typo can't break the live site.
- **External links** use `rel="noopener noreferrer"`.
- **No dependencies** means nothing to keep patched, and no supply-chain risk.

## Editing content

Change `content/site.json` and push. The host rebuilds automatically.
For the owner, connect the repo to [Pages CMS](https://pagescms.org) (free). It reads `.pages.yml` and gives her a simple form to change the promo, hours, services and photos without touching code.

Adding a photo: upload `name-480.webp` and `name-800.webp` (portrait, about 9:16) to `public/img/`, then reference `name` in the gallery or a colour.

## Before launch

- [ ] Set `site.url` in `content/site.json` to the real domain (used for SEO, sitemap and social previews).
- [ ] Confirm opening days. The structured data currently says every day, 09:00–18:00.
- [ ] Confirm customers shown in photos are happy to appear on the website.
