# BundleStack

Shopify app for **quantity breaks and bundle discounts** — the Kaching playbook ($4M+ ARR path): launch free, monetize on usage, grow via App Store reviews.

## What's included (MVP)

- **Admin dashboard** — active offers, discount redemptions, billing tier
- **Offer CRUD** — create quantity breaks (Buy 2 save 10%, Buy 3 save 15%, etc.)
- **Theme widget** — product page block that displays tiers and sets quantity on click
- **App proxy API** — `/apps/bundlestack/offers?product_id=...` for storefront
- **Shopify Billing** — free tier plus paid plans merchants approve in the Billing page

## Prerequisites

1. **Shopify Partners account** — [partners.shopify.com/signup](https://partners.shopify.com/signup)
2. Node.js 20+
3. A **development store** linked to your Partner org

> Your current Shopify login needs a Partners organization before `shopify app dev` will work.

## Setup

```bash
cd ~/Projects/bundlestack
npm install
docker compose up -d   # local Postgres
cp .env.example .env   # then fill Shopify credentials
npx prisma migrate deploy
```

Create a `.env` file (Shopify CLI generates most values when you link the app):

```env
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_products,write_discounts,read_discounts
SHOPIFY_APP_URL=
DATABASE_URL=postgresql://bundlestack:bundlestack@localhost:5432/bundlestack
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
4. **Track** — Dashboard shows discount redemptions per offer

## Pricing

Free to install. Merchants choose a paid plan on the in-app **Billing** page when they are ready — Shopify approves the charge. Plans do not upgrade automatically.

| Plan | Price | Best for |
|------|-------|----------|
| **Free** | $0/mo | Getting started |
| **Starter** | $7.99/mo | Steady bundle sales |
| **Growth** | $14.99/mo | Growing bundle volume |
| **Pro** | $29.99/mo | High-volume stores |

Compared to leading bundle apps: Growth at $14.99 undercuts Kaching's $29.99 band for similar stores. Pro unlimited at $29.99 undercuts Appstle's $39.99 unlimited tier.

Shopify bills approved plans on a 30-day cycle. Uninstalling removes app discounts and offer data automatically.

> Tier definitions live in `app/billing.plans.ts`. Charge creation uses the Shopify Billing API (with Managed Pricing fallback) in `app/billing.shopify.ts`.

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

Compliance webhooks and a public privacy policy (`/privacy`) are implemented. Paid plans use Shopify Billing (see Billing page in the app).

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
