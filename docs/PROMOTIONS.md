# AOV promotion suite (feature/aov-offer-suite)

Competitor-parity offer types beyond quantity breaks.

## Offer types

| Type | Admin path | Plan | Checkout sync |
|------|------------|------|---------------|
| BOGO | `/app/promotions/bogo` | Starter+ | Discount Function (`bundlestack-discount`) |
| Free gifts | `/app/promotions/free-gifts` | Starter+ | Config only (pending) |
| Mix & match | `/app/promotions/mix-match` | Starter+ | Config only (pending) |
| Bundle builder | `/app/promotions/builders` | Growth+ | Config only (pending) |
| FBT / upsells | `/app/promotions/fbt` | Growth+ | Config only (pending) |

Hub: `/app/promotions`

## Architecture

- Prisma `Promotion` model with `promotionType` + JSON `config`
- Shared types in `app/models/promotion.types.ts`
- CRUD in `app/models/promotion.server.ts`
- Plan gates in `app/models/promotion-access.server.ts`
- Sync in `app/models/promotion-sync.server.ts`
- Function extension: `extensions/bundlestack-discount`

## BOGO checkout sync

Active BOGO promotions call `discountAutomaticAppCreate` with:

- `functionHandle`: `bundlestack-discount`
- `discountClasses`: `PRODUCT`
- Metafield `$app` / `function-configuration` (JSON buy/get rules + product IDs)

Deploy the app (including the Function extension) before testing at checkout:

```bash
npm run deploy
```

## Next implementation phases

1. Functions / BXGY for free gifts, mix & match, FBT
2. Theme blocks for builder + FBT widget
3. Per-step product pickers on bundle builders
4. Dashboard metrics per promotion type
