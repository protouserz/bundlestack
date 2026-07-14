import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { CouponAppliesTo, CouponDiscountType } from "./coupon.types";
import {
  filterEligibleProductIds,
  updateCouponEligibleCollectionId,
} from "./coupon.server";

type SerializedCoupon = {
  id: string;
  shop?: string;
  title: string;
  code: string;
  status: string;
  discountType: CouponDiscountType;
  discountValue: number;
  appliesOncePerCustomer: boolean;
  appliesTo: CouponAppliesTo;
  productIds: string[];
  excludedProductIds: string[];
  eligibleCollectionId?: string | null;
  usageLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  discountId?: string | null;
};

type GraphqlResponse = {
  errors?: Array<{ message: string }>;
  data?: Record<string, unknown>;
};

function assertGraphqlOk(json: GraphqlResponse, context: string) {
  if (json.errors?.length) {
    throw new Error(
      `${context}: ${json.errors.map((error) => error.message).join(", ")}`,
    );
  }
}

export async function deleteShopifyDiscountCodes(
  admin: AdminApiContext,
  discountIds: string[],
) {
  for (const id of discountIds) {
    if (!id) continue;

    const response = await admin.graphql(
      `#graphql
        mutation discountCodeDelete($id: ID!) {
          discountCodeDelete(id: $id) {
            deletedCodeDiscountId
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { id } },
    );

    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "discountCodeDelete");

    const payload = json.data?.discountCodeDelete as
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

export async function findShopifyDiscountByCode(
  admin: AdminApiContext,
  code: string,
): Promise<{ id: string; title: string | null } | null> {
  const response = await admin.graphql(
    `#graphql
      query couponCodeDiscountByCode($code: String!) {
        codeDiscountNodeByCode(code: $code) {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
            }
            ... on DiscountCodeBxgy {
              title
            }
            ... on DiscountCodeFreeShipping {
              title
            }
            ... on DiscountCodeApp {
              title
            }
          }
        }
      }`,
    { variables: { code } },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "codeDiscountNodeByCode");

  const node = json.data?.codeDiscountNodeByCode as
    | {
        id?: string;
        codeDiscount?: { title?: string } | null;
      }
    | null
    | undefined;

  if (!node?.id) return null;
  return {
    id: node.id,
    title: node.codeDiscount?.title ?? null,
  };
}

export function isShopifyCodeUniqueError(message: string) {
  return /code must be unique|code.*already (exists|taken)|unique.*code/i.test(
    message,
  );
}

export async function deleteShopifyCollections(
  admin: AdminApiContext,
  collectionIds: string[],
) {
  for (const id of collectionIds) {
    if (!id) continue;

    const response = await admin.graphql(
      `#graphql
        mutation collectionDelete($input: CollectionDeleteInput!) {
          collectionDelete(input: $input) {
            deletedCollectionId
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { input: { id } } },
    );

    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "collectionDelete");

    const payload = json.data?.collectionDelete as
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

function customerGetsValue(coupon: SerializedCoupon) {
  if (coupon.discountType === "percentage") {
    return { percentage: coupon.discountValue / 100 };
  }

  return {
    discountAmount: {
      amount: coupon.discountValue.toFixed(2),
      appliesOnEachItem: false,
    },
  };
}

/** Build customerGets.items for a coupon (pure; collection id must already exist). */
export function buildCustomerGetsItems(coupon: {
  appliesTo: CouponAppliesTo;
  productIds: string[];
  excludedProductIds: string[];
  eligibleCollectionId?: string | null;
}): Record<string, unknown> {
  if (coupon.appliesTo === "products") {
    return {
      products: {
        productsToAdd: coupon.productIds,
      },
    };
  }

  if (coupon.excludedProductIds.length === 0) {
    return { all: true };
  }

  if (!coupon.eligibleCollectionId) {
    throw new Error(
      "Eligible collection is required when storewide exclusions are set.",
    );
  }

  return {
    collections: {
      collectionsToAdd: [coupon.eligibleCollectionId],
    },
  };
}

async function listAllProductIds(admin: AdminApiContext): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;

  for (;;) {
    const response = await admin.graphql(
      `#graphql
        query couponEligibleProducts($cursor: String) {
          products(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
            }
          }
        }`,
      { variables: { cursor } },
    );

    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "couponEligibleProducts");

    const products = json.data?.products as
      | {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          nodes?: Array<{ id?: string }>;
        }
      | undefined;

    for (const node of products?.nodes ?? []) {
      if (node.id) ids.push(node.id);
    }

    if (!products?.pageInfo?.hasNextPage || !products.pageInfo.endCursor) {
      break;
    }
    cursor = products.pageInfo.endCursor;
  }

  return ids;
}

