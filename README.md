# BundleStack

Shopify app for **quantity breaks and bundle discounts** — the Kaching playbook ($4M+ ARR path): launch free, monetize on usage, grow via App Store reviews.

## What's included (MVP)

- **Admin dashboard** — active offers, revenue generated, billing tier
- **Offer CRUD** — create quantity breaks (Buy 2 save 10%, Buy 3 save 15%, etc.)
- **Theme widget** — product page block that displays tiers and sets quantity on click
- **App proxy API** — `/apps/bundlestack/offers?product_id=...` for storefront
- **Usage-based billing** — performance pricing that scales with app-generated revenue (Shopify Billing API wiring in v2)

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
SCOPES=read_products,write_products,write_discounts,read_discounts
SHOPIFY_APP_URL=
DATABASE_URL=file:./prisma/dev.sqlite
```

Copy from `.env.example`. Shopify CLI generates most values when you link the app.

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

## Pricing (performance-based)

Tiers upgrade automatically when app-generated revenue crosses each threshold. You only pay more when BundleStack earns more for your store.

| Plan | Price | When it applies | Revenue ceiling |
|------|-------|-----------------|-----------------|
| **Free** | $0/mo | Launch & first sales | Up to $500 app revenue / mo |
| **Starter** | $7.99/mo | After $500 app revenue | Up to $2,000 app revenue / mo |
| **Growth** | $14.99/mo | After $2,000 app revenue | Up to $5,000 app revenue / mo |
| **Pro** | $29.99/mo | After $5,000 app revenue | Unlimited app revenue |

Compared to leading bundle apps: Growth at $14.99 covers up to $5k revenue (Kaching charges $29.99 for the same band). Pro unlimited at $29.99 undercuts Appstle's $39.99 unlimited tier.

Billing is calculated from revenue attributed to BundleStack offers. Shopify bills on a 30-day cycle. Uninstalling removes all app discounts and offer data automatically.

> **Note:** Tier logic is implemented in `app/billing.plans.ts`. Shopify Billing API charge creation is planned for v2.

## Growth plan

1. **Week 1–2** — Ship MVP, install on 3 dev stores, fix UX
2. **Week 3–4** — Launch free on App Store, collect first 10 reviews
3. **Month 2** — Add post-purchase upsell (second app in portfolio)
4. **Month 3+** — App Store SEO for "quantity breaks", "bundle discounts", vertical templates

## Shopify App Store

To publish on the App Store, see **[docs/APP_STORE.md](docs/APP_STORE.md)** for the full checklist:

1. Deploy to production (Fly.io `fly.toml` + `Dockerfile` included)
2. Set `SHOPIFY_APP_URL` and `DATABASE_URL` in production env
3. Run `npm run deploy` to push config, webhooks, and theme extension
4. Complete listing in Partners Dashboard (copy in `docs/app-store-listing.md`)
5. Submit for review on the App Store review page

Compliance webhooks and a public privacy policy (`/privacy`) are implemented. Wire the Shopify Billing API before enabling paid charges.

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
  billing.plans.ts          # Pricing tiers & thresholds
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
