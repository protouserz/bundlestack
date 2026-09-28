import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listPromotions } from "../models/promotion.server";
import {
  assertAnyPromotionPlanAccess,
  planIncludesPromotionType,
} from "../models/promotion-access.server";
import {
  PROMOTION_TYPES,
  PROMOTION_TYPE_META,
  type PromotionType,
} from "../models/promotion.types";
import { PLAN_LABELS } from "../billing.plans";
import { SButton, SPage } from "../components/polaris";
import { PromotionTypeMark } from "../components/promotions/PromotionTypeMark";
import styles from "../components/promotions/promotions.module.css";

const TYPE_EXAMPLE: Record<PromotionType, string> = {
  bogo: "Buy 1, get 1 free",
  free_gift: "Free gift over $50",
  mix_match: "Any 3, 15% off",
  bundle_builder: "Pick a kit, save 10%",
  fbt: "Add-on 10% off",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const access = await assertAnyPromotionPlanAccess(session.shop, billing);
  const promotions = access.allowed ? await listPromotions(session.shop) : [];
  const counts = Object.fromEntries(
    PROMOTION_TYPES.map((type) => [
      type,
      promotions.filter((promotion) => promotion.promotionType === type).length,
    ]),
  ) as Record<PromotionType, number>;
  const allowedByType = Object.fromEntries(
    PROMOTION_TYPES.map((type) => [
      type,
      planIncludesPromotionType(access.plan, type),
    ]),
  ) as Record<PromotionType, boolean>;

  return {
    counts,
    total: promotions.length,
    allowedByType,
    access: {
      ...access,
      planLabel: PLAN_LABELS[access.plan],
    },
  };
};

export default function PromotionsHub() {
  const { counts, total, allowedByType, access } =
    useLoaderData<typeof loader>();

  return (
    <SPage heading="Promotions">
      <div className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.introCopy}>
            {access.advancedAllowed
              ? "Grow order value beyond quantity breaks. Each type syncs to checkout automatically — shoppers see the deal on the product page after you save the theme embed."
              : "Frequently bought together (upsell and cross-sell) is included. Free gifts, mix & match, builders, and extra BOGO types unlock on Pro."}
          </p>
          <span className={styles.introCount}>
            {total} promotion{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className={styles.grid}>
          {PROMOTION_TYPES.map((type) => {
            const meta = PROMOTION_TYPE_META[type];
            const count = counts[type];
            const typeAllowed = allowedByType[type];

            return (
              <article
                key={type}
                className={`${styles.card}${type === "fbt" ? ` ${styles.cardWide}` : ""}`}
              >
                <div className={styles.cardHeader}>
                  <PromotionTypeMark type={type} />
                  <div className={styles.cardHeading}>
                    <h2 className={styles.cardTitle}>{meta.label}</h2>
                    {typeAllowed ? (
                      <span
                        className={`${styles.badge}${count > 0 ? ` ${styles.badgeLive}` : ""}`}
                      >
                        {count} live
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgePro}`}>
                        Pro
                      </span>
                    )}
                  </div>
                </div>
                <p className={styles.cardBody}>{meta.description}</p>
                <p className={styles.example}>{TYPE_EXAMPLE[type]}</p>
                <div className={styles.actions}>
                  {typeAllowed ? (
                    <>
                      <SButton variant="primary" href={`${meta.href}/new`}>
                        Create
                      </SButton>
                      <SButton variant="tertiary" href={meta.href}>
                        {count > 0 ? "Manage" : "View"}
                      </SButton>
                    </>
                  ) : (
                    <SButton variant="primary" href="/app/billing">
                      Upgrade to Pro
                    </SButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
