# App Store submission — BundleStack

Use this document when filling out the Shopify Partners listing and App Store review form.

**Production URL:** https://bundlestack-pfee.onrender.com  
**Privacy policy:** https://bundlestack-pfee.onrender.com/privacy  
**Support page:** https://bundlestack-pfee.onrender.com/support  
**Dev test store:** bundlestack-dev.myshopify.com  
**GitHub:** https://github.com/protouserz/bundlestack

---

## Before you submit (checklist)

### Code & hosting (done in repo)

- [x] HTTPS production URL on Render
- [x] Compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`, `app/uninstalled`)
- [x] Privacy policy at `/privacy`
- [x] Support page at `/support`
- [x] Shopify Billing API wired for paid tiers
- [x] `read_orders` scope removed (no protected customer data)
- [x] App icon source in `docs/app-store/icon.png` (export 1200×1200 for upload)

### You must do in Partners Dashboard

- [ ] Upload **1200×1200** app icon (from `docs/app-store/icon.png`)
- [ ] Add **3–6 screenshots** (1600×900) — capture from admin + storefront
- [ ] Record **demo screencast** (~3 min, English) — script in [`app-store-listing.md`](./app-store-listing.md)
- [ ] Set **support email** (cannot contain the word "Shopify")
- [ ] Set **emergency developer contact**
- [ ] Set **API contact email** (cannot contain "Shopify")
- [ ] Update Render env: `SCOPES=read_products,write_products,write_discounts,read_discounts`
- [ ] Set `SUPPORT_EMAIL=your@email.com` on Render
- [ ] Set `SHOPIFY_BILLING_TEST=true` on Render while testing on dev stores
- [ ] Run `npm run deploy` after any `shopify.app.toml` change
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
