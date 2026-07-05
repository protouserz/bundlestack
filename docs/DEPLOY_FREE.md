# Deploy without a credit card

Fly.io requires a credit card for verification. These options do **not** (or are much lighter on billing).

## Quick comparison

| Platform | Credit card? | Always on? | SQLite OK? | App Store OK? |
|----------|--------------|------------|------------|---------------|
| **Render (free)** | No | No — sleeps after 15 min idle | No — use Postgres | Yes, with caveats |
| **Shopify CLI + tunnel** | No | Only while `npm run dev` runs | Yes (local) | Dev/testing only |
| **Railway** | No for signup | ~$1/mo free credit | Postgres recommended | Limited hours |
| **Oracle Cloud (free VM)** | Sometimes | Yes | Yes (persistent disk) | Yes — more setup |
| **Fly.io** | Yes (verify only) | Yes | Yes (volume) | Best production fit |

---

## Option 1 — Render (recommended, no credit card)

**Best for:** App Store submission on a budget if you accept cold starts (~30–60s after idle).

Sign up: https://render.com (GitHub login, no card).

### Limitations

- Free web service **spins down** after 15 minutes with no traffic
- First request after sleep is slow — ping your app before Shopify review
- **SQLite does not persist** on Render’s free tier — use **Neon Postgres** (free, no card)

### A. Create a free Postgres database (Neon)

1. Sign up at https://neon.tech (free tier, no card)
2. Create a project → copy the connection string
3. It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### B. Switch BundleStack to Postgres (one-time)

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then locally:

```bash
export DATABASE_URL="your_neon_connection_string"
npx prisma migrate dev --name postgres
git add prisma && git commit -m "Switch to Postgres for cloud deploy"
```

### C. Deploy on Render

1. Push repo to GitHub
2. Render Dashboard → **New** → **Web Service** → connect repo
3. Settings:
   - **Environment:** Docker
   - **Instance type:** Free
   - **Health check path:** `/` (optional)
4. Environment variables:

   | Key | Value |
   |-----|-------|
   | `SHOPIFY_API_KEY` | From Partners Dashboard |
   | `SHOPIFY_API_SECRET` | From Partners Dashboard |
   | `SCOPES` | `read_orders,read_products,write_products,write_discounts,read_discounts` |
   | `SHOPIFY_APP_URL` | `https://YOUR-SERVICE.onrender.com` |
   | `DATABASE_URL` | Neon connection string |
   | `NODE_ENV` | `production` |

5. Deploy → copy URL (e.g. `https://bundlestack.onrender.com`)

### D. Point Shopify at Render

Update `shopify.app.toml`:

```toml
application_url = "https://YOUR-SERVICE.onrender.com"

[auth]
redirect_urls = [
  "https://YOUR-SERVICE.onrender.com/auth/callback",
  "https://YOUR-SERVICE.onrender.com/auth/shopify/callback",
]
```

Then:

```bash
npm run deploy
```

### Keep Render awake (optional)

Use a free cron ping (e.g. cron-job.org) every 14 minutes on your app URL so it doesn’t sleep during review.

---

## Option 2 — Dev / testing only (no hosting bill)

Keep using local dev — **not valid for App Store production**, but fine for building and testing:

```bash
cd ~/Projects/bundlestack
npm run dev
```

Press `p` to open in admin. Shopify CLI creates a tunnel URL automatically.

Use this until you’re ready to pay for hosting or use Render.

---

## Option 3 — Railway

https://railway.app — no card to start; ~**$1/month** in free credit after trial (not 24/7).

Similar to Render: connect GitHub, set env vars, use Neon for `DATABASE_URL`.

---

## Option 4 — Oracle Cloud Always Free VM

Truly free VPS with persistent disk — no sleep, SQLite works like Fly.

- Sign up: https://www.oracle.com/cloud/free/
- Create an Ampere VM, install Docker, run the existing `Dockerfile`
- More DevOps work; see Oracle’s “Always Free” docs

---

## Option 5 — Stay on Fly.io (card required, not charged for free tier)

Fly asks for a card but typically **does not charge** within the free allowance (~$5/month of resources). Many indie devs use it for Shopify apps.

If you’re OK adding a card for verification only, use `./scripts/deploy-fly.sh` — it’s the path of least resistance for SQLite + always-on.

---

## What we recommend

| Goal | Path |
|------|------|
| **No credit card, App Store submit** | Render free + Neon Postgres |
| **No credit card, just test the app** | `npm run dev` (Shopify tunnel) |
| **Simplest production, card OK** | Fly.io (`scripts/deploy-fly.sh`) |

After deploy, continue with [APP_STORE.md](./APP_STORE.md) from Step 4 (Partners listing).
