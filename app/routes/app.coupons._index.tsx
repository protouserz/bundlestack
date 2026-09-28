import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useLoaderData, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { CouponCard } from "../components/CouponCard";
import { PLAN_LABELS } from "../billing.plans";
import { assertCouponsPlanAccess } from "../models/coupon-access.server";
import {
  deleteAllCoupons,
  deleteCoupon,
  listCoupons,
  removeCouponRecord,
} from "../models/coupon.server";
import { deleteShopifyDiscountCodes } from "../models/discount-code.server";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/promotions/promotions.module.css";

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
    if (coupon.discountId) {
      await deleteShopifyDiscountCodes(admin, [coupon.discountId]);
    }
    await removeCouponRecord(couponId);
    return redirect("/app/coupons");
  }

  if (intent === "delete-all") {
    const coupons = await deleteAllCoupons(session.shop);
    const discountIds = coupons
      .map((coupon) => coupon.discountId)
      .filter((id): id is string => Boolean(id));
    await deleteShopifyDiscountCodes(admin, discountIds);
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
              Coupons are included on the <strong>Pro</strong> plan. Your
              current plan is <strong>{access.planLabel}</strong>.
            </s-text>
            <SButton variant="primary" href="/app/billing">
              Upgrade to Pro
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

      <div className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.introCopy}>
            Checkout codes for a percentage or a fixed amount off. Shoppers
            enter the code at checkout — these are Shopify discount codes, not
            gift-card balances.
          </p>
          {coupons.length > 0 ? (
            <SButton
              variant="tertiary"
              tone="critical"
              command="--show"
              commandFor="delete-all-coupons-modal"
            >
              Delete all
            </SButton>
          ) : (
            <span className={styles.introCount}>No codes yet</span>
          )}
        </div>

        {coupons.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Create your first code</p>
            <p className={styles.emptyBody}>
              Try something shoppers will remember, like SAVE10 for 10% off, or
              a fixed amount for a gift-style credit at checkout.
            </p>
            <span className={styles.ticket}>SAVE10</span>
            <SButton variant="primary" href="/app/coupons/new">
              Create coupon
            </SButton>
          </div>
        ) : (
          <div className={styles.list}>
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} showDelete />
            ))}
          </div>
        )}
      </div>

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
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
