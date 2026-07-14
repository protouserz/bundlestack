import { useEffect, useRef, useState } from "react";
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
  removeCouponRecord,
  updateCouponDiscountId,
} from "../models/coupon.server";
import {
  applyCouponDiscountSync,
  isShopifyCodeUniqueError,
} from "../models/discount-code.server";
import {
  clearCouponCodeOwners,
  findCouponCodeConflict,
  couponOverwriteFromUniqueError,
} from "../models/coupon-code-conflict.server";
import { assertCouponsPlanAccess } from "../models/coupon-access.server";
import { CouponForm } from "../components/coupon-form/CouponForm";
import { CouponCodeOverwriteModal } from "../components/CouponCodeOverwriteModal";
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
  const confirmOverwrite =
    String(formData.get("confirmOverwrite") ?? "") === "true";

  try {
    const input = parseCouponForm(formData);

    const conflict = await findCouponCodeConflict(
      admin,
      session.shop,
      input.code,
    );
    if (conflict && !confirmOverwrite) {
      return { needsOverwrite: conflict };
    }
    if (conflict && confirmOverwrite) {
      await clearCouponCodeOwners(admin, session.shop, input.code);
    }

    const coupon = await createCoupon(session.shop, input);
    try {
      const discountId = await applyCouponDiscountSync(admin, coupon, null);
      await updateCouponDiscountId(coupon.id, discountId, session.shop);
    } catch (syncError) {
      if (
        syncError instanceof Error &&
        isShopifyCodeUniqueError(syncError.message) &&
        !confirmOverwrite
      ) {
        await removeCouponRecord(coupon.id, session.shop);
        return {
          needsOverwrite: couponOverwriteFromUniqueError(
            input.code,
            syncError.message,
          ),
        };
      }
      throw syncError;
    }
    return redirect("/app/coupons");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      const formCode = String(formData.get("code") ?? "this code").toUpperCase();
      return {
        needsOverwrite: couponOverwriteFromUniqueError(
          formCode.replace(/\s+/g, ""),
          "Code must be unique",
        ),
      };
    }
    if (error instanceof Response) {
      return { error: await error.text() };
    }
    if (error instanceof Error) {
      if (isShopifyCodeUniqueError(error.message)) {
        const formCode = String(formData.get("code") ?? "").toUpperCase();
        return {
          needsOverwrite: couponOverwriteFromUniqueError(
            formCode.replace(/\s+/g, "") || "this code",
            error.message,
          ),
        };
      }
      return { error: error.message };
    }
    throw error;
  }
};

export default function NewCoupon() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isSaving = navigation.state === "submitting";
  const conflict = actionData?.needsOverwrite;

  useEffect(() => {
    if (!confirmOverwrite) return;
    formRef.current?.requestSubmit();
  }, [confirmOverwrite]);

  return (
    <SPage heading="Create coupon">
      <Form
        ref={formRef}
        key={formKey}
        method="post"
        className={styles.offerPage}
        onReset={() => {
          setFormKey((current) => current + 1);
          setConfirmOverwrite(false);
        }}
      >
        {confirmOverwrite ? (
          <input type="hidden" name="confirmOverwrite" value="true" />
        ) : null}
        <CouponForm
          key={formKey}
          mode="create"
          defaultTitle="Welcome discount"
          defaultCode="SAVE10"
          defaultStatus="active"
          defaultDiscountType="percentage"
          defaultDiscountValue={10}
          error={
            actionData && "error" in actionData
              ? actionData.error
              : conflict && !confirmOverwrite
                ? "That code is already in use. Confirm replace in the dialog, or pick a different code."
                : undefined
          }
          isSaving={isSaving}
        />
      </Form>

      <CouponCodeOverwriteModal
        conflict={!confirmOverwrite ? conflict : null}
        isSaving={isSaving}
        onConfirm={() => setConfirmOverwrite(true)}
      />
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
