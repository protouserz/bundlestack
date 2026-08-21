# App Store listing — overwrite live copy

The public listing at https://apps.shopify.com/bundlestack still has truncated and broken copy. Paste the fields below into **Partners → Apps → BundleStack → Distribution → App Store listing**, then **Save**.

Canonical copy lives in [`docs/app-store-listing.md`](../app-store-listing.md).

## Fields to replace now

| Field | Live today (wrong) | Paste this |
|-------|--------------------|------------|
| App name | BundleStack | **BundleStack** (keep — must match `shopify.app.toml`) |
| Tagline | Tiered quantity-break offers with a product-page widget includ | **Quantity breaks & volume discounts that boost AOV** |
| App introduction (max 100) | Cut off or over limit | See 100-character intro below |
| App details (max 500) | Cut off mid-sentence | See 500-character details below |
| Search keywords | (check Partners) | `quantity breaks, volume discount, volume discounts, bundle discounts, buy more save more, tiered pricing, AOV, upsell, bulk discount, quantity break` |

Do **not** rename the app to include “Quantity Breaks” unless you also change `name` in `shopify.app.toml` and deploy — Shopify fails a name-mismatch check otherwise.

---

## Limits (easy to miss)

| Field | Max |
|-------|-----|
| App introduction | **100** characters |
| App details | **500** characters |
| Tagline | Not on this page — **Basic app information** (or App discovery) |

Do not paste the long docs draft into App details. It will hit 500/500 and cut off mid-word.

**App introduction (100 chars):**
```
Quantity breaks and volume discounts that grow order value. Buy 2 save 10%, Buy 3 save 15%, and more
```

**App details (under 500 chars):**
```
Quantity breaks and volume discounts that grow order value. Shoppers see Buy 2 save 10% or Buy 3 save 15% on the product page, then the discount applies at checkout.

Create an offer, pick products, set quantity tiers, and activate. BundleStack syncs Shopify discounts automatically, includes a product-page widget, a product picker with no manual IDs, store health checks, and a clean uninstall. Unlimited offers. Free to install.
```

---

## Screenshots — no ratings or testimonials

**Problem:** Screenshots must not show star ratings, review scores, or testimonial-style content.

**Fix:** Re-upload screenshots from:

`docs/app-store/screenshots/screenshot-01-dashboard-v2.png`
`docs/app-store/screenshots/screenshot-02-create-offer-v2.png`
`docs/app-store/screenshots/screenshot-03-storefront-v2.png`

**Better:** Capture real screenshots from `bundlestack-dev` admin (Cmd+Shift+4) with NO review/rating UI visible.

**Do not include:** star icons, "4.9", customer quotes, testimonial banners.

---

## After fixes

1. **Save** listing
2. Hard-refresh https://apps.shopify.com/bundlestack and confirm the tagline is not truncated and “order value” is gone
3. Search the App Store for **quantity breaks** after 24–48 hours (index lag is normal)
