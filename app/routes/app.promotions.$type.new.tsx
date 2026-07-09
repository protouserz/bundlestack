import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { PromotionFormShell } from "../components/promotion-form/PromotionFormShell";
import {
  createPromotion,
  parsePromotionForm,
  updatePromotionDiscountIds,
} from "../models/promotion.server";
import { applyPromotionDiscountSync } from "../models/promotion-sync.server";
import { promotionTypeFromSlug } from "../models/promotion-routes";
import { PROMOTION_TYPE_META } from "../models/promotion.types";
import { SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const promotionType = promotionTypeFromSlug(params.type);
  if (!promotionType) {
    throw new Response("Not found", { status: 404 });
  }
  return { promotionType };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const promotionType = promotionTypeFromSlug(params.type);
  if (!promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();

  try {
    const input = parsePromotionForm(formData, promotionType);
    const promotion = await createPromotion(session.shop, input);
    const discountIds = await applyPromotionDiscountSync(admin, promotion, []);
    await updatePromotionDiscountIds(promotion.id, discountIds);
    return redirect(PROMOTION_TYPE_META[promotionType].href);
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

export default function NewPromotion() {
  const { promotionType } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const meta = PROMOTION_TYPE_META[promotionType];
  const isSaving = navigation.state === "submitting";

  return (
    <SPage heading={`Create ${meta.label}`}>
      <Form
        key={formKey}
        method="post"
        className={styles.offerPage}
        onReset={() => setFormKey((current) => current + 1)}
      >
        <PromotionFormShell
          key={formKey}
          mode="create"
          promotionType={promotionType}
          listHref={meta.href}
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
