import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  deleteCoupon,
  getCoupon,
  parseCouponForm,
  removeCouponRecord,
  updateCoupon,
  updateCouponDiscountId,
} from "../models/coupon.server";
import {
  applyCouponDiscountSync,
  deleteShopifyDiscountCodes,
} from "../models/discount-code.server";
import { CouponForm } from "../components/coupon-form/CouponForm";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const coupon = await getCoupon(session.shop, params.id!);

  if (!coupon) {
    throw new Response("Not found", { status: 404 });
  }

  return { coupon };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const coupon = await deleteCoupon(session.shop, params.id!);
    if (coupon.discountId) {
      await deleteShopifyDiscountCodes(admin, [coupon.discountId]);
    }
    await removeCouponRecord(params.id!);
    return redirect("/app/coupons");
  }

  try {
    const existing = await getCoupon(session.shop, params.id!);
    if (!existing) {
      throw new Response("Not found", { status: 404 });
    }

    const input = parseCouponForm(formData);
    const updated = await updateCoupon(session.shop, params.id!, input);
    const discountId = await applyCouponDiscountSync(
      admin,
      updated,
      existing.discountId,
    );
    await updateCouponDiscountId(params.id!, discountId);
    return redirect("/app/coupons");
  } catch (error) {
    if (error instanceof Response) {
      return { error: await error.text() };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
};

export default function EditCoupon() {
  const { coupon } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const isDeleting = deleteFetcher.state !== "idle";
  const isSaving = navigation.state === "submitting";

  return (
    <SPage heading="Edit coupon">
      <Form
        key={formKey}
        method="post"
        className={styles.offerPage}
        onReset={() => setFormKey((current) => current + 1)}
      >
        <CouponForm
          key={formKey}
          mode="edit"
          defaultTitle={coupon.title}
          defaultCode={coupon.code}
          defaultStatus={coupon.status}
          defaultDiscountType={coupon.discountType}
          defaultDiscountValue={coupon.discountValue}
          defaultAppliesOncePerCustomer={coupon.appliesOncePerCustomer}
          defaultUsageLimit={coupon.usageLimit}
          defaultStartsAt={
            coupon.startsAt ? new Date(coupon.startsAt).toISOString() : null
          }
          defaultEndsAt={
            coupon.endsAt ? new Date(coupon.endsAt).toISOString() : null
          }
          error={actionData?.error}
          isSaving={isSaving}
          deleteButton={
            <SButton
              type="button"
              tone="critical"
              variant="tertiary"
              {...(isDeleting ? { loading: true } : {})}
              onClick={() =>
                deleteFetcher.submit({ intent: "delete" }, { method: "post" })
              }
            >
              Delete coupon
            </SButton>
          }
        />
      </Form>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
