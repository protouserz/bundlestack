# Shopify App Store — BundleStack launch checklist

This guide walks through publishing BundleStack on the Shopify App Store.

## Prerequisites

- [Shopify Partners](https://partners.shopify.com) account
- App created in Partners (client ID in `shopify.app.toml`)
- **Production hosting** with HTTPS (Fly.io, Railway, Render, etc.)
- **1200×1200** app icon (JPEG or PNG)
- **3–6 screenshots** of the admin UI (1600×900 recommended)
- **Demo screencast** (English or subtitled) showing install → create offer → theme widget
- **Privacy policy URL** (included at `/privacy` on your production domain)
- **Support email** that does not contain the word "Shopify"

## Step 1 — Deploy to production

BundleStack must be reachable at a stable HTTPS URL before submission.

### Option A: Fly.io (recommended, Dockerfile included)

**One-command deploy** (after `fly auth login`):

```bash
export SHOPIFY_API_KEY=your_key_from_partners
export SHOPIFY_API_SECRET=your_secret_from_partners
./scripts/deploy-fly.sh
```

Or step by step:

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
curl -L https://fly.io/install.sh | sh
fly auth login

fly apps create bundlestack --machines   # skip if app exists
fly volumes create bundlestack_data --size 1 -a bundlestack -y

fly secrets set \
  SHOPIFY_API_KEY=your_key \
  SHOPIFY_API_SECRET=your_secret \
  SCOPES=read_products,write_products,write_discounts,read_discounts \
  SHOPIFY_APP_URL=https://bundlestack.fly.dev \
  DATABASE_URL=file:/data/production.sqlite \
  -a bundlestack

fly deploy -a bundlestack
```

Your app will be at **https://bundlestack.fly.dev** (or your chosen app name).

### Option B: Railway / Render / VPS

1. Build: `npm run build`
2. Start: `npm run docker-start` (runs migrations + server)
3. Set env vars from `.env.example`
4. Mount persistent storage for SQLite at `DATABASE_URL`

## Step 2 — Update app URLs

Edit `shopify.app.toml` (or use Partners Dashboard → Configuration):

```toml
application_url = "https://YOUR-PRODUCTION-DOMAIN"

[auth]
redirect_urls = [
  "https://YOUR-PRODUCTION-DOMAIN/auth/callback",
  "https://YOUR-PRODUCTION-DOMAIN/auth/shopify/callback",
  "https://YOUR-PRODUCTION-DOMAIN/api/auth/callback"
]
```

Then deploy config + extensions:

```bash
npm run deploy
# or: shopify app deploy
```

Verify OAuth: visiting `https://YOUR-PRODUCTION-DOMAIN` should redirect to Shopify install/grant.

## Step 3 — Compliance webhooks (done in code)

Mandatory webhooks are configured in `shopify.app.toml` and handled at:

| Topic | Route |
|-------|-------|
| `customers/data_request` | `/webhooks/compliance` |
| `customers/redact` | `/webhooks/compliance` |
| `shop/redact` | `/webhooks/compliance` |
| `app/uninstalled` | `/webhooks/app/uninstalled` |

Test locally:

```bash
shopify app webhook trigger --topic customers/data_request
shopify app webhook trigger --topic shop/redact
```

Both compliance topics route to `/webhooks/compliance`.

## Step 4 — Partners Dashboard listing

Go to **Partners → Apps → BundleStack → Distribution → Shopify App Store listing**.

Use copy from [`docs/app-store-listing.md`](./app-store-listing.md).

Required fields:

| Field | Value |
|-------|-------|
| App name | BundleStack |
| Primary language | English |
| Category | Store management / Sales / Discounts |
| Privacy policy URL | `https://YOUR-DOMAIN/privacy` |
| Pricing | Free to install + usage tiers (see README) |
| Emergency developer contact | Your email |
| API contact email | Your email (no "Shopify" in address) |

## Step 5 — App Store review page

In Partners → **App Store review**:

1. Complete **Configuration** checks (icon, URLs, webhooks)
2. Run **Automated tests** (fix any failures)
3. Upload **demo screencast**
4. Provide **test store** access (dev store with app installed + sample offer)
5. Submit for review

### Test store setup for reviewers

1. Install app on a development store
2. Create an active offer on a visible product
3. Add BundleStack theme block to product template
4. Confirm discount applies at checkout with qty 2+

## Step 6 — Billing

Tier logic lives in `app/billing.plans.ts`. **Shopify Billing API** is wired in `app/billing.shopify.ts` and the in-app Billing page — merchants choose and approve paid plans through Shopify (no automatic upgrades).

For development stores, set `SHOPIFY_BILLING_TEST=true` on Render so charges appear as test subscriptions.

Add all four pricing plans in the Partners App Store listing form (see [`docs/SUBMISSION.md`](./SUBMISSION.md)).

## Timeline

- Deploy + URL config: ~1 hour
- Listing assets (icon, screenshots, video): ~2–4 hours
- Shopify review: typically 3–10 business days

## Useful links

- [Submit for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
- [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Privacy compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- [Billing API](https://shopify.dev/docs/apps/launch/billing)
