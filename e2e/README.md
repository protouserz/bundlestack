# Browser e2e screencasts

Walks Promotions / Coupons / Billing UI and records a video.

## Run Playwright (admin, local bypass)

```bash
npx playwright install chromium
npm run test:e2e
npm run test:e2e:report
```

Specs:

- `e2e/promotions.spec.ts` — hub / form visibility
- `e2e/promotions-create.spec.ts` — create + save each promotion type
- `e2e/bogo-checkout.spec.ts` — BOGO same/different-product deep path (`npm run test:e2e:bogo`)

Each run writes artifacts to a timestamped folder:

```text
test-results/screencasts/YYYYMMDD-HHMMSS/
  ├── videos/<test-name>/video.webm
  └── report/
```

## Storefront / checkout (real:dev store)

Requires a deployed Function + theme block on the store, and the Online Store password.

```bash
cp .env.e2e.example .env.e2e
# Edit .env.e2e:
#   E2E_STORE_URL=https://bundlestack-dev.myshopify.com
#   E2E_STOREFRONT_PASSWORD=<Online Store → Preferences password>
#   E2E_PRODUCT_HANDLE=<product handle with BundleStack block>

npm run test:e2e:storefront
npm run test:e2e:bogo
```

`e2e/run.mjs` loads `.env.e2e` then `.env` automatically.

Without `E2E_STORE_URL`, storefront/live checkout tests **skip** (admin create/save still run).
If `E2E_STORE_URL` is set but the store is password-protected and `E2E_STOREFRONT_PASSWORD` is missing/wrong, tests **fail with a clear error** instead of timing out on the password wall.

Deploy Function + theme before storefront assertions:

```bash
npm run deploy
```

## Auth bypass

Local admin runs set `E2E_AUTH_BYPASS=1` so the app skips Shopify OAuth/App Bridge.
**Never set this on Render or any production host.**
