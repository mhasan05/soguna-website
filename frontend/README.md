# সগুনা আদর্শ যুব সমাজ — Frontend

Next.js 16 (App Router, Cache Components) + Tailwind CSS v4 implementation of the designs in `../designs/`, talking to the Django API in `../backend/`.

## Run locally
Start the backend first (see `../backend/README.md`), then:

```bash
npm install
copy .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev                      # http://localhost:3000
```

`npm run build` prerenders public pages **from the live API**, so the backend must be running during the build.

Log in with a seeded phone number (e.g. `01712345678` member, `01711111111` admin); with `OTP_DEV_CODE=123456` in the backend `.env` the code is always `123456`.

## How data flows
| Where | How |
|---|---|
| Public pages (home, notices, events, gallery, finance, …) | Server components call `src/lib/server-api.ts` — `'use cache'` + `cacheLife('minutes'/'hours')`. Admin edits show up on public pages within about a minute. |
| Members-only parts (notice bodies, transactions, donor names/phones) | Client components fetch with the member's JWT after login (`src/lib/api.ts`). Cached HTML never contains private data. |
| Member & admin pages | Client components using `api.ts` + `useQuery` (`src/lib/use-query.ts`) and the admin `useResource` hook (`src/components/admin/store.tsx`). |

Auth: phone → OTP → JWT access/refresh tokens in `localStorage`; the access token refreshes automatically on 401 (`src/lib/api.ts`), the profile comes from `/me/` (`src/lib/session.ts`).

Admin deletes wait 7 s before the DELETE request so "ফিরিয়ে আনুন" (undo) really undoes; leaving the page sends any pending delete immediately.

## Structure
| Path | What |
|---|---|
| `src/app/(site)/` | Public pages, login/register, `/verify/[no]` |
| `src/app/(site)/(member)/` | Logged-in pages: dashboard, profile, card, dues, members, aid/apply |
| `src/app/admin/` | Admin panel — 14 pages, menu filtered by role |
| `src/components/ui/` | Design-system primitives (buttons, pills, fields, toggle, tabs, empty/skeleton states, toast) |
| `src/components/site/` | Header, footer, bottom nav, cards, share, RSVP, members-only lock |
| `src/components/admin/` | Admin shell, store/`useResource`, widgets |
| `src/lib/` | `api.ts`, `api-types.ts`, `server-api.ts`, `session.ts`, `bn.ts` (Bangla digits/money/dates), `format.ts`, `content.ts` (static copy) |

## Deploy
Build with `API_URL`/`NEXT_PUBLIC_API_URL` pointing at the API and `NEXT_PUBLIC_SITE_URL` at the public domain, then `npm start` (or a Node process manager) behind Nginx.
