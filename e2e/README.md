# Coupon e2e (Playwright)

Admin UI tests run against a local production build with `E2E_AUTH_BYPASS=1`
(no Shopify session / App Bridge). Shopify Admin GraphQL is stubbed in
`app/e2e-auth.server.ts`.

## Run

```bash
npm run test:e2e
# or only coupons:
npm run test:e2e -- e2e/coupons.spec.ts
```

Open the latest HTML report / videos:

```bash
npm run test:e2e:report
```

## Notes

- Uses Growth billing (`E2E_BILLING_PLAN=scale`) so coupons are allowed.
- Product pickers use seeded E2E sample products (no resource picker).
- Never set `E2E_AUTH_BYPASS=1` on production.
