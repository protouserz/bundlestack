import { useEffect, useRef, useState } from "react";
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
import { assertCouponsPlanAccess } from "../models/coupon-access.server";
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
  cleanupCouponShopifyResources,
  isShopifyCodeUniqueError,
} from "../models/discount-code.server";
import {
  clearCouponCodeOwners,
  couponOverwriteFromUniqueError,
  findCouponCodeConflict,
} from "../models/coupon-code-conflict.server";
import { fetchProductTitles } from "../models/bundle.server";
import { CouponForm } from "../components/coupon-form/CouponForm";
import { CouponCodeOverwriteModal } from "../components/CouponCodeOverwriteModal";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const access = await assertCouponsPlanAccess(session.shop, billing);
  if (!access.allowed) {
    return redirect("/app/coupons");
  }

  const coupon = await getCoupon(session.shop, params.id!);

  if (!coupon) {
    throw new Response("Not found", { status: 404 });
  }

  const productIds =
    coupon.appliesTo === "products"
      ? coupon.productIds
      : coupon.excludedProductIds;
  const products = await fetchProductTitles(admin, productIds);

  return {
    coupon,
    products:
      coupon.appliesTo === "products"
        ? products
        : ([] as Awaited<ReturnType<typeof fetchProductTitles>>),
    excludedProducts:
      coupon.appliesTo === "all"
        ? products
        : ([] as Awaited<ReturnType<typeof fetchProductTitles>>),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const access = await assertCouponsPlanAccess(session.shop, billing);
  if (!access.allowed) {
    return redirect("/app/billing");
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const confirmOverwrite =
    String(formData.get("confirmOverwrite") ?? "") === "true";

  if (intent === "delete") {
    const coupon = await deleteCoupon(session.shop, params.id!);
    await cleanupCouponShopifyResources(admin, coupon);
    await removeCouponRecord(params.id!, session.shop);
    return redirect("/app/coupons");
  }

  try {
    const existing = await getCoupon(session.shop, params.id!);
    if (!existing) {
      throw new Response("Not found", { status: 404 });
    }

    const input = parseCouponForm(formData);
    const conflict = await findCouponCodeConflict(
      admin,
      session.shop,
      input.code,
      {
        excludeCouponId: existing.id,
        excludeDiscountId: existing.discountId,
      },
    );
    if (conflict && !confirmOverwrite) {
      return { needsOverwrite: conflict };
    }
    if (conflict && confirmOverwrite) {
      await clearCouponCodeOwners(admin, session.shop, input.code, {
        excludeCouponId: existing.id,
        excludeDiscountId: existing.discountId,
      });
    }

    const updated = await updateCoupon(session.shop, params.id!, input);
    try {
      const discountId = await applyCouponDiscountSync(
        admin,
        updated,
        existing.discountId,
      );
      await updateCouponDiscountId(params.id!, discountId, session.shop);
    } catch (syncError) {
      if (
        syncError instanceof Error &&
        isShopifyCodeUniqueError(syncError.message) &&
        !confirmOverwrite
      ) {
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

export default function EditCoupon() {
  const { coupon, products, excludedProducts } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isDeleting = deleteFetcher.state !== "idle";
  const isSaving = navigation.state === "submitting";
  const conflict = actionData?.needsOverwrite;

  useEffect(() => {
    if (!confirmOverwrite) return;
    formRef.current?.requestSubmit();
  }, [confirmOverwrite]);

  return (
    <SPage heading="Edit coupon">
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
          mode="edit"
          defaultTitle={coupon.title}
          defaultCode={coupon.code}
          defaultStatus={coupon.status}
          defaultDiscountType={coupon.discountType}
          defaultDiscountValue={coupon.discountValue}
          defaultAppliesOncePerCustomer={coupon.appliesOncePerCustomer}
          defaultAppliesTo={coupon.appliesTo}
          defaultProducts={products}
          defaultExcludedProducts={excludedProducts}
          defaultUsageLimit={coupon.usageLimit}
          defaultStartsAt={
            coupon.startsAt ? new Date(coupon.startsAt).toISOString() : null
          }
          defaultEndsAt={
            coupon.endsAt ? new Date(coupon.endsAt).toISOString() : null
          }
          error={
            actionData && "error" in actionData
              ? actionData.error
              : conflict && !confirmOverwrite
                ? "That code is already in use. Confirm replace in the dialog, or pick a different code."
                : undefined
          }
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
