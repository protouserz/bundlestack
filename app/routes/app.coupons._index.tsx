import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, redirect, useLoaderData, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { EmptyState } from "../components/EmptyState";
import { CouponCard } from "../components/CouponCard";
import { PLAN_LABELS } from "../billing.plans";
import { assertCouponsPlanAccess } from "../models/coupon-access.server";
import {
  deleteAllCoupons,
  deleteCoupon,
  listCoupons,
  removeCouponRecord,
} from "../models/coupon.server";
import {
  cleanupCouponShopifyResources,
  deleteShopifyCollections,
  deleteShopifyDiscountCodes,
} from "../models/discount-code.server";
import { SButton, SPage } from "../components/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const access = await assertCouponsPlanAccess(session.shop, billing);

  if (!access.allowed) {
    return {
      coupons: [] as Awaited<ReturnType<typeof listCoupons>>,
      access: {
        ...access,
        planLabel: PLAN_LABELS[access.plan],
      },
    };
  }

  const coupons = await listCoupons(session.shop);
  return {
    coupons,
    access: {
      ...access,
      planLabel: PLAN_LABELS[access.plan],
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const access = await assertCouponsPlanAccess(session.shop, billing);
  if (!access.allowed) {
    return redirect("/app/billing");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const couponId = String(formData.get("couponId") ?? "");
    if (!couponId) {
      throw new Response("Missing coupon ID", { status: 400 });
    }

    const coupon = await deleteCoupon(session.shop, couponId);
    await cleanupCouponShopifyResources(admin, coupon);
    await removeCouponRecord(couponId, session.shop);
    return redirect("/app/coupons");
  }

  if (intent === "delete-all") {
    const coupons = await deleteAllCoupons(session.shop);
    const discountIds = coupons
      .map((coupon) => coupon.discountId)
      .filter((id): id is string => Boolean(id));
    await deleteShopifyDiscountCodes(admin, discountIds);
    const collectionIds = coupons
      .map((coupon) => coupon.eligibleCollectionId)
      .filter((id): id is string => Boolean(id));
    await deleteShopifyCollections(admin, collectionIds);
    return redirect("/app/coupons");
  }

  throw new Response("Unknown action", { status: 400 });
};

export default function CouponsIndex() {
  const { coupons, access } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  if (!access.allowed) {
    return (
      <SPage heading="Coupons">
        <s-banner tone="warning">
          <s-stack direction="block" gap="base">
            <s-text>
              Coupons are available on the <strong>Starter</strong>,{" "}
              <strong>Growth</strong>, and <strong>Pro</strong> plans. Your
              current plan is <strong>{access.planLabel}</strong>.
            </s-text>
            <SButton variant="primary" href="/app/billing">
              Upgrade to unlock coupons
            </SButton>
          </s-stack>
        </s-banner>
      </SPage>
    );
  }

  const handleDeleteAll = () => {
    submit({ intent: "delete-all" }, { method: "post" });
  };

  return (
    <SPage heading="Coupons">
      <SButton slot="primary-action" variant="primary" href="/app/coupons/new">
        Create coupon
      </SButton>

      <s-stack direction="block" gap="large">
        <s-box
          padding="large"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-stack direction="inline" gap="base">
            <s-text tone="neutral">
              Create checkout codes for percentage or fixed-amount discounts.
              Fixed-amount codes work like gift-card style credits at checkout
              (Shopify discount codes — not Gift Card balances). Included on{" "}
              {access.planLabel}.
            </s-text>
            {coupons.length > 0 ? (
              <SButton
                variant="secondary"
                tone="critical"
                command="--show"
                commandFor="delete-all-coupons-modal"
              >
                Delete all
              </SButton>
            ) : null}
          </s-stack>
        </s-box>

        {coupons.length === 0 ? (
          <EmptyState
            heading="No coupons yet"
            description='Create a code like "SAVE10" for 10% off, or a fixed-amount code for a gift-style checkout credit.'
            actionLabel="Create coupon"
            actionHref="/app/coupons/new"
          />
        ) : (
          <s-section
            heading={`${coupons.length} coupon${coupons.length === 1 ? "" : "s"}`}
          >
            <s-stack direction="block" gap="base">
              {coupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} showDelete />
              ))}
            </s-stack>
          </s-section>
        )}
      </s-stack>

      {coupons.length > 0 ? (
        <s-modal
          id="delete-all-coupons-modal"
          heading="Delete all coupons?"
          accessibilityLabel="Confirm deleting all coupons"
        >
          <s-stack direction="block" gap="base">
            <s-paragraph>
              This will permanently delete {coupons.length} coupon
              {coupons.length === 1 ? "" : "s"} and remove synced Shopify
              discount codes.
            </s-paragraph>
          </s-stack>

          <SButton
            slot="secondary-actions"
            variant="secondary"
            commandFor="delete-all-coupons-modal"
            command="--hide"
          >
            Cancel
          </SButton>
          <SButton
            slot="primary-action"
            variant="primary"
            tone="critical"
            onClick={handleDeleteAll}
          >
            Delete all
          </SButton>
        </s-modal>
      ) : null}

      <s-text tone="neutral">
        Need a higher plan?{" "}
        <Link to="/app/billing">View billing</Link>
      </s-text>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
