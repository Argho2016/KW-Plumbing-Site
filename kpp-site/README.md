# Kitchener Plumbing Pros: concept site with booking backend

A design demonstration prepared for Kitchener Plumbing Pros. It is not the
company's live website.

## Run it

Needs Node.js 18 or newer (https://nodejs.org). No packages to install.

    node server.js

Then open http://localhost:3000

Opening `public/index.html` straight from disk shows the pages, but the booking
form needs the server.

## The office inbox

1. Copy `.env.example` to `.env`
2. Set `ADMIN_PASSWORD` to a password of your own
3. Restart the server and open http://localhost:3000/admin
   (user name `office` unless you change `ADMIN_USER`)

The inbox lists every request, lets the office set a status and a note, and
exports a CSV. It is switched off until a password is set.

## What the backend does

| Route | Purpose |
|---|---|
| `POST /api/bookings` | Validates and stores a service call request. Accepts JSON (the site's form) or a plain form post (works with JavaScript off, redirects to `thanks.html`). |
| `GET /api/health` | Storage type and whether the inbox is enabled |
| `GET /admin` | Password-protected inbox |
| `POST /admin/update` | Status and note for one request |
| `GET /admin/export.csv` | Everything as a spreadsheet |

Requests are stored in `data/bookings.sqlite` on Node 22.5+, or
`data/bookings.json` on older versions. Protections: field validation, a
16 KB body limit, a hidden honeypot field, five requests per ten minutes per
address, escaped output, basic-auth with constant-time comparison, same-origin
check on inbox updates, security headers.

## Not set up yet

- **Notifications.** New requests appear in the inbox only. Set
  `NOTIFY_WEBHOOK` to an https URL (Slack, Zapier, Make and similar) to be
  pinged for each one. Email or SMS needs a provider account.
- **Hosting, a domain and HTTPS.** Run it behind a reverse proxy that
  terminates TLS, and set `TRUST_PROXY=1` and `HOST=0.0.0.0`.
- **A privacy notice** for the personal details the form collects.
- **Reviews** are paraphrased summaries; the live widget is not embedded.

## Editing

- `src/home.html` is the home page (the scroll-driven one).
- `build-pages.mjs` holds the shared header, menu, form and footer and the
  content of every other page. After editing either, run `node build-pages.mjs`.
- `public/site.css` is the shared design: colours, type, buttons, forms, motion.
- `public/scrollcraft.js` and `.css` are the scroll engine and are not edited.
