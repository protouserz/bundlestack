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

function discountTitleForTier(offerId: string, tier: DiscountTier): string {
  return `BundleStack ${offerId} · Qty ${tier.minQty}+ · ${tier.discountValue}% off`;
}

export async function deleteShopifyDiscounts(
  admin: AdminApiContext,
  discountIds: string[],
) {
  for (const id of discountIds) {
    await admin.graphql(
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
  }
}

async function deleteOrphanedOfferDiscounts(
  admin: AdminApiContext,
  offerId: string,
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

  const json = await response.json();
  const nodes = json.data?.discountNodes?.nodes ?? [];
  const marker = `BundleStack ${offerId}`;
  const legacyPrefix = "Buy more, save more · Buy";

  const toDelete = nodes
    .filter((node: { discount?: { title?: string } }) => {
      const title = node.discount?.title ?? "";
      return title.startsWith(marker) || title.startsWith(legacyPrefix);
    })
    .map((node: { id: string }) => node.id);

  await deleteShopifyDiscounts(admin, toDelete);
}

export async function syncOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
): Promise<string[]> {
  if (offer.status !== "active") {
    return [];
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

    const json = await response.json();
    const errors =
      json.data?.discountAutomaticBasicCreate?.userErrors ?? [];
    if (errors.length > 0) {
      throw new Error(errors.map((e: { message: string }) => e.message).join(", "));
    }

    const id = json.data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id;
    if (id) {
      createdIds.push(id);
    }
  }

  return createdIds;
}

export async function replaceOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
  existingDiscountIds: string[],
): Promise<string[]> {
  await deleteShopifyDiscounts(admin, existingDiscountIds);
  await deleteOrphanedOfferDiscounts(admin, offer.id);

  return syncOfferDiscounts(admin, offer);
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
