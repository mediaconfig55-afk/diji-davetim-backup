# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A reusable digital invitation site (düğün/kına/sünnet — wedding/henna-night/circumcision) built with
Next.js 16 (App Router, Turbopack), Tailwind CSS v4, Framer Motion, and Supabase. It is meant to be
reused across many events: instead of forking the code per event, every event-specific value (names,
parents, date, program, IBANs, theme colors, Supabase project) lives in one file,
[src/lib/config.ts](src/lib/config.ts), plus environment variables in `.env.local`.

## Commands

```bash
npm run dev      # start dev server (Turbopack) at localhost:3000
npm run build    # production build — also type-checks and prerenders static routes
npm run start    # run the production build
npm run lint     # ESLint (flat config in eslint.config.mjs)
npx tsc --noEmit # type-check only, faster than a full build
```

There is no test suite configured.

## Setting up a new event (the core workflow)

1. Create a **new Supabase project** for the event (keeps each event's guest data, RSVPs and photos
   fully isolated).
2. In the Supabase SQL Editor, run [supabase/migration.sql](supabase/migration.sql) as-is. It creates
   the `rsvps`, `guestbook`, `photos`, `event_settings` tables (with RLS policies) and the
   `wedding-photos` public storage bucket with an anon upload policy.
3. Fill in `.env.local` (copy from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, service_role secret. Server-only, used by
     [src/lib/supabase/server.ts](src/lib/supabase/server.ts) for the admin dashboard and the photo
     reveal check. Without it, `/api/photos` and `/api/admin/*` throw.
   - `ADMIN_PASSWORD` — password for `/admin`.
   - `ADMIN_SESSION_SECRET` — any long random string, used to HMAC-sign the admin session cookie.
4. Edit [src/lib/config.ts](src/lib/config.ts) for the defaults. Every field except `siteUrl` can
   also be edited later from `/admin/dashboard` → **Etkinlik Bilgilerini Düzenle** (writes to the
   `event_config` table; an admin edit always overrides the file default — see "Config resolution"
   below): couple/child name(s), parents, `eventType` (`"wedding" | "kina" | "sunnet"` — changes
   wording via `eventTypeLabels`), `date`, `weddingEndAt` (when the photo pool auto-reveals), venue
   (name/address/map link), `program` timeline, `ibans`, and `theme` colors (applied as CSS
   variables in [src/app/layout.tsx](src/app/layout.tsx)). `siteUrl` (the deployed domain, used for
   QR codes) is file-only.
5. Deploy (e.g. Vercel) with the same env vars, point `siteUrl` at the real domain, then print/download
   the two QR codes from `/admin/dashboard` (invite link + photo-upload link).

**Deploying to production (important — no CI):** the live Vercel project (`dueguen/diji-davetim`) is
**not** connected to auto-deploy on git push — its GitHub App integration isn't authorized, so pushing
to `main` updates GitHub but does **not** trigger a new Vercel build. After every push meant to go
live, deploy manually: `npx vercel --prod` (needs `vercel login` or a `VERCEL_TOKEN` env var once per
machine). Confirm what's actually live with `npx vercel ls diji-davetim` (top row's Age) before
assuming a push shipped.

No other file needs to change per event.

## Architecture

**Data flow / trust boundaries** — this is the part that spans multiple files and is easy to get wrong:

- **Public writes** (RSVP submit, guestbook post, photo upload) go straight from the client to Supabase
  using the anon key (`src/lib/supabase/client.ts`), relying on RLS policies in
  `supabase/migration.sql` to allow only `insert` (and, for guestbook, public `select` for the wall of
  messages). The `photos` and `rsvps` tables have **no anon select policy** — guests can add photos/RSVPs
  but can't list them.
- **Privileged reads** (admin dashboard data, photo gallery) go through Next.js API routes
  (`src/app/api/admin/*`, `src/app/api/photos`) that use `supabaseAdmin()`
  (`src/lib/supabase/server.ts`, service-role key, bypasses RLS). This is the only place allowed to
  read `rsvps`/`photos`/`event_settings`.
- **Photo reveal gating**: `src/lib/reveal.ts` — `isRevealed()` is true once `Date.now()` passes
  `config.weddingEndAt` OR `event_settings.manual_reveal_override` is true. `/api/photos` enforces this
  server-side before returning any photo URLs, so the gate can't be bypassed from the browser even
  though the storage bucket itself is public.
- **Admin auth**: not Supabase Auth — a hand-rolled signed cookie. `src/lib/admin-session.ts` creates/
  verifies an HMAC-SHA256 token (Web Crypto `crypto.subtle`, so it works in both the Node API routes and
  the Edge `proxy`) with a 12h TTL. `src/proxy.ts` (Next's `middleware`→`proxy` convention) redirects
  unauthenticated requests to `/admin/dashboard/*` back to `/admin`; each `/api/admin/*` route also
  re-verifies the cookie itself (defense in depth, since the proxy matcher only covers page routes).

**Config resolution (two layers)**: `src/lib/config.ts` holds the in-code defaults; the
`event_config` table (edited from `/admin/dashboard`) is an override layer on top of it.
`src/lib/event-config.ts`'s `resolveEventConfig()` merges the two — every filled DB column wins,
blanks fall back to `config.ts` — and `src/lib/event-config.server.ts`'s `getEventConfig()` (wrapped
in React `cache()`, so one request hits the DB once) fetches the row and resolves it. `src/app/page.tsx`
(a Server Component) calls `getEventConfig()` once and passes the result down as a `config` prop to
each `*Section.tsx` component; each section also accepts `defaultResolvedConfig` as its prop default
so it renders sensibly when previewed without a prop. **Import `getEventConfig`/`resolveEventConfig`,
never the raw `eventConfig` from `config.ts`, in anything that renders content** — reading the raw
file bypasses admin edits. Theme colors are threaded as CSS custom properties set inline on `<html>`
in `layout.tsx` from the resolved theme, then consumed via `var(--color-primary)` etc. in
`globals.css` and component classes (Tailwind arbitrary values like `text-[color:var(--color-primary)]`).

**Shared visual primitives**: `TiltCard` (pointer-driven 3D tilt + glow, desktop only) and `ScrollFade`
(fade/slide on scroll-into-view) wrap most cards/sections — reuse these for any new section rather than
hand-rolling animation.

**Client vs. server split for randomized/animated background**: `FloatingBackground` seeds its sparkle
positions with `Math.random()` inside `useEffect`, not during render — doing it during render would
make server-rendered HTML diverge from the first client render and trigger a hydration mismatch.
