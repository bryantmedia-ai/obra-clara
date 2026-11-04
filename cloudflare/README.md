# Shared backend migration

Compras and Ventas remain on their existing Vercel URLs. Only `/api/demo`
moves to a free Cloudflare Worker backed by D1. No R2, paid plan, or billing
subscription is required by this configuration.

## Current migration gate

The owner chose to retain the existing workspace and wait for recovery.
The source Vercel Blob store still reports `limits-exceeded-suspended`.
Do not change the production API environment variable until the persisted
workspace JSON has been recovered, imported and verified. Do not seed a
replacement workspace. The Worker returns `MIGRATION_REQUIRED` for missing
workspaces unless a caller explicitly identifies a genuinely new workspace.

## Prepare and deploy

Use the official Wrangler CLI with the Cloudflare account
`aed96cd9606d309a45ffde168716a445` (mktbyjazmin@gmail.com).
Verify the account remains on Workers Free before creating resources.

1. Authenticate with `wrangler login --scopes account:read user:read workers:write d1:write`.
2. Run `wrangler d1 create obra-clara-shared` and insert the returned database ID
   into `wrangler.jsonc`.
3. Run `wrangler d1 execute obra-clara-shared --remote --config cloudflare/wrangler.jsonc --file cloudflare/schema.sql`.
4. Recover original persisted private Blob objects into `cloudflare/private/export/`.
   Preserve the SHA-256 basename. **Do not import the public API snapshot**:
   it removes command history and subtracts stock reservations.
5. Run `node scripts/prepare-cloudflare-import.mjs cloudflare/private/export cloudflare/private/import.sql`.
6. Import using `wrangler d1 execute obra-clara-shared --remote --config cloudflare/wrangler.jsonc --file cloudflare/private/import.sql`.
7. Deploy with `wrangler deploy --config cloudflare/wrangler.jsonc`.
8. Test the deployed health endpoint, authenticated reads, invalid requests,
   workspace isolation, duplicate commands, simultaneous writes and quota CPU metrics.
9. Set `NEXT_PUBLIC_OC_SHARED_API` to the verified Worker `/api/demo` URL in both
   existing Vercel projects and redeploy their tested source commit. Keep role
   variables and domains unchanged. Verify the same workspace across both apps.

## Safety and limits

- Bearer tokens retain the same SHA-256 workspace key as Vercel Blob.
- D1 compare-and-swap updates retry on concurrent revisions. Command IDs retain
  existing idempotency and all business validation remains in `lib/demo-model.ts`.
- The current model is stored as one JSON row per workspace, capped at 1.8 MB
  below D1's 2 MB row limit. Larger future workspaces require a normalized model.
- Worker HTTP bodies are capped while streaming, not solely by Content-Length.
- The CORS allowlist contains the same three production app origins.
- Existing Vercel data is never deleted by these scripts. Imports use
  `INSERT OR IGNORE` to protect any existing destination state.
- No Cloudflare credentials or workspace exports belong in GitHub.

## Local checks

`node scripts/check-cloudflare-backend.mjs` tests the handler against real SQLite.
`wrangler deploy --config cloudflare/wrangler.jsonc --dry-run` verifies bundling.
Use `wrangler dev` with a locally initialized D1 database for runtime checks.
These checks do not substitute for production/browser verification.
