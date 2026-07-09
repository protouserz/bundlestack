import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { CouponDiscountType } from "./coupon.types";

type SerializedCoupon = {
  id: string;
  title: string;
  code: string;
  status: string;
  discountType: CouponDiscountType;
  discountValue: number;
  appliesOncePerCustomer: boolean;
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

async function createDiscountCode(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
): Promise<string> {
  const startsAt = (coupon.startsAt ?? new Date()).toISOString();
  const endsAt = coupon.endsAt ? coupon.endsAt.toISOString() : null;

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
        basicCodeDiscount: {
          title: `BundleStack Coupon · ${coupon.title}`,
          code: coupon.code,
          startsAt,
          endsAt,
          customerSelection: {
            all: true,
          },
          customerGets: {
            value: customerGetsValue(coupon),
            items: {
              all: true,
            },
          },
          usageLimit: coupon.usageLimit,
          appliesOncePerCustomer: coupon.appliesOncePerCustomer,
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: true,
          },
        },
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

export async function applyCouponDiscountSync(
  admin: AdminApiContext,
  coupon: SerializedCoupon,
  existingDiscountId: string | null,
): Promise<string | null> {
  if (existingDiscountId) {
    await deleteShopifyDiscountCodes(admin, [existingDiscountId]);
  }

  if (coupon.status !== "active") {
    return null;
  }

  return createDiscountCode(admin, coupon);
}

export async function cleanupAllShopCouponDiscounts(
  admin: AdminApiContext,
  shop: string,
) {
  const { listCoupons } = await import("./coupon.server");
  const coupons = await listCoupons(shop);
  const ids = coupons
    .map((coupon) => coupon.discountId)
    .filter((id): id is string => Boolean(id));

  await deleteShopifyDiscountCodes(admin, ids);
}
