# AOV promotion suite (feature/aov-offer-suite)

Scaffold for competitor-parity offer types beyond quantity breaks.

## Offer types

| Type | Admin path | Status |
|------|------------|--------|
| BOGO | `/app/promotions/bogo` | Config CRUD scaffold |
| Free gifts | `/app/promotions/free-gifts` | Config CRUD scaffold |
| Mix & match | `/app/promotions/mix-match` | Config CRUD scaffold |
| Bundle builder | `/app/promotions/builders` | Config CRUD scaffold |
| FBT / upsells | `/app/promotions/fbt` | Config CRUD scaffold |

Hub: `/app/promotions`

## Architecture

- Prisma `Promotion` model with `promotionType` + JSON `config`
- Shared types in `app/models/promotion.types.ts`
- CRUD in `app/models/promotion.server.ts`
- Sync stub in `app/models/promotion-sync.server.ts` (Functions/BXGY next)

## Next implementation phases

1. **Shopify Functions** discount app extension for BOGO / mix & match / FBT
2. Product/collection pickers on each form (reuse `ProductPickerField`)
3. Theme blocks for builder + FBT widget
4. Plan gating (Starter+ for BOGO/gifts/mix; Growth+ for builders/FBT)
5. Dashboard metrics per promotion type
