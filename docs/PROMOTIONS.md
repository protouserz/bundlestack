# AOV promotions and coupons

Offer types beyond quantity breaks. Included on Free (Support is email help only).

## Offer types

| Type | Admin path | Checkout | Product page |
|------|------------|----------|--------------|
| Quantity breaks & simple BOGO | `/app/offers` | `bundlestack-qb-discount` | Widget tiers |
| BOGO (incl. different product) | `/app/promotions/bogo` | Same Function | Widget promo card |
| Free gifts | `/app/promotions/free-gifts` | Same Function | Widget promo card |
| Mix & match | `/app/promotions/mix-match` | Same Function | Widget promo card |
| Bundle builder | `/app/promotions/builders` | Same Function | Widget promo card |
| FBT / upsells | `/app/promotions/fbt` | Same Function | Widget promo card |
| Coupons | `/app/coupons` | Shopify discount codes | N/A |

Hub: `/app/promotions`

## Architecture

- Prisma `Promotion` + `Coupon`
- Types in `app/models/promotion.types.ts` / `coupon.types.ts`
- Sync: `promotion-sync.server.ts` → automatic App Function (`bundlestack-qb-discount`)
- Coupons: `discount-code.server.ts` → `discountCodeBasicCreate`
- Storefront proxy `/apps/bundlestack/offers` returns `{ offers, promotions }`

## Function rules

| Type | Rule |
|------|------|
| quantity_break | Existing tier % off matching lines |
| bogo (offers) | Same-product cheapest get-units as a fixed unit price |
| bogo (promotions) | Buy X get Y, optional different get products |
| free_gift | Threshold on subtotal/qty → free gift units already in cart |
| mix_match | N+ units from a set → % / fixed on those lines |
| bundle_builder | Enough step selections → % / fixed on matched lines |
| fbt | Anchor + recommended → % / fixed on recommended |

Deploy the Function after this ships:

```bash
npm run deploy
```

Gift products must be in the cart for free-gift discounts to apply.
