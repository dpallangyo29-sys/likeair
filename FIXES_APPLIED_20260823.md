# Fixes applied — 23 Aug 2026

Verified by actually running `npm install`, `npm run typecheck`, `npm run build`,
and `npm run lint` — not just read through. All four now pass clean.

## Real bugs fixed

1. **Profile page crash** (`src/routes/_authenticated/profile.tsx`) — the
   "Saved" tab and the Trust Snapshot section referenced `<SavedPanel />` and
   `<TrustItem />`, neither of which existed anywhere in the file or its
   imports. This built fine (Vite/esbuild doesn't catch undefined JSX
   identifiers) but threw a `ReferenceError` at runtime the moment the Trust
   Snapshot rendered — i.e. every time a signed-in user opened their profile.
   Implemented both: `SavedPanel` lists saved products/gigs (via the existing
   `saves` table + `toggleItemSave` helper) with a WhatsApp contact button and
   an unsave action; `TrustItem` renders the identity/campus/phone/storefront
   chips.

2. **Save button silently broken on product cards** (`ProductCard.tsx`) —
   `onSave` and `isSaved` were declared in the prop *type* but never
   destructured from props, so clicking the bookmark icon on any product
   (not gigs — `GigCard.tsx` was correct) called `undefined` and did nothing.
   Fixed the destructuring.

3. **Hook-order violation** (`edit.$kind.$id.tsx`) — the "unknown post type"
   early return happened *before* `useQuery`/`useState`/`useEffect` were
   called, which violates React's rules of hooks and can throw "Rendered
   fewer hooks than expected" when navigating between valid/invalid routes.
   Moved the guard after all hooks and gated the query with `enabled`.

## Build/tooling fixes

4. `package-lock.json` was out of sync with `package.json` (`npm ci` failed
   outright with a missing `lru-cache` entry). Regenerated via `npm install`.

5. `src/integrations/supabase/types.ts` (the generated Supabase client types)
   was stale — six tables that already exist per your migrations (`likes`,
   `ads_views`, `user_subscriptions`, `onboarding_queue`, `product_boosts`,
   `gig_boosts`) and several columns (`products.boost_count`/`promoted_until`,
   same on `gigs`) were missing. Hand-reconstructed from the actual migration
   SQL. This was causing the bulk of ~60 typecheck errors in `feed.ts`.
   **You should still run `supabase gen types typescript` against your real
   project and diff it against this file** the next time you touch the schema
   — this manual reconstruction is a stopgap, not a replacement for the real
   generator.

6. Fixed the resulting type errors from #5 in `feed.ts` and `engagement.ts`
   where a single Supabase query was built against a *dynamic* table name
   (`product_boosts` vs `gig_boosts`) — split into explicit branches, since
   the two tables have different id columns and can't share one query type.

7. `engagement.ts` had `.catch()` chained directly on a Supabase query
   builder (not a real `Promise` there) — replaced with a proper
   `.then(({ error }) => ...)`.

8. `virtualization.ts` used `React.useState`/`React.useEffect` without
   importing React — added `import * as React from "react"`.

9. `performance.ts` read `entry.processingStart` off a generic
   `PerformanceEntry`, which doesn't have that field — cast to
   `PerformanceEventTiming`, the correct type for `first-input` entries.

10. Cleared ~2,500 Prettier formatting violations (`npm run format`) plus the
    remaining real ESLint errors: an unused/empty `catch` block, a couple of
    `any` types tightened to real types, and two unused-expression ternaries
    rewritten as `if`/`else`. What's left is 6 warnings, all inside the
    vendored shadcn/ui primitives (`badge.tsx`, `button.tsx`, etc.) — standard
    boilerplate warnings from that template, not from your code.

## Still outstanding (not fixed here — needs your call)

- `payments.ts` is fully scaffolded but every provider is `enabled: false`
  and `isPaymentSystemEnabled()` returns `false` — you'll need to wire in
  AzamPay/ClickPesa (or similar) before boosts/subscriptions can charge
  anyone.
- No rate limiting on anonymous `interactions` inserts.
- Main client bundle is ~560 kB minified — worth code-splitting the post flow
  and item detail drawer with dynamic `import()` at some point.
