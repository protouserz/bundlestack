import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { DiscountTier } from "./bundle.server";
import { listAllAutomaticDiscountNodes, normalizeDiscountNodeId } from "../utils/graphql.server";

type SerializedOffer = {
  id: string;
  title: string;
  status: string;
  productIds: string[];
  tiers: DiscountTier[];
  discountIds?: string[];
};

type GraphqlResponse = {
  errors?: Array<{ message: string }>;
  data?: Record<string, unknown>;
};

function percentageTiers(offer: SerializedOffer): DiscountTier[] {
  return offer.tiers.filter((tier) => tier.discountType === "percentage");
}

function discountTitleForTier(
  offerId: string,
  tier: DiscountTier,
  tierIndex: number,
): string {
  return `BundleStack ${offerId} · ${tierIndex + 1} · Qty ${tier.minQty}+ · ${tier.discountValue}% off`;
}

function plannedDiscountTitles(offer: SerializedOffer): Set<string> {
  return new Set(
    percentageTiers(offer).map((tier, index) =>
      discountTitleForTier(offer.id, tier, index),
    ),
  );
}

function percentageTierCount(offer: SerializedOffer): number {
  return percentageTiers(offer).length;
}

export function isOfferDiscountTitle(
  title: string,
  offer: SerializedOffer,
  plannedTitles: Set<string>,
): boolean {
  const normalized = title.toLowerCase();
  const offerTitle = offer.title.trim().toLowerCase();
  const marker = `bundlestack ${offer.id}`.toLowerCase();

  return (
    normalized.startsWith(marker) ||
    normalized.startsWith("buy more, save more · buy") ||
    normalized.startsWith(`${offerTitle} ·`) ||
    normalized.startsWith(offerTitle) ||
    plannedTitles.has(title)
  );
}

function assertGraphqlOk(json: GraphqlResponse, context: string) {
  if (json.errors?.length) {
    throw new Error(
      `${context}: ${json.errors.map((error) => error.message).join(", ")}`,
    );
  }
}

export async function deleteShopifyDiscounts(
  admin: AdminApiContext,
  discountIds: string[],
) {
  for (const id of discountIds) {
    if (!id) continue;

    const response = await admin.graphql(
      `#graphql
        mutation discountAutomaticDelete($id: ID!) {
          discountAutomaticDelete(id: $id) {
            deletedAutomaticDiscountId
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { id } },
    );

    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "discountAutomaticDelete");

    const payload = json.data?.discountAutomaticDelete as
      | { userErrors?: Array<{ message: string }> }
      | undefined;
    const userErrors = payload?.userErrors ?? [];
    if (userErrors.length > 0) {
      const onlyMissing = userErrors.every((error) =>
        /not found|does not exist/i.test(error.message),
      );
      if (!onlyMissing) {
        throw new Error(
          userErrors.map((error) => error.message).join(", "),
        );
      }
    }
  }
}

async function deleteDiscountsWithTitle(
  admin: AdminApiContext,
  title: string,
) {
  const nodes = await listAllAutomaticDiscountNodes(admin);
  const ids = nodes
    .filter((node) => node.title === title)
    .map((node) => node.id);

  await deleteShopifyDiscounts(admin, ids);
}

async function findOfferDiscountNodes(admin: AdminApiContext, offer: SerializedOffer) {
  const plannedTitles = plannedDiscountTitles(offer);
  const nodes = await listAllAutomaticDiscountNodes(admin);

  return nodes.filter(
    (node) => node.title && isOfferDiscountTitle(node.title, offer, plannedTitles),
  );
}

async function deleteOrphanedOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
) {
  const offerNodes = await findOfferDiscountNodes(admin, offer);
  await deleteShopifyDiscounts(
    admin,
    offerNodes.map((node) => node.id),
  );
}

async function createAutomaticDiscountForTier(
  admin: AdminApiContext,
  offer: SerializedOffer,
  tier: DiscountTier,
  tierIndex: number,
  startsAt: string,
): Promise<string> {
  const discountTitle = discountTitleForTier(offer.id, tier, tierIndex);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await admin.graphql(
      `#graphql
        mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
          discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
            automaticDiscountNode {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          automaticBasicDiscount: {
            title: discountTitle,
            startsAt,
            combinesWith: {
              orderDiscounts: false,
              productDiscounts: false,
              shippingDiscounts: true,
            },
            customerGets: {
              value: {
                percentage: tier.discountValue / 100,
              },
              items: {
                products: {
                  productsToAdd: offer.productIds,
                },
              },
            },
            minimumRequirement: {
              quantity: {
                greaterThanOrEqualToQuantity: String(tier.minQty),
              },
            },
          },
        },
      },
    );

    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "discountAutomaticBasicCreate");

    const payload = json.data?.discountAutomaticBasicCreate as
      | {
          userErrors?: Array<{ message: string }>;
          automaticDiscountNode?: { id?: string };
        }
      | undefined;
    const userErrors = payload?.userErrors ?? [];
    if (userErrors.length > 0) {
      const message = userErrors.map((error) => error.message).join(", ");
      if (attempt === 0 && /unique/i.test(message)) {
        await deleteDiscountsWithTitle(admin, discountTitle);
        continue;
      }
      throw new Error(message);
    }

    const id = payload?.automaticDiscountNode?.id;
    if (!id) {
      throw new Error(
        `Shopify did not return a discount ID for tier Qty ${tier.minQty}+.`,
      );
    }

    return normalizeDiscountNodeId(id);
  }

  throw new Error(`Could not create discount "${discountTitle}".`);
}

