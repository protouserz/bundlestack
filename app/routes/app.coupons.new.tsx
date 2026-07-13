import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  createCoupon,
  parseCouponForm,
  updateCouponDiscountId,
} from "../models/coupon.server";
import { applyCouponDiscountSync } from "../models/discount-code.server";
import { assertCouponsPlanAccess } from "../models/coupon-access.server";
import { CouponForm } from "../components/coupon-form/CouponForm";
import { SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const access = await assertCouponsPlanAccess(session.shop, billing);
  if (!access.allowed) {
    return redirect("/app/coupons");
  }
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const access = await assertCouponsPlanAccess(session.shop, billing);
  if (!access.allowed) {
    return redirect("/app/billing");
  }
  const formData = await request.formData();

  try {
    const input = parseCouponForm(formData);
    const coupon = await createCoupon(session.shop, input);
    const discountId = await applyCouponDiscountSync(admin, coupon, null);
    await updateCouponDiscountId(coupon.id, discountId);
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

export default function NewCoupon() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const isSaving = navigation.state === "submitting";

  return (
    <SPage heading="Create coupon">
      <Form
        key={formKey}
        method="post"
        className={styles.offerPage}
        onReset={() => setFormKey((current) => current + 1)}
      >
        <CouponForm
          key={formKey}
          mode="create"
          defaultTitle="Welcome discount"
          defaultCode="SAVE10"
          defaultStatus="active"
          defaultDiscountType="percentage"
          defaultDiscountValue={10}
          error={actionData?.error}
          isSaving={isSaving}
        />
      </Form>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