async function listCollectionProductIds(
  admin: AdminApiContext,
  collectionId: string,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;

  for (;;) {
    const response = await admin.graphql(
      `#graphql
        query couponCollectionProducts($id: ID!, $cursor: String) {
          collection(id: $id) {
            products(first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
              }
            }
          }
        }`,
      { variables: { id: collectionId, cursor } },
    );

    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "couponCollectionProducts");

    const collection = json.data?.collection as
      | {
          products?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
            nodes?: Array<{ id?: string }>;
          };
        }
      | null
      | undefined;

    if (!collection) {
      throw new Error("Eligible collection was not found in Shopify.");
    }

    for (const node of collection.products?.nodes ?? []) {
      if (node.id) ids.push(node.id);
    }

    const pageInfo = collection.products?.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) {
      break;
    }
    cursor = pageInfo.endCursor;
  }

  return ids;
}

async function createEligibleCollection(
  admin: AdminApiContext,
  code: string,
): Promise<string> {
  const response = await admin.graphql(
    `#graphql
      mutation couponEligibleCollectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
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
        input: {
          title: `BundleStack · ${code} · eligible`,
          descriptionHtml:
            "<p>Managed by BundleStack for coupon product exclusions. Do not edit manually.</p>",
        },
      },
    },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "collectionCreate");

  const payload = json.data?.collectionCreate as
    | {
        userErrors?: Array<{ message: string }>;
        collection?: { id?: string };
      }
    | undefined;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  const id = payload?.collection?.id;
  if (!id) {
    throw new Error("Shopify did not return an eligible collection ID.");
  }
  return id;
}

async function syncCollectionProducts(
  admin: AdminApiContext,
  collectionId: string,
  desiredProductIds: string[],
) {
  const current = await listCollectionProductIds(admin, collectionId);
  const desired = new Set(desiredProductIds);
  const currentSet = new Set(current);

  const toAdd = desiredProductIds.filter((id) => !currentSet.has(id));
  const toRemove = current.filter((id) => !desired.has(id));

  const BATCH = 50;

  for (let i = 0; i < toAdd.length; i += BATCH) {
    const chunk = toAdd.slice(i, i + BATCH);
    const response = await admin.graphql(
      `#graphql
        mutation couponCollectionAddProducts($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(id: $id, productIds: $productIds) {
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { id: collectionId, productIds: chunk } },
    );
    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "collectionAddProducts");
    const payload = json.data?.collectionAddProducts as
      | { userErrors?: Array<{ message: string }> }
      | undefined;
    const userErrors = payload?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(userErrors.map((error) => error.message).join(", "));
    }
  }

  for (let i = 0; i < toRemove.length; i += BATCH) {
    const chunk = toRemove.slice(i, i + BATCH);
    const response = await admin.graphql(
      `#graphql
        mutation couponCollectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
          collectionRemoveProducts(id: $id, productIds: $productIds) {
            userErrors {
              field
              message
            }
          }
        }`,
      { variables: { id: collectionId, productIds: chunk } },
    );
    const json = (await response.json()) as GraphqlResponse;
    assertGraphqlOk(json, "collectionRemoveProducts");
    const payload = json.data?.collectionRemoveProducts as
      | { userErrors?: Array<{ message: string }> }
      | undefined;
    const userErrors = payload?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(userErrors.map((error) => error.message).join(", "));
    }
  }
}

async function ensureEligibleCollection(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
): Promise<string> {
  const catalogIds = await listAllProductIds(admin);
  const eligibleIds = filterEligibleProductIds(
    catalogIds,
    coupon.excludedProductIds,
  );

  if (eligibleIds.length === 0) {
    throw new Error(
      "Every product is excluded. Leave at least one product eligible for this coupon.",
    );
  }

  let collectionId = coupon.eligibleCollectionId ?? null;
  if (!collectionId) {
    collectionId = await createEligibleCollection(admin, coupon.code);
  }

  await syncCollectionProducts(admin, collectionId, eligibleIds);
  await updateCouponEligibleCollectionId(
    coupon.id,
    collectionId,
    coupon.shop,
  );
  return collectionId;
}

async function clearEligibleCollectionIfAny(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
) {
  if (!coupon.eligibleCollectionId) return;
  await deleteShopifyCollections(admin, [coupon.eligibleCollectionId]);
  await updateCouponEligibleCollectionId(coupon.id, null, coupon.shop);
}

