# AOV promotions and coupons

Offer types beyond quantity breaks. **Frequently bought together** (upsell and cross-sell) is included on Free. Other promotion types and coupons require **Pro** ($2/month). Quantity breaks and simple BOGO also stay on Free.

Admin create/edit for Pro-only types is blocked on Free. The storefront proxy only returns promotion types the shop's plan includes. Already-synced Shopify automatic discounts keep applying at checkout until they are deleted.

## Offer types

| Type | Admin path | Plan |
|------|------------|------|
| Quantity breaks & simple BOGO | `/app/offers` | Free |
| BOGO (incl. different product) | `/app/promotions/bogo` | Pro |
| Free gifts | `/app/promotions/free-gifts` | Pro |
| Mix & match | `/app/promotions/mix-match` | Pro |
| Bundle builder | `/app/promotions/builders` | Pro |
| FBT / upsells | `/app/promotions/fbt` | Free |
| Coupons | `/app/coupons` | Pro |

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
