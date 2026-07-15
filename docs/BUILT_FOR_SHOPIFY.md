# Built for Shopify

Track BundleStack against [Built for Shopify requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements).

## Status map

| Area | Status | Notes |
|------|--------|-------|
| Embedded admin + session tokens | Pass (code) | App Bridge in `app/root.tsx` `<head>` + `AppProvider` |
| Theme app extension / clean uninstall | Pass (code) | `extensions/bundlestack-widget`; uninstall removes discounts + DB |
| GraphQL Admin API (no REST) | Pass (code) | Admin GraphQL only |
| Discount Functions / APIs (5.5.1) | Pass (code) | `extensions/bundlestack-qb-discount` + `discountAutomaticAppCreate` |
| No draft-order discounts (5.5.2) | Pass (code) | No `draftOrder*` usage |
| Single redeem code / bulk add (5.5.3) | Pass (N/A) | Automatic Function discounts only (no redeem codes) |
| Create-discount deep link (5.5.4) | Pass (code) | `bundlestack-discount-link` → `/app/offers/new` |
| Least-privilege scopes | Pass (code) | `read_products,read_discounts,write_discounts` |
| Current API version | Pass (code) | `2026-07` / `ApiVersion.July26` |
| Contextual Save Bar | Pass (code) | Offer create/edit forms use `data-save-bar` |
| Admin deep links (`_top` / `shopify://`) | Pass (code) | Theme editor CTAs |
| Setup guide (dismissible) | Pass (code) | Dashboard checklist |
| `app_subscriptions/update` webhook | Pass (code) | Syncs local billing plan |
| Storefront performance | Pass (code hygiene) | Theme app block; schema CDN assets; product-only; deferred fetch |
| Admin Web Vitals (LCP/CLS/INP) | Partner / traffic | Needs ≥100 samples / 28 days |
| ≥50 net paid installs | Partner | Distribution checklist |
| ≥5 reviews + rating floor | Partner | Ask after first successful checkout discount |
| Apply for BFS | Partner | Only after automated criteria are green |

## Discounts category (Partner Distribution)

| Criterion | Evidence |
|-----------|----------|
| Uses discount APIs | Shopify Function `bundlestack-qb-discount` + Admin mutations `discountAutomaticAppCreate` / `Update` / `Delete` in `app/models/discount.server.ts` |
| Doesn't create draft orders | No draft-order APIs anywhere in `app/` |
| Single redeem code per discount | Quantity breaks are automatic (no codes). If code discounts are added later, use one code per node or `discountRedeemCodeBulkAdd` |
| Links to create flow | Admin link target `admin.discount-index.action.link` → `/app/offers/new` (`Create quantity break discount`) |

### After deploy (required for Partner checkboxes)

1. `npm run deploy` so the Function + admin link ship to Shopify.
2. In the admin app, create/activate an offer so Shopify records Discount Function usage.
3. From **Discounts** → Create → BundleStack link, confirm `/app/offers/new` opens.
4. Wait for daily Partner Distribution refresh (~17:00 UTC).

## Deploy after this change set

1. Deploy app + extensions: `npm run deploy`.
2. Re-open the app so merchants pick up the Function.
3. Sync or recreate active offers so they migrate from Automatic Basic nodes to one App Function discount each.
4. Confirm Partners → Distribution category-specific criteria updates over the next day.

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

Follow Shopify’s [storefront performance testing procedure](https://shopify.dev/docs/apps/build/performance/storefront): weighted average of **Home 17% / Product 40% / Collection 43%**.

### Checklist

1. Start from a clean Horizon (or other supported) theme install — no other apps.
2. Build password-bypass share links for home, product, and collection (theme preview `key` + paths).
3. Record mobile PageSpeed Insights baselines for all three pages; compute the weighted average.
4. Install BundleStack, add the **BundleStack offers** block on the product template, and configure a typical quantity-break offer on the test product.
5. Re-run the three URLs; compute ending weighted average. Ending − starting should stay within about **−10 points** (prefer near zero on home/collection).
6. Average a few consecutive runs — Lighthouse scores vary between runs.

### Code evidence

- Theme app extension only ([`extensions/bundlestack-widget`](../extensions/bundlestack-widget)); no Asset API / theme code edits.
- Assets via schema `javascript` / `stylesheet` (Shopify CDN, deduped) — not remote hosts.
- Block limited to `"templates": ["product"]` so home/collection do not load widget assets.
- Offer fetch deferred until the product section is near the viewport (`IntersectionObserver` + idle callback).
- ATC/checkout guards install only after an offer with tiers is rendered; zero-space pending/hidden (`display: none`) when there is nothing to show.
- App proxy cache: `max-age=300, stale-while-revalidate=600`.
