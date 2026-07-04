# BundleStack

Shopify app for **quantity breaks and bundle discounts** — the Kaching playbook ($4M+ ARR path): launch free, monetize on usage, grow via App Store reviews.

## What's included (MVP)

- **Admin dashboard** — active offers, revenue generated, billing tier
- **Offer CRUD** — create quantity breaks (Buy 2 save 10%, Buy 3 save 15%, etc.)
- **Theme widget** — product page block that displays tiers and sets quantity on click
- **App proxy API** — `/apps/bundlestack/offers?product_id=...` for storefront
- **Usage-based billing stub** — free → $14.99 → $29.99 → $59.99 tiers (wire Billing API in v2)

## Prerequisites

1. **Shopify Partners account** — [partners.shopify.com/signup](https://partners.shopify.com/signup)
2. Node.js 20+
3. A **development store** linked to your Partner org

> Your current Shopify login needs a Partners organization before `shopify app dev` will work.

## Setup

```bash
cd ~/Projects/bundlestack
npm install
npx prisma migrate dev --name init
```

Create a `.env` file (Shopify CLI generates this when you link the app):

```env
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_products,write_products,read_orders
SHOPIFY_APP_URL=
```

Link and run:

```bash
npm run dev
# or: shopify app dev
```

Press `p` to open the app in your dev store admin.

## Merchant workflow

1. **Create offer** — Admin → Create offer → add product GIDs + quantity tiers
2. **Activate** — set status to Active
3. **Theme** — Online Store → Customize → Product page → Add block → **BundleStack offers**
4. **Track** — Dashboard shows revenue generated per offer

## Pricing strategy (Kaching playbook)

| Plan | Price | Trigger |
|------|-------|---------|
| Free | $0 | Launch — get installs & reviews |
| Starter | $14.99/mo | Merchant generates revenue via app |
| Scale | $29.99/mo | $1K+ revenue generated |
| Pro | $59.99/mo | $5K+ revenue generated |

Launch free. Grandfather early users. Monetize new installs once you rank for keywords.

## Growth plan

1. **Week 1–2** — Ship MVP, install on 3 dev stores, fix UX
2. **Week 3–4** — Launch free on App Store, collect first 10 reviews
3. **Month 2** — Add post-purchase upsell (second app in portfolio)
4. **Month 3+** — App Store SEO for "quantity breaks", "bundle discounts", vertical templates

## Project structure

```
app/
  routes/
    app._index.tsx          # Dashboard
    app.offers._index.tsx   # Offer list
    app.offers.new.tsx      # Create offer
    app.offers.$id.tsx      # Edit offer
    app-proxy.offers.tsx    # Storefront API
  models/bundle.server.ts   # Offer CRUD
  billing.server.ts         # Usage tier logic
extensions/
  bundlestack-widget/       # Theme app extension
prisma/schema.prisma        # BundleOffer + ShopSettings
```

## Next features (v2)

- [ ] Shopify resource picker for products (replace GID paste)
- [ ] Automatic discount codes via Shopify Functions
- [ ] Shopify Billing API integration
- [ ] Post-purchase upsell extension
- [ ] Vertical templates (supplements, coffee, skincare)

## License

MIT
