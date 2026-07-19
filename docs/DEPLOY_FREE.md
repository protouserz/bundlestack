# Deploy BundleStack

Production needs **always-on hosting** and **Postgres**. Ephemeral SQLite on free Render loses sessions and offers on every restart/cold disk.

## Recommended — Render Blueprint

`render.yaml` provisions:

| Resource | Plan | Why |
|----------|------|-----|
| Web service `bundlestack` | **Starter** | Always on — storefront app-proxy is not cold-started |
| Postgres `bundlestack-db` | **basic-256mb** | Durable sessions + offers |

1. Push this repo to GitHub
2. Render Dashboard → **New** → **Blueprint** → select the repo
3. Set sync:false secrets: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`
4. Deploy → URL stays `https://bundlestack-pfee.onrender.com` (or update `shopify.app.toml` if the hostname changes)

`DATABASE_URL` is wired automatically from `bundlestack-db`.

**Migration note:** Switching from SQLite wipes previous local/prod SQLite data. Reinstall the app on each store so Shopify creates a fresh offline session.

## Local development

```bash
docker compose up -d
cp .env.example .env   # fill Shopify credentials
npx prisma migrate deploy
npm run dev
```

## Alternatives

### Neon Postgres + Render Starter

If you prefer Neon’s free DB:

1. Create a Neon project → copy the connection string
2. In Render, set `DATABASE_URL` to the Neon URL (override the Blueprint DB)
3. Keep the web service on **Starter** (always on)

### Fly.io

```bash
fly secrets set DATABASE_URL=postgresql://... SHOPIFY_API_KEY=... SHOPIFY_API_SECRET=... SHOPIFY_APP_URL=https://bundlestack.fly.dev
fly deploy
```

`fly.toml` keeps `min_machines_running = 1` and does not use a SQLite volume.

## Point Shopify at production

Update `shopify.app.toml` `application_url` / `redirect_urls` / app proxy URL to match the deployed host, then:

```bash
npm run deploy
```
