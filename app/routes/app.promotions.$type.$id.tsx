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
import { assertPromotionPlanAccess } from "../models/promotion-access.server";
import { promotionTypeFromSlug } from "../models/promotion-routes";
import {
  PROMOTION_TYPE_META,
  type BogoConfig,
  type FreeGiftConfig,
  type FbtConfig,
} from "../models/promotion.types";
import { fetchProductTitles } from "../models/bundle.server";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const promotionType = promotionTypeFromSlug(params.type);
  if (!promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  const access = await assertPromotionPlanAccess(
    session.shop,
    promotionType,
    billing,
  );
  if (!access.allowed) {
    return redirect(PROMOTION_TYPE_META[promotionType].href);
  }

  const promotion = await getPromotion(session.shop, params.id!);
  if (!promotion || promotion.promotionType !== promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  const config = promotion.config;
  const getProductIds =
    promotionType === "bogo"
      ? (config as BogoConfig).getProductIds ?? []
      : [];
  const giftProductIds =
    promotionType === "free_gift"
      ? (config as FreeGiftConfig).giftProductIds ?? []
      : [];
  const recommendedProductIds =
    promotionType === "fbt"
      ? (config as FbtConfig).recommendedProductIds ?? []
      : [];

  const allIds = [
    ...new Set([
      ...promotion.productIds,
      ...getProductIds,
      ...giftProductIds,
      ...recommendedProductIds,
    ]),
  ];
  const products = await fetchProductTitles(admin, allIds);
  const titleById = new Map(products.map((product) => [product.id, product.title]));

  return {
    promotion,
    promotionType,
    defaultProducts: promotion.productIds.map((id) => ({
      id,
      title: titleById.get(id) ?? id,
    })),
    defaultGetProducts: getProductIds.map((id) => ({
      id,
      title: titleById.get(id) ?? id,
    })),
    defaultGiftProducts: giftProductIds.map((id) => ({
      id,
      title: titleById.get(id) ?? id,
    })),
    defaultRecommendedProducts: recommendedProductIds.map((id) => ({
      id,
      title: titleById.get(id) ?? id,
    })),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const promotionType = promotionTypeFromSlug(params.type);
  if (!promotionType) {
    throw new Response("Not found", { status: 404 });
  }

  const access = await assertPromotionPlanAccess(
    session.shop,
    promotionType,
    billing,
  );
  if (!access.allowed) {
    return redirect("/app/billing");
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
  const {
    promotion,
    promotionType,
    defaultProducts,
    defaultGetProducts,
    defaultGiftProducts,
    defaultRecommendedProducts,
  } = useLoaderData<typeof loader>();
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
          defaultProducts={defaultProducts}
          defaultGetProducts={defaultGetProducts}
          defaultGiftProducts={defaultGiftProducts}
          defaultRecommendedProducts={defaultRecommendedProducts}
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
