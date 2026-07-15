import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { DiscountTier } from "./bundle.server";
import {
  listAllAutomaticDiscountNodes,
  normalizeDiscountNodeId,
  toDiscountAutomaticNodeId,
} from "../utils/graphql.server";

const FUNCTION_HANDLE = "bundlestack-qb-discount";
const METAFIELD_NAMESPACE = "$app:bundlestack-qb-discount";
const METAFIELD_KEY = "function-configuration";

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

export function appDiscountTitle(offer: SerializedOffer): string {
  const name = offer.title.trim() || "Volume discount";
  return `BundleStack ${offer.id} · ${name}`;
}

/** Titles we used before migrating to a single App Function discount per offer. */
function plannedLegacyBasicTitles(offer: SerializedOffer): Set<string> {
  const name = offer.title.trim() || "Volume discount";
  return new Set(
    percentageTiers(offer).map(
      (tier) => `Buy ${tier.minQty}+, save ${tier.discountValue}% · ${name}`,
    ),
  );
}

export function isOfferDiscountTitle(
  title: string,
  offer: SerializedOffer,
  plannedTitles: Set<string> = plannedLegacyBasicTitles(offer),
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

function functionConfigurationValue(offer: SerializedOffer) {
  const tiers = percentageTiers(offer).map((tier) => ({
    minQty: tier.minQty,
    discountValue: tier.discountValue,
  }));

  return JSON.stringify({
    productIds: offer.productIds,
    tiers,
  });
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
      { variables: { id: toDiscountAutomaticNodeId(id) } },
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
        throw new Error(userErrors.map((error) => error.message).join(", "));
      }
    }
  }
}

async function findOfferDiscountNodes(
  admin: AdminApiContext,
  offer: SerializedOffer,
) {
  const plannedTitles = plannedLegacyBasicTitles(offer);
  const nodes = await listAllAutomaticDiscountNodes(admin);

  return nodes.filter(
    (node) =>
      node.title && isOfferDiscountTitle(node.title, offer, plannedTitles),
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

async function ensureQuantityBreakFunctionAvailable(
  admin: AdminApiContext,
): Promise<void> {
  const response = await admin.graphql(
    `#graphql
      query quantityBreakFunctions($first: Int!) {
        shopifyFunctions(first: $first, apiType: "discount") {
          nodes {
            id
            handle
            title
            apiType
          }
        }
      }`,
    { variables: { first: 50 } },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "shopifyFunctions");

  const nodes =
    (
      json.data?.shopifyFunctions as
        | {
            nodes?: Array<{
              id?: string;
              handle?: string;
              title?: string;
            }>;
          }
        | undefined
    )?.nodes ?? [];

  const match =
    nodes.find((node) => node.handle === FUNCTION_HANDLE) ??
    nodes.find((node) =>
      (node.title ?? "").toLowerCase().includes("quantity break"),
    );

  if (!match?.handle && !match?.id) {
    const available = nodes
      .map((node) => node.handle || node.title || node.id)
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Quantity-break Function "${FUNCTION_HANDLE}" is not available on this shop` +
        (available ? ` (found: ${available})` : "") +
        ". If you see a \"dev previews\" badge, restart `npm run dev` so the Function is included, or exit the preview and use the released app version.",
    );
  }
}

async function createAppAutomaticDiscount(
  admin: AdminApiContext,
  offer: SerializedOffer,
): Promise<string> {
  const title = appDiscountTitle(offer);
  const startsAt = new Date().toISOString();
  await ensureQuantityBreakFunctionAvailable(admin);

  const response = await admin.graphql(
    `#graphql
      mutation discountAutomaticAppCreate(
        $automaticAppDiscount: DiscountAutomaticAppInput!
      ) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            discountId
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        automaticAppDiscount: {
          title,
          functionHandle: FUNCTION_HANDLE,
          discountClasses: ["PRODUCT"],
          startsAt,
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: functionConfigurationValue(offer),
            },
          ],
        },
      },
    },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "discountAutomaticAppCreate");

  const payload = json.data?.discountAutomaticAppCreate as
    | {
        userErrors?: Array<{ message: string }>;
        automaticAppDiscount?: { discountId?: string };
      }
    | undefined;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  const id = payload?.automaticAppDiscount?.discountId;
  if (!id) {
    throw new Error("Shopify did not return an app discount ID.");
  }

  return normalizeDiscountNodeId(id);
}

async function updateAppAutomaticDiscount(
  admin: AdminApiContext,
  discountId: string,
  offer: SerializedOffer,
): Promise<string> {
  const title = appDiscountTitle(offer);

  const response = await admin.graphql(
    `#graphql
      mutation discountAutomaticAppUpdate(
        $id: ID!
        $automaticAppDiscount: DiscountAutomaticAppInput!
      ) {
        discountAutomaticAppUpdate(
          id: $id
          automaticAppDiscount: $automaticAppDiscount
        ) {
          automaticAppDiscount {
            discountId
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        id: toDiscountAutomaticNodeId(discountId),
        automaticAppDiscount: {
          title,
          discountClasses: ["PRODUCT"],
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: functionConfigurationValue(offer),
            },
          ],
        },
      },
    },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "discountAutomaticAppUpdate");

  const payload = json.data?.discountAutomaticAppUpdate as
    | {
        userErrors?: Array<{ message: string }>;
        automaticAppDiscount?: { discountId?: string };
      }
    | undefined;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  return normalizeDiscountNodeId(
    payload?.automaticAppDiscount?.discountId ?? discountId,
  );
}

export async function syncOfferDiscounts(
  admin: AdminApiContext,
  offer: SerializedOffer,
): Promise<string[]> {
  if (offer.status !== "active") {
    return [];
  }

  if (percentageTiers(offer).length === 0) {
    throw new Error(
      "Add at least one percentage discount tier before activating.",
    );
  }

  const id = await createAppAutomaticDiscount(admin, offer);
  return [id];
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
  if (percentageTiers(offer).length === 0) {
    return [];
  }

  // Prefer in-place update of the single App Function discount.
  if (existingDiscountIds.length === 1) {
    try {
      const updatedId = await updateAppAutomaticDiscount(
        admin,
        existingDiscountIds[0],
        offer,
      );
      // Clean any leftover legacy Basic per-tier discounts for this offer.
      const orphans = await findOfferDiscountNodes(admin, offer);
      const orphanIds = orphans
        .map((node) => normalizeDiscountNodeId(node.id))
        .filter((id) => id !== updatedId);
      if (orphanIds.length > 0) {
        await deleteShopifyDiscounts(admin, orphanIds);
      }
      return [updatedId];
    } catch {
      // Fall through to recreate.
    }
  }

  await deleteShopifyDiscounts(admin, existingDiscountIds);
  await deleteOrphanedOfferDiscounts(admin, offer);
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
