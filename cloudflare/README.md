# Shared backend migration

Compras and Ventas remain on their existing Vercel URLs. Only `/api/demo`
moves to a free Cloudflare Worker backed by D1. No R2, paid plan, or billing
subscription is required by this configuration.

## Active mockup storage

On November 6, 2026, the owner approved continuing with fresh sample data
because the previous workspace contents were test-only. The frontend now
uses a separate `obra-clara-workspace-cloudflare-v2` browser session key.
New sessions explicitly create a D1 workspace and initialize the existing
sample prices, ten purchases and project budgets. Switching Compras/Ventas
passes the same workspace token to the other app.

The old Vercel Blob objects and old browser session key are preserved.
Original content remains blocked by Vercel's quota; it is not required for
this approved fresh demo. No support request has been sent.

## Deployed backend

The Worker is live at `https://obra-clara-api.obra-clara.workers.dev`.
Version: `771f4a9a-6c3b-4f31-a48d-672091b7742a`.
Thirteen live API checks passed using an isolated QA workspace; see
`research/cloudflare-migration/live-backend-checks.json`.
Both production app API variables point to this Worker. The legacy Vercel
`/api/demo` route now proxies to Cloudflare and makes no Blob calls.

## Prepare and deploy

Use the official Wrangler CLI with the Cloudflare account
`aed96cd9606d309a45ffde168716a445` (mktbyjazmin@gmail.com).
Verify the account remains on Workers Free before creating resources.

1. Authenticate with `wrangler login --scopes account:read user:read workers_scripts:write d1:write`.
2. The D1 database `obra-clara-shared` is already created and configured.
   Do not create a duplicate. Its ID is `400c95a3-1507-4697-97ca-220449dfe125`.
3. Run `wrangler d1 execute obra-clara-shared --remote --config cloudflare/wrangler.jsonc --file cloudflare/schema.sql`.
4. Recover original persisted private Blob objects into `cloudflare/private/export/`.
   Preserve the SHA-256 basename. **Do not import the public API snapshot**:
   it removes command history and subtracts stock reservations.
5. Run `node scripts/prepare-cloudflare-import.mjs cloudflare/private/export cloudflare/private/import.sql`.
6. Import using `wrangler d1 execute obra-clara-shared --remote --config cloudflare/wrangler.jsonc --file cloudflare/private/import.sql`.
7. Deploy with `wrangler deploy --config cloudflare/wrangler.jsonc`.
8. Test the deployed health endpoint, authenticated reads, invalid requests,
   workspace isolation, duplicate commands, simultaneous writes and quota CPU metrics.
9. For fresh demo deployment, set `NEXT_PUBLIC_OC_SHARED_API` to the verified Worker `/api/demo` URL in both
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

`node scripts/check-cloudflare-live.mjs` exercises the deployed Worker with
a separate QA token saved only under the ignored private directory.

## Order-chat attachments

`order_files` stores private metadata and `order_file_chunks` stores binary parts separately from workspace JSON. Files accept up to 20 MiB each, six per message. Uploads and reads use authenticated `/api/order-files` endpoints with 512 KiB parts; this keeps video transfers bounded per Worker request. A file becomes readable by the other app only after upload completion and association with a persisted message on the same order. Published files cannot be overwritten. The client fetches authenticated parts and creates a temporary browser URL for playback or download; no file is made public.

The existing free D1 database is used without adding a paid service. Metadata reserves at most 100 MiB per workspace and 350 MiB across attachment storage, leaving room for operational records. Interrupted, unsent uploads remain private and are not silently removed. Run `scripts/check-order-chat.mjs` and `scripts/check-cloudflare-backend.mjs` for message validation, byte-for-byte round trips, incomplete uploads, supplier/order validation and workspace isolation.

## Material-only MVP scope (November 6)

New freight marketplace commands and cart freight services are rejected. Material checkout and quote acceptance use arranged delivery and do not depend on booking a transport. Historical records remain stored. Material receipts and payment controls remain active.

Checkout delivery preferences are persisted per project as an immutable order snapshot. The preferred date does not set a financial refund deadline. Demo shipping initialization updates seed offers once; subsequent supplier edits remain intact.
