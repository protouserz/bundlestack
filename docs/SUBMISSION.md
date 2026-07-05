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

| Plan | Price | Notes |
|------|-------|-------|
| Free | $0/mo | Up to $500 app-generated revenue / month |
| Starter | $7.99/mo | Up to $2,000 app-generated revenue / month |
| Growth | $14.99/mo | Up to $5,000 app-generated revenue / month |
| Pro | $29.99/mo | Unlimited app-generated revenue |

Merchants on the free tier pay nothing. Paid tiers activate when app-attributed revenue crosses thresholds; merchants approve charges via Shopify Billing.

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

Billing: Free until $500/mo app-generated revenue. Paid tiers use Shopify Billing API; approve on the in-app Billing page if prompted.

Uninstall: Discounts and offer data are removed automatically. Theme block can be removed in the theme editor.

Protected customer data: Not used. App stores shop session, offer config, and aggregate revenue only — no customer names, emails, or order line items.

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
