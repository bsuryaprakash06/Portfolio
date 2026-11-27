# sureyeah.cv

The personal site of Surya Prakash B — currently building it. Three dark colors, a live WebGL gradient wave, and a TypeScript Vercel backend.

> *"I simplify the way you work."*

[sureyeah.cv](https://sureyeah.cv/) · [GitHub](https://github.com/bsuryaprakash06) · [LinkedIn](https://www.linkedin.com/in/bsuryaprakash06) · [X](https://x.com/shenzoz)

## What's on it

| Section | Source |
| --- | --- |
| Landing (`building it.`) | `public/index.html`, `src/main.ts` |
| Live dark gradient | `src/main.ts` (WebGL2 + Canvas 2D fallback) |
| About | `src/main.ts` (`"I simplify the way you work."`) |
| Projects | `https://github.com/bsuryaprakash06` |
| Contact | modal → `POST /api/contact` |
| Health & Profile APIs | `api/health.ts`, `api/profile.ts` |

## Stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript (strict) |
| Frontend | Vanilla HTML, CSS (`public/`), WebGL2 (`src/main.ts`) |
| Backend | Vercel Serverless Functions (`api/*.ts`) |
| Hosting | Vercel (`sureyeah.cv`) |

## Running it

```bash
npm install
npm run dev    # typecheck, build, and serve at http://127.0.0.1:4173
npm run build  # tsc --noEmit + client bundle to public/main.js
```

## Environment

Optional variables for `/api/contact` forwarding (see `.env.example`):

```bash
RESEND_API_KEY=   # optional email delivery via Resend
WEBHOOK_URL=      # optional Discord / Slack webhook notifications
```

## Design

- Three dark palette colors: `#050508` (Obsidian Void), `#110E22` (Midnight Indigo), and `#2D254C` (Twilight Violet), paired with `Inter` and a hairline grid.
- Motion pauses automatically under `prefers-reduced-motion` or via the top-right toggle.

## Layout

- `public/` — static `index.html`, `styles.css`, `favicon.svg`, and compiled `main.js`
- `src/` — TypeScript WebGL shader and UI controls
- `api/` — Vercel serverless endpoints (`health.ts`, `profile.ts`, `contact.ts`)
- `lib/` — shared typed HTTP, CORS, and JSON body helpers
- `server.ts` — local dev server mirroring `public/` and `/api/*`

Security headers and cache rules are configured in `vercel.json`.

## License

Content and design © 2026 Surya Prakash B. The code is free to read and learn from.
