# LikeAir Cleaned v2

This release is the product-polish pass after the security/architecture cleanup.

## Included

- Correct paginated feed querying and server-filtered search.
- Database-level protection for system-managed fields and posting limits.
- Secure boost request RPCs and protected subscription state.
- Deterministic feed ranking and safer interaction handling.
- Save/Bookmark support for products and gigs.
- Saved items section in the authenticated profile.
- Trust Snapshot in the profile for verification/profile completeness.
- Cleaner Gig card rendering and more useful card actions.
- Lifecycle constraints for products, gigs and ads.
- Performance indexes for saves and active feed retrieval.
- Removed generated build/local environment artifacts from the package.

## Verification

- TypeScript/TSX syntax parsing: 99 files, 0 syntax errors.
- Full dependency install/typecheck/build were not completed in this environment because project dependency installation was unavailable/timed out. Run `npm ci`, then `npm run typecheck` and `npm run build` locally or in CI before deployment.
