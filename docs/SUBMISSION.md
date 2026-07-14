# App Store submission — BundleStack

Use this document when filling out the Shopify Partners listing and App Store review form.

**Production URL:** https://bundlestack-pfee.onrender.com  
**Privacy policy:** https://bundlestack-pfee.onrender.com/privacy  
**Support page:** https://bundlestack-pfee.onrender.com/support  
**Dev test store:** bundlestack-dev.myshopify.com  
**GitHub:** https://github.com/protouserz/bundlestack

---

## Troubleshooting: "This store will be right back"

If `dev.shopify.com/.../distribution` shows a black **"This store will be right back"** page, that is a **Shopify dashboard routing bug or session issue** — not a problem with BundleStack or Render.

### Fix (try in order)

1. **Use the Partner Dashboard entry point** (most reliable):
   - Go to [partners.shopify.com](https://partners.shopify.com) → log in
   - **Apps** → **BundleStack**
   - In the left sidebar, open **App Store review** or **Distribution** (not a bookmarked deep link)

2. **Navigate from the app home** (avoid deep-linking `/distribution`):
   - [Dev Dashboard apps list](https://dev.shopify.com/dashboard/225145646/apps)
   - Click **BundleStack**
   - Use sidebar: **App Store listing** → then **App Store review**

3. **Choose Public distribution first** (if you haven't):
   - Partners → **App distribution** → **BundleStack** → **Choose distribution** → **Public**
   - Then return to App Store listing / review

4. **Refresh session**: hard refresh (`Cmd+Shift+R`), incognito window, or log out and back in.

5. **Check dev store** isn't paused:
   - Dev Dashboard → **Stores** → `bundlestack-dev` → open admin
   - If the store admin also shows "right back", recreate or reactivate the dev store

6. **Still broken?** Contact [Partner Support](https://partners.shopify.com/support) with:
   - App: BundleStack (`393084436481`)
   - URL that fails
   - `x-request-id` from Chrome DevTools → Network → failed request → Headers

### Embedded app checks stuck on “pending”

Partners shows two items under **Embedded app checks**:

- Using the latest App Bridge script loaded from Shopify’s CDN
- Using session tokens for user authentication

These are **not** instant code scans. Shopify collects **telemetry** when a merchant uses your app **inside the admin iframe** (every ~2 hours). If the app never loads successfully, the checks stay pending.

**Do this (in order):**

1. **Wake production** — open https://bundlestack-pfee.onrender.com/health and wait until you see `{"ok":true,"service":"bundlestack"}` (up to ~60s on free tier). Do **not** open the app in Shopify until this returns OK.
2. **Open the app in admin** — https://admin.shopify.com/store/bundlestack-dev/apps/bundlestack — then **reload** if you previously saw the Render splash.
3. **Use a normal browser window** with ad blockers and script blockers **disabled** for `*.myshopify.com` and `bundlestack-pfee.onrender.com`.
4. **Click through the app** for 2–3 minutes: Dashboard → Offers → open an offer → Billing. Each navigation should hit your backend.
5. **Verify session tokens** — DevTools → Network → **clear the filter** (embedded apps do **not** call `onrender.com` in the browser — Shopify proxies everything through `admin.shopify.com`). Filter by `apps/bundlestack` or `bundlestack`, click **Offers**, and open the `.data` or document request. Check **Request URL** for `id_token=eyJ...` on first load, or **Request Headers** for `Authorization: Bearer eyJ...` on navigations.
6. **Verify App Bridge** — Network should show `app-bridge.js` from `cdn.shopify.com/shopifycloud/`.
7. **Wait** — recheck Partners after **2–48 hours**. If still pending after real usage, contact [Partner Support](https://partners.shopify.com/support) and ask for manual embedded-check verification (app ID `393084436481`).

**"WELCOME TO RENDER" splash in the iframe?** That means the app never loaded — embedded checks **cannot pass** until you see the real BundleStack dashboard. Wake `/health` first, then reload the app in admin. For App Store submission, upgrade Render to **Starter ($7/mo)** so the service never sleeps; GitHub keep-warm alone is unreliable on free tier.

### Direct links (use after logging in via partners.shopify.com)

| Page | URL |
|------|-----|
| Apps list | https://dev.shopify.com/dashboard/225145646/apps |
| BundleStack app | https://dev.shopify.com/dashboard/225145646/apps/393084436481 |
| Partner app overview | https://partners.shopify.com/organizations/225145646/apps/393084436481/overview |

---

## Before you submit (checklist)

### Code & hosting (done in repo)

- [x] HTTPS production URL on Render
- [x] Compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`, `app/uninstalled`)
- [x] Privacy policy at `/privacy` — **live**
- [x] Support page at `/support` — **live**
- [x] Shopify Billing API wired for paid tiers
- [x] `read_orders` scope removed (no protected customer data)
- [x] App icon source in `docs/app-store/icon.png` (export 1200×1200 for upload)
- [x] Render env in `render.yaml` (SCOPES, SUPPORT_EMAIL, SHOPIFY_BILLING_TEST, SHOPIFY_APP_URL)
- [x] Shopify config deployed (**bundlestack-5**+)
- [x] `./scripts/verify-app-store-readiness.sh` passes (7/7)

### You must do in Partners Dashboard

- [ ] Upload **1200×1200** app icon (from `docs/app-store/icon.png`)
- [ ] Add **3–6 screenshots** (1600×900) — capture from admin + storefront
- [ ] Record **demo screencast** (~3 min, English) — script in [`app-store-listing.md`](./app-store-listing.md)
- [ ] Set **support email** (cannot contain the word "Shopify")
- [ ] Set **emergency developer contact**
- [ ] Set **API contact email** (cannot contain "Shopify")
- [ ] Update Render env if dashboard overrides blueprint (see `render.yaml` values)
- [ ] Optional: add `RENDER_DEPLOY_HOOK_URL` GitHub secret for auto-deploy on push
- [ ] Complete **App Store review** automated checks → Submit

---

## Partners → Distribution → App Store listing

| Field | Value |
|-------|-------|
| App name | BundleStack |
| Handle | bundlestack |
| Primary language | English |
| Category | Discounts / Sales / Store management |
| App URL | https://bundlestack-pfee.onrender.com |
| Privacy policy URL | https://bundlestack-pfee.onrender.com/privacy |
| Support URL | https://bundlestack-pfee.onrender.com/support |
| Pricing model | Free to install + recurring paid plans |
| Protected customer data | **No** — app does not access or store customer PII |

Copy for tagline, description, keywords: [`app-store-listing.md`](./app-store-listing.md)

### Pricing plans (App Store form)

Paste feature bullets from [`app-store-listing.md`](./app-store-listing.md) into each plan’s **Features** field so store cards are not empty.

| Plan | Price | Notes |
|------|-------|-------|
| Free | $0/mo | Full core product (offers, widget, sync) |
| Starter | $7.99/mo | Email support; ~500 redemptions/mo guidance |
| Growth | $14.99/mo | Priority support; ~2,000 redemptions/mo |
| Pro | $29.99/mo | No redemption tracking limits; 5,000+/mo |

Merchants choose a paid plan on the in-app Billing page and approve the charge in Shopify. Plans do not upgrade automatically.

---

## App Store review — reviewer notes

Paste into the **Testing instructions** / **Notes for reviewer** field:

```
BundleStack creates quantity-break offers and syncs them as Shopify automatic discounts.

Test store: bundlestack-dev.myshopify.com
(App is pre-installed on this development store.)

Steps to verify:
1. Open BundleStack from Apps in the admin sidebar.
2. Dashboard → Create offer → select a product → add tiers (e.g. Qty 2 = 10% off) → set Active → Save.
3. Online Store → Themes → Customize → Product template → Add app block "BundleStack" → Save.
4. View the product on the storefront → select a tier → Add to cart → Checkout → confirm discount applies.

Billing: Free to install. Merchants select paid plans on the in-app Billing page and approve charges in Shopify (no automatic upgrades).

Uninstall: Discounts, offer data, and shop records are removed automatically. Theme block can be removed in the theme editor.

Protected customer data: Not used. App stores shop session, offer config, and discount redemption counts only — no customer names, emails, or order line items.

Privacy: https://bundlestack-pfee.onrender.com/privacy
Support: https://bundlestack-pfee.onrender.com/support
```

---

## Demo screencast outline (~3 minutes)

1. **Install / open** — OAuth grant on dev store (15 sec)
2. **Create offer** — product picker, tiers, activate (45 sec)
3. **Theme block** — add BundleStack widget to product page (30 sec)
4. **Storefront** — tier selection, cart, checkout discount (45 sec)
5. **Billing** — show free tier + performance pricing (20 sec)
6. **Uninstall guarantee** — mention clean removal (15 sec)

---

## Deploy after config changes

```bash
cd ~/Projects/bundlestack
npm run deploy          # pushes shopify.app.toml + extensions to Shopify
git push                # triggers Render redeploy if connected
```

Verify production:

```bash
./scripts/verify-app-store-readiness.sh
```

---

## Common review issues

| Issue | Fix |
|-------|-----|
| OAuth redirect mismatch | `SHOPIFY_APP_URL` on Render must match `shopify.app.toml` |
| Webhook failures | Check Render logs; cold start may delay first webhook |
| Billing not shown | Add all four plans in Partners pricing section |
| Protected customer data | Select **No** — app has no `read_orders` or customer scopes |
| Support email rejected | Use a real address without "Shopify" in the domain or local part |

---

## Timeline

- Listing assets + screencast: ~2–4 hours (your work)
- Shopify automated checks: ~15 minutes
- Shopify human review: typically 3–10 business days
