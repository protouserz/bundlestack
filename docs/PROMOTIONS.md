# AOV promotion suite (feature/aov-offer-suite)

Competitor-parity offer types beyond quantity breaks.

## Offer types

| Type | Admin path | Plan | Checkout sync | Product page |
|------|------------|------|---------------|--------------|
| BOGO | `/app/promotions/bogo` | Starter+ | Discount Function | Widget card |
| Free gifts | `/app/promotions/free-gifts` | Starter+ | Discount Function | Widget card |
| Mix & match | `/app/promotions/mix-match` | Starter+ | Discount Function | Widget card |
| Bundle builder | `/app/promotions/builders` | Growth+ | Discount Function | Widget card |
| FBT / upsells | `/app/promotions/fbt` | Growth+ | Discount Function | Widget card |

Hub: `/app/promotions`

## Architecture

- Prisma `Promotion` model with `promotionType` + JSON `config`
- Shared types in `app/models/promotion.types.ts`
- CRUD in `app/models/promotion.server.ts`
- Plan gates in `app/models/promotion-access.server.ts`
- Sync in `app/models/promotion-sync.server.ts` (all types → `discountAutomaticAppCreate`)
- Function extension: `extensions/bundlestack-discount`
- Storefront: app proxy `/apps/bundlestack/offers` returns `{ offers, promotions }`; theme widget renders both

## Checkout sync

Active promotions call `discountAutomaticAppCreate` with:

- `functionHandle`: `bundlestack-discount`
- `discountClasses`: `PRODUCT`
- Metafield `$app` / `function-configuration` (JSON discriminated by `type`)

Function rules (v1):

| Type | Rule |
|------|------|
| `bogo` | Buy X get Y (same or different products) |
| `free_gift` | Threshold on subtotal/qty → 100% off gift units already in cart |
| `mix_match` | N+ units from product set → % / fixed on those lines |
| `bundle_builder` | Enough step selections → % / fixed on matched lines |
| `fbt` | Anchor + recommended (optional requireAll) → % / fixed on recommended |

Deploy before testing at checkout:

```bash
npm run deploy
```

## Storefront

1. Add the BundleStack theme block on a product template.
2. Active quantity-break offers and AOV promotions for that product appear in the widget.
3. Discounts apply at cart/checkout via the Discount Function (gift products must be in cart for free-gift).
