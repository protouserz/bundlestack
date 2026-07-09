import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { DiscountTier } from "./bundle.server";

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

function discountTitleForTier(offerId: string, tier: DiscountTier): string {
  return `BundleStack ${offerId} · Qty ${tier.minQty}+ · ${tier.discountValue}% off`;
}

function percentageTierCount(offer: SerializedOffer): number {
  return offer.tiers.filter((tier) => tier.discountType === "percentage").length;
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
  }
}

async function deleteOrphanedOfferDiscounts(
  admin: AdminApiContext,
  offerId: string,
  excludeIds: string[] = [],
) {
  const response = await admin.graphql(
    `#graphql
      query listAutomaticDiscounts {
        discountNodes(first: 100) {
          nodes {
            id
            discount {
              ... on DiscountAutomaticBasic {
                title
              }
            }
          }
        }
      }`,
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "listAutomaticDiscounts");

  const nodes =
    (json.data?.discountNodes as { nodes?: Array<{ id: string; discount?: { title?: string } }> })
      ?.nodes ?? [];
  const marker = `BundleStack ${offerId}`;
  const legacyPrefix = "Buy more, save more · Buy";
  const exclude = new Set(excludeIds);

  const toDelete = nodes
    .filter((node) => {
      const title = node.discount?.title ?? "";
      return title.startsWith(marker) || title.startsWith(legacyPrefix);
    })
    .map((node) => node.id)
    .filter((id) => !exclude.has(id));

  await deleteShopifyDiscounts(admin, toDelete);
}

export async function syncOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
): Promise<string[]> {
  if (offer.status !== "active") {
    return [];
  }

  const expectedTierCount = percentageTierCount(offer);
  if (expectedTierCount === 0) {
    throw new Error("Add at least one percentage discount tier before activating.");
  }

  const startsAt = new Date().toISOString();
  const createdIds: string[] = [];

  for (const tier of offer.tiers) {
    if (tier.discountType !== "percentage") {
      continue;
    }

    const discountTitle = discountTitleForTier(offer.id, tier);
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
              appliesOnOneTimePurchase: true,
              appliesOnSubscription: false,
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
      throw new Error(
        userErrors.map((error) => error.message).join(", "),
      );
    }

    const id = payload?.automaticDiscountNode?.id;
    if (!id) {
      throw new Error(
        `Shopify did not return a discount ID for tier Qty ${tier.minQty}+.`,
      );
    }

    createdIds.push(id);
  }

  if (createdIds.length !== expectedTierCount) {
    await deleteShopifyDiscounts(admin, createdIds);
    throw new Error(
      `Expected ${expectedTierCount} Shopify discounts but created ${createdIds.length}.`,
    );
  }

  return createdIds;
}

export async function replaceOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
  existingDiscountIds: string[],
): Promise<string[]> {
  const newIds = await syncOfferDiscounts(admin, offer);

  await deleteShopifyDiscounts(admin, existingDiscountIds);
  await deleteOrphanedOfferDiscounts(admin, offer.id, newIds);

  return newIds;
}

export async function applyOfferDiscountSync(
  admin: AdminApiContext,
  offer: SerializedOffer,
  existingDiscountIds: string[],
): Promise<string[]> {
  if (offer.status !== "active") {
    if (existingDiscountIds.length > 0) {
      await deleteShopifyDiscounts(admin, existingDiscountIds);
      await deleteOrphanedOfferDiscounts(admin, offer.id);
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
  await deleteOrphanedOfferDiscountsForShop(admin);
}

async function deleteOrphanedOfferDiscountsForShop(admin: AdminApiContext) {
  const response = await admin.graphql(
    `#graphql
      query listAutomaticDiscounts {
        discountNodes(first: 100) {
          nodes {
            id
            discount {
              ... on DiscountAutomaticBasic {
                title
              }
            }
          }
        }
      }`,
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "listAutomaticDiscounts");

  const nodes =
    (json.data?.discountNodes as { nodes?: Array<{ id: string; discount?: { title?: string } }> })
      ?.nodes ?? [];

  const toDelete = nodes
    .filter((node) => node.discount?.title?.startsWith("BundleStack "))
    .map((node) => node.id);

  await deleteShopifyDiscounts(admin, toDelete);
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