function basicCodeDiscountInput(
  coupon: SerializedCoupon,
  syncCoupon: SerializedCoupon,
) {
  const startsAt = (coupon.startsAt ?? new Date()).toISOString();
  const endsAt = coupon.endsAt ? coupon.endsAt.toISOString() : null;

  return {
    title: `BundleStack Coupon · ${coupon.title}`,
    code: coupon.code,
    startsAt,
    endsAt,
    customerSelection: {
      all: true,
    },
    customerGets: {
      value: customerGetsValue(coupon),
      items: buildCustomerGetsItems(syncCoupon),
    },
    usageLimit: coupon.usageLimit,
    appliesOncePerCustomer: coupon.appliesOncePerCustomer,
    combinesWith: {
      orderDiscounts: true,
      productDiscounts: true,
      shippingDiscounts: true,
    },
  };
}

async function prepareCouponForSync(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
): Promise<SerializedCoupon> {
  if (coupon.appliesTo === "all" && coupon.excludedProductIds.length > 0) {
    const eligibleCollectionId = await ensureEligibleCollection(admin, coupon);
    return { ...coupon, eligibleCollectionId };
  }

  if (coupon.eligibleCollectionId) {
    await clearEligibleCollectionIfAny(admin, coupon);
    return { ...coupon, eligibleCollectionId: null };
  }

  return coupon;
}

async function createDiscountCode(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
): Promise<string> {
  const syncCoupon = await prepareCouponForSync(admin, coupon);

  const response = await admin.graphql(
    `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
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
        basicCodeDiscount: basicCodeDiscountInput(coupon, syncCoupon),
      },
    },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "discountCodeBasicCreate");

  const payload = json.data?.discountCodeBasicCreate as
    | {
        userErrors?: Array<{ message: string }>;
        codeDiscountNode?: { id?: string };
      }
    | undefined;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  const id = payload?.codeDiscountNode?.id;
  if (!id) {
    throw new Error("Shopify did not return a discount code ID.");
  }

  return id;
}

async function updateDiscountCode(
  admin: AdminApiContext,
  discountId: string,
  coupon: SerializedCoupon,
): Promise<string> {
  const syncCoupon = await prepareCouponForSync(admin, coupon);

  const response = await admin.graphql(
    `#graphql
      mutation discountCodeBasicUpdate(
        $id: ID!
        $basicCodeDiscount: DiscountCodeBasicInput!
      ) {
        discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
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
        id: discountId,
        basicCodeDiscount: basicCodeDiscountInput(coupon, syncCoupon),
      },
    },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "discountCodeBasicUpdate");

  const payload = json.data?.discountCodeBasicUpdate as
    | {
        userErrors?: Array<{ message: string }>;
        codeDiscountNode?: { id?: string };
      }
    | undefined;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  return payload?.codeDiscountNode?.id ?? discountId;
}

export async function applyCouponDiscountSync(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
  existingDiscountId: string | null,
): Promise<string | null> {
  if (coupon.status !== "active") {
    if (existingDiscountId) {
      await deleteShopifyDiscountCodes(admin, [existingDiscountId]);
    }
    await clearEligibleCollectionIfAny(admin, coupon);
    return null;
  }

  // Prefer in-place update so a failed sync cannot leave the code deleted.
  if (existingDiscountId) {
    try {
      return await updateDiscountCode(admin, existingDiscountId, coupon);
    } catch {
      await deleteShopifyDiscountCodes(admin, [existingDiscountId]);
      return createDiscountCode(admin, coupon);
    }
  }

  return createDiscountCode(admin, coupon);
}

export async function cleanupCouponShopifyResources(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
) {
  if (coupon.discountId) {
    await deleteShopifyDiscountCodes(admin, [coupon.discountId]);
  }
  if (coupon.eligibleCollectionId) {
    await deleteShopifyCollections(admin, [coupon.eligibleCollectionId]);
  }
}

export async function cleanupAllShopCouponDiscounts(
  admin: AdminApiContext,
  shop: string,
) {
  const { listCoupons } = await import("./coupon.server");
  const coupons = await listCoupons(shop);

  const discountIds = coupons
    .map((coupon) => coupon.discountId)
    .filter((id): id is string => Boolean(id));
  await deleteShopifyDiscountCodes(admin, discountIds);

  const collectionIds = coupons
    .map((coupon) => coupon.eligibleCollectionId)
    .filter((id): id is string => Boolean(id));
  await deleteShopifyCollections(admin, collectionIds);
}
