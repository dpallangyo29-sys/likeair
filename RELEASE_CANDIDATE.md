# LikeAir Production Release Candidate

## Included

- Pagination and server-side search paths cleaned up.
- Database hardening for system-managed fields and posting limits.
- Safer interaction, like, save, boost, and subscription boundaries.
- Saved content UI and recent-search suggestions.
- Location personalization prompt.
- Feed loading, empty, and retry error states.
- Trust presentation for verified sellers.
- Generated artifacts and local environment files removed from the release ZIP.

## Deployment gate

1. Set production environment variables using `.env.example`.
2. Apply every migration in `supabase/migrations/` in filename order.
3. Run `npm ci --no-audit --no-fund`.
4. Run `npm run typecheck`.
5. Run `npm run lint`.
6. Run `npm run build`.
7. Smoke-test sign-in, browsing, search, saving, posting, editing, WhatsApp contact, and admin moderation against the production Supabase project.

## Verification performed for this package

- All 99 TypeScript/TSX source files parsed successfully with TypeScript 5.8.3.
- No `dist`, `.tanstack`, `node_modules`, or local `.env` is included in the release.
- `npm ci` could not complete within the available execution window here, so the dependency-backed typecheck/build commands remain a required deployment gate rather than an unverified claim.
