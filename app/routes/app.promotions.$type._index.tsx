import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useLoaderData, useParams, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  deletePromotion,
  deletePromotionsByType,
  listPromotions,
  removePromotionRecord,
} from "../models/promotion.server";
import { applyPromotionDiscountSync } from "../models/promotion-sync.server";
import { assertPromotionPlanAccess } from "../models/promotion-access.server";
import { promotionTypeFromSlug } from "../models/promotion-routes";
import { PROMOTION_TYPE_META } from "../models/promotion.types";
import { PLAN_LABELS } from "../billing.plans";
import { SButton, SPage } from "../components/polaris";
import { PromotionCard } from "../components/PromotionCard";
import styles from "../components/promotions/promotions.module.css";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
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
    return {
      promotions: [] as Awaited<ReturnType<typeof listPromotions>>,
      promotionType,
      access: {
        ...access,
        planLabel: PLAN_LABELS[access.plan],
      },
    };
  }

  const promotions = await listPromotions(session.shop, promotionType);
  return {
    promotions,
    promotionType,
    access: {
      ...access,
      planLabel: PLAN_LABELS[access.plan],
    },
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

  const formData = await request.formData();
  const intent = formData.get("intent");
  const listPath = PROMOTION_TYPE_META[promotionType].href;

  if (intent === "delete") {
    const promotionId = String(formData.get("promotionId") ?? "");
    if (!promotionId) {
      throw new Response("Missing promotion ID", { status: 400 });
    }

    const promotion = await deletePromotion(session.shop, promotionId);
    await applyPromotionDiscountSync(admin, promotion, promotion.discountIds);
    await removePromotionRecord(promotionId);
    return redirect(listPath);
  }

  if (intent === "delete-all") {
    const promotions = await deletePromotionsByType(session.shop, promotionType);
    for (const promotion of promotions) {
      await applyPromotionDiscountSync(admin, promotion, promotion.discountIds);
    }
    return redirect(listPath);
  }

  throw new Response("Unknown action", { status: 400 });
};

export default function PromotionTypeIndex() {
  const { promotions, promotionType, access } = useLoaderData<typeof loader>();
  const params = useParams();
  const submit = useSubmit();
  const meta = PROMOTION_TYPE_META[promotionType];

  if (!access.allowed) {
    const needsGrowth =
      promotionType === "bundle_builder" || promotionType === "fbt";
    return (
      <SPage heading={meta.label}>
        <s-banner tone="warning">
          <s-stack direction="block" gap="base">
            <s-text>
              {meta.label} requires the{" "}
              <strong>{needsGrowth ? "Growth" : "Starter"}</strong> plan or
              higher. Your current plan is <strong>{access.planLabel}</strong>.
            </s-text>
            <SButton variant="primary" href="/app/billing">
              Upgrade to unlock
            </SButton>
          </s-stack>
        </s-banner>
      </SPage>
    );
  }

  return (
    <SPage heading={meta.label}>
      <SButton
        slot="primary-action"
        variant="primary"
        href={`${meta.href}/new`}
      >
        Create {meta.shortLabel}
      </SButton>

      <div className={styles.page}>
        <a className={styles.backLink} href="/app/promotions">
          ← All promotions
        </a>

        <div className={styles.intro}>
          <p className={styles.introCopy}>{meta.description}</p>
          {promotions.length > 0 ? (
            <SButton
              variant="tertiary"
              tone="critical"
              command="--show"
              commandFor="delete-all-promotions-modal"
            >
              Delete all
            </SButton>
          ) : (
            <span className={styles.introCount}>0 live</span>
          )}
        </div>

        {promotions.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No {meta.label.toLowerCase()} yet</p>
            <p className={styles.emptyBody}>{meta.description}</p>
            <SButton variant="primary" href={`${meta.href}/new`}>
              Create {meta.shortLabel}
            </SButton>
          </div>
        ) : (
          <div className={styles.list}>
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                showDelete
              />
            ))}
          </div>
        )}
      </div>

      {promotions.length > 0 ? (
        <s-modal
          id="delete-all-promotions-modal"
          heading={`Delete all ${meta.label.toLowerCase()} offers?`}
          accessibilityLabel={`Confirm deleting all ${meta.label} offers`}
        >
          <s-stack direction="block" gap="base">
            <s-paragraph>
              This will permanently delete {promotions.length} offer
              {promotions.length === 1 ? "" : "s"}.
            </s-paragraph>
          </s-stack>
          <SButton
            slot="secondary-actions"
            variant="secondary"
            commandFor="delete-all-promotions-modal"
            command="--hide"
          >
            Cancel
          </SButton>
          <SButton
            slot="primary-action"
            variant="primary"
            tone="critical"
            onClick={() =>
              submit({ intent: "delete-all" }, { method: "post" })
            }
          >
            Delete all
          </SButton>
        </s-modal>
      ) : null}

      <span hidden>{params.type}</span>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
