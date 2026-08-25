# LikeAir cleaned build

## What changed

- Removed generated `dist/`, `.tanstack/`, and Supabase local temp state from the source package.
- Removed the local `.env`; added `.env.example` instead.
- Renamed the old prototype admin route/file to `/admin`.
- Fixed normal feed pagination so page offsets are applied at the Supabase query.
- Replaced the old 100-row client-search path with server-side paginated search RPCs.
- Made personalization deterministic instead of adding random ranking jitter.
- Prevented repeated feed re-renders from inflating view counts.
- Removed the broken/dead posting-limit helper and obsolete client fuzzy-search implementation.
- Moved interest aggregation into a secure database trigger.
- Hardened profile verification/trust fields and system-managed listing counters/flags.
- Enforced posting limits in the database, not only in browser checks.
- Made subscriptions read-only to normal clients.
- Secured boost creation behind trusted RPCs.
- Added explicit staff moderation access for the admin console.
- Added lifecycle constraints for product, gig, and ad statuses.
- Cleaned project/package naming and added a `typecheck` script.

## Verification

A static TypeScript syntax pass completed successfully for all 99 TypeScript/TSX source files. A full dependency install/build could not be completed in the working environment because `npm ci --ignore-scripts --no-audit --no-fund` timed out, so the ZIP should still be run through `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build` on a normal networked development machine before production deployment.

## v2 product polish

- Added first-class Save/Bookmark interactions for products and gigs.
- Added a Saved tab to the authenticated profile.
- Added a Trust Snapshot to the profile showing verification, campus, phone, and storefront completeness.
- Rebuilt the GigCard markup so its image is rendered inside the card before hooks/render logic.
- Added scalable indexes/check constraints for saves and active feed retrieval.
- Added deterministic saved-state syncing between feed cards and the authenticated account.

The v2 pass intentionally avoids adding a large social graph, crypto, or unnecessary AI UI; the focus is a pleasant, trustworthy marketplace/opportunity experience.
