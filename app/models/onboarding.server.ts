import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import {
  createOffer,
  DEFAULT_OFFER_TITLE,
  DEFAULT_QUANTITY_TIERS,
  updateOfferDiscountIds,
} from "./bundle.server";
import { applyOfferDiscountSync } from "./discount.server";
import prisma from "../db.server";

export async function seedDefaultOfferIfNeeded(
  shop: string,
  admin: AdminApiContext,
) {
  const existing = await prisma.bundleOffer.findFirst({
    where: { shop },
    select: { id: true },
  });
  if (existing) {
    return { created: false as const };
  }

  try {
    const offer = await createOffer(shop, {
      title: DEFAULT_OFFER_TITLE,
      status: "active",
      productIds: [],
      tiers: DEFAULT_QUANTITY_TIERS,
    });
    const discountIds = await applyOfferDiscountSync(admin, offer, []);
    await updateOfferDiscountIds(offer.id, discountIds);
    return { created: true as const, offer };
  } catch (error) {
    console.error(`Failed to seed default offer for ${shop}:`, error);
    return { created: false as const, error };
  }
}
