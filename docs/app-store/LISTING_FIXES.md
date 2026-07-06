# App Store listing — fix automated issues

## 1. Name mismatch

**Problem:** Listing name is `Simple Bundle` but app config name is `BundleStack`.

**Fix in Partners → Edit listing → Basic app information:**

| Field | Must be |
|-------|---------|
| App name | **BundleStack** |

The listing name and Dev Dashboard app name must match so merchants recognize the app.

---

## 2. App details — no bullet lists

**Problem:** Bulleted lists in App details do not render well on the App Store.

**Replace the entire App details field with this (paragraphs only):**

```
BundleStack helps merchants grow order value with quantity-break offers that are fast to set up and easy for shoppers to understand.

Merchants get unlimited tiered offers with a clean dashboard, a product picker with no manual ID copying, automatic Shopify discount sync when offers go active, a theme widget for product pages, a store health monitor with one-click fixes, and a clean uninstall that removes discounts and data.

Create an offer, select products, define quantity tiers, set the offer to Active, and add the BundleStack block in the theme editor. Discounts apply automatically at checkout.

Built for consumables, supplements, coffee, skincare, apparel, and any catalog where buying more should save more.

Free to install. Paid tiers scale with app-generated revenue and are billed through Shopify on a 30-day cycle.
```

---

## 3. Screenshots — no ratings or testimonials

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
2. Return to **App Store review** → re-run automated checks
3. Submit when all green