export async function syncOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
): Promise<string[]> {
  if (offer.status !== "active") {
    return [];
  }

  const tiers = percentageTiers(offer);
  const expectedTierCount = tiers.length;
  if (expectedTierCount === 0) {
    throw new Error("Add at least one percentage discount tier before activating.");
  }

  const startsAt = new Date().toISOString();
  const createdIds: string[] = [];

  try {
    for (const [tierIndex, tier] of tiers.entries()) {
      const id = await createAutomaticDiscountForTier(
        admin,
        offer,
        tier,
        tierIndex,
        startsAt,
      );
      createdIds.push(id);
    }
  } catch (error) {
    await deleteShopifyDiscounts(admin, createdIds);
    throw error;
  }

  if (createdIds.length !== expectedTierCount) {
    await deleteShopifyDiscounts(admin, createdIds);
    throw new Error(
      `Expected ${expectedTierCount} Shopify discounts but created ${createdIds.length}.`,
    );
  }

  return createdIds;
}

export async function forceRecreateOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
): Promise<string[]> {
  const offerNodes = await findOfferDiscountNodes(admin, offer);
  await deleteShopifyDiscounts(
    admin,
    offerNodes.map((node) => node.id),
  );
  return syncOfferDiscounts(admin, offer);
}

export async function replaceOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
  existingDiscountIds: string[],
): Promise<string[]> {
  const expectedTierCount = percentageTierCount(offer);
  if (expectedTierCount === 0) {
    return [];
  }

  await deleteShopifyDiscounts(admin, existingDiscountIds);

  const offerNodes = await findOfferDiscountNodes(admin, offer);
  if (offerNodes.length === expectedTierCount) {
    return offerNodes
      .slice()
      .sort((left, right) => (left.title ?? "").localeCompare(right.title ?? ""))
      .map((node) => normalizeDiscountNodeId(node.id));
  }

  await deleteShopifyDiscounts(
    admin,
    offerNodes.map((node) => node.id),
  );

  return syncOfferDiscounts(admin, offer);
}

export async function applyOfferDiscountSync(
  admin: AdminApiContext,
  offer: SerializedOffer,
  existingDiscountIds: string[],
): Promise<string[]> {
  if (offer.status !== "active") {
    if (existingDiscountIds.length > 0) {
      await deleteShopifyDiscounts(admin, existingDiscountIds);
      await deleteOrphanedOfferDiscounts(admin, offer);
    }
    return [];
  }

  return replaceOfferDiscounts(admin, offer, existingDiscountIds);
}

export async function cleanupAllShopDiscounts(
  admin: AdminApiContext,
  shop: string,
) {
  const { listOffersRaw } = await import("./bundle.server");
  const offers = await listOffersRaw(shop);

  const ids = offers.flatMap((offer) => {
    try {
      return JSON.parse(offer.discountIds) as string[];
    } catch {
      return [];
    }
  });

  await deleteShopifyDiscounts(admin, ids);

  const nodes = await listAllAutomaticDiscountNodes(admin);
  const bundleStackIds = nodes
    .filter((node) => node.title?.startsWith("BundleStack "))
    .map((node) => node.id);

  await deleteShopifyDiscounts(admin, bundleStackIds);
}

function parseDiscountIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export { parseDiscountIds };
