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
import { PromotionFormShell } from "../components/promotion-form/PromotionFormShell";
import {
  deletePromotion,
  getPromotion,
  parsePromotionForm,
  removePromotionRecord,
  updatePromotion,
  updatePromotionDiscountIds,
} from "../models/promotion.server";
import { applyPromotionDiscountSync } from "../models/promotion-sync.server";
import { promotionTypeFromSlug } from "../models/promotion-routes";
import { PROMOTION_TYPE_META } from "../models/promotion.types";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const promotionType = promotionTypeFromSlug(params.type);
  if (!promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  const promotion = await getPromotion(session.shop, params.id!);
  if (!promotion || promotion.promotionType !== promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  return { promotion, promotionType };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const promotionType = promotionTypeFromSlug(params.type);
  if (!promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  const listPath = PROMOTION_TYPE_META[promotionType].href;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const promotion = await deletePromotion(session.shop, params.id!);
    await applyPromotionDiscountSync(admin, promotion, promotion.discountIds);
    await removePromotionRecord(params.id!);
    return redirect(listPath);
  }

  try {
    const existing = await getPromotion(session.shop, params.id!);
    if (!existing || existing.promotionType !== promotionType) {
      throw new Response("Not found", { status: 404 });
    }

    const input = parsePromotionForm(formData, promotionType);
    const updated = await updatePromotion(session.shop, params.id!, input);
    const discountIds = await applyPromotionDiscountSync(
      admin,
      updated,
      existing.discountIds,
    );
    await updatePromotionDiscountIds(params.id!, discountIds);
    return redirect(listPath);
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

export default function EditPromotion() {
  const { promotion, promotionType } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const meta = PROMOTION_TYPE_META[promotionType];
  const isDeleting = deleteFetcher.state !== "idle";
  const isSaving = navigation.state === "submitting";

  return (
    <SPage heading={`Edit ${meta.label}`}>
      <Form
        key={formKey}
        method="post"
        className={styles.offerPage}
        onReset={() => setFormKey((current) => current + 1)}
      >
        <PromotionFormShell
          key={formKey}
          mode="edit"
          promotionType={promotionType}
          listHref={meta.href}
          defaultTitle={promotion.title}
          defaultStatus={promotion.status}
          defaultConfig={promotion.config}
          defaultProductIds={promotion.productIds}
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
              Delete offer
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
