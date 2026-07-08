import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { fetchDiscountNodesByIds } from "../utils/graphql.server";
import { listOffersRaw } from "./bundle.server";
import { parseDiscountIds } from "./discount.server";

export async function syncDiscountUsesForShop(
  admin: AdminApiContext,
  shop: string,
): Promise<number> {
  const offers = await listOffersRaw(shop);
  const allDiscountIds = offers.flatMap((offer) =>
    parseDiscountIds(offer.discountIds),
  );
  const discountNodes = await fetchDiscountNodesByIds(admin, allDiscountIds);

  let totalUses = 0;

  try {
    for (const offer of offers) {
      const discountIds = parseDiscountIds(offer.discountIds);
      const offerUses = discountIds.reduce((sum, discountId) => {
        const node = discountNodes.get(discountId);
        return sum + (node?.discount?.asyncUsageCount ?? 0);
      }, 0);

      await prisma.bundleOffer.update({
        where: { id: offer.id },
        data: { discountUses: offerUses },
      });

      totalUses += offerUses;
    }

    await prisma.shopSettings.upsert({
      where: { shop },
      create: { shop, totalRevenue: totalUses },
      update: { totalRevenue: totalUses },
    });
  } catch (error) {
    console.error("Failed to sync discount uses:", error);
    totalUses = offers.reduce(
      (sum, offer) => sum + (offer.discountUses ?? 0),
      0,
    );
  }

  return totalUses;
}
