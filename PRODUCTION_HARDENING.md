# LikeAir production hardening

This version includes a new Supabase migration named `20260823000000_harden_likeair.sql`.

It hardens trust-sensitive fields, moves posting-limit enforcement into database triggers, makes subscription state read-only to clients, normalizes interaction events, moves user-interest aggregation into a database trigger, protects ad view ownership, secures boost requests behind RPCs, adds lifecycle checks, and adds server-side paginated search helpers.

## Before deployment

1. Apply all Supabase migrations in order.
2. Confirm your production project has the expected publishable key and server-side credentials.
3. Keep `.env` local/private; use `.env.example` as the variable checklist.
4. Run `npm ci`, then `npm run typecheck`, `npm run lint`, and `npm run build`.
5. Review any existing staff/admin roles before enabling moderation features.

The browser is still treated as untrusted. UI checks are convenience checks; the database policies, triggers, and RPCs are the actual enforcement layer.

## Final release-candidate pass

- Added recent-search suggestions from the local interest history.
- Added a compact location-personalization prompt when no campus/region is selected.
- Added visible retry states for marketplace/gig feed failures.
- Improved seller trust presentation in item details.
- Added database validation triggers for polymorphic likes, saves, and interaction targets.
- Added explicit item-type constraints for engagement tables.
- Added private gig-interest records with applicant/owner access boundaries.
- Added Realtime counter updates plus database view deduplication and burst limits.
- Added authenticated content reports with staff-only review status updates.
- Added staff verification and account-ban controls with automatic active-content suspension.
- Added staff campus directory management and user-suggestion approval.

The source tree passes a TypeScript parser syntax sweep. A full dependency-backed `npm run typecheck` / `npm run build` still requires successful dependency installation in a normal CI or local environment; this environment timed out during `npm ci`.
