# Built for Shopify

Track BundleStack against [Built for Shopify requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements).

## Status map

| Area | Status | Notes |
|------|--------|-------|
| Embedded admin + session tokens | Pass (code) | `embedded = true`, App Bridge via `AppProvider` |
| Theme app extension / clean uninstall | Pass (code) | `extensions/bundlestack-widget`; uninstall webhook removes discounts + DB |
| GraphQL Admin API (no REST) | Pass (code) | Automatic Basic discounts |
| Discount primitives (5.5.1) | Pass (code) | Native discount APIs |
| Create-discount deep link (5.5.4) | Pass (code) | `bundlestack-discount-link` → `/app/offers/new` |
| Least-privilege scopes | Pass (code) | `read_products,read_discounts,write_discounts` (no `write_products`) |
| Current API version | Pass (code) | `2026-07` / `ApiVersion.July26` |
| Contextual Save Bar | Pass (code) | Offer create/edit forms use `data-save-bar` |
| Admin deep links (`_top` / `shopify://`) | Pass (code) | Theme editor CTAs |
| Setup guide (dismissible) | Pass (code) | Dashboard checklist |
| `app_subscriptions/update` webhook | Pass (code) | Syncs local billing plan |
| Storefront performance | Pass (code hygiene) | Deferred theme widget JS; no Asset API |
| Admin Web Vitals (LCP/CLS/INP) | Partner / traffic | Needs ≥100 samples / 28 days |
| ≥50 net paid installs | Partner | Distribution checklist |
| ≥5 reviews + rating floor | Partner | Ask after first successful checkout discount |
| Apply for BFS | Partner | Only after automated criteria are green |

## Deploy after this change set

1. Update Render (or host) `SCOPES` env to match toml (drop `write_products`).
2. Deploy app config so webhooks + scopes update: `npm run deploy` (or Partners sync).
3. Re-open the app so merchants re-approve scopes if prompted.
4. Confirm Partners → Distribution checklist updates over the next few days.

## Apply for Built for Shopify

1. Partners → **Apps** → BundleStack → **Distribution**.
2. Confirm every automated prerequisite is green.
3. Click **Apply now** under Built for Shopify (requires Manage apps permission).
4. Fix any manual review feedback promptly (three consecutive failures on the same criterion suspends re-apply for three months).

## How to verify admin Web Vitals

- Keep production always-on (avoid free-tier cold starts).
- Use real merchant sessions in the embedded app for ≥28 days.
- Partners Distribution shows LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms at p75 once sample volume is met.

## Storefront Lighthouse

Compare a product page with and without the BundleStack block enabled. Score drop must stay within **10 points**.
