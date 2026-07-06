import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { listOffersRaw } from "./bundle.server";
import { parseDiscountIds } from "./discount.server";

async function fetchDiscountUsageCount(
  admin: AdminApiContext,
  discountId: string,
): Promise<number> {
  const response = await admin.graphql(
    `#graphql
      query discountUsage($id: ID!) {
        discountNode(id: $id) {
          discount {
            ... on DiscountAutomaticBasic {
              asyncUsageCount
            }
          }
        }
      }`,
    { variables: { id: discountId } },
  );

  const json = await response.json();
  return json.data?.discountNode?.discount?.asyncUsageCount ?? 0;
}

export async function syncDiscountUsesForShop(
  admin: AdminApiContext,
  shop: string,
): Promise<number> {
  const offers = await listOffersRaw(shop);
  let totalUses = 0;

  try {
    for (const offer of offers) {
      const discountIds = parseDiscountIds(offer.discountIds);
      let offerUses = 0;

      for (const discountId of discountIds) {
        offerUses += await fetchDiscountUsageCount(admin, discountId);
      }

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
