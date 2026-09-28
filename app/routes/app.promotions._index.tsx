import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listPromotions } from "../models/promotion.server";
import { assertAnyPromotionPlanAccess } from "../models/promotion-access.server";
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

  if (!access.allowed) {
    return {
      counts: Object.fromEntries(PROMOTION_TYPES.map((type) => [type, 0])) as Record<
        PromotionType,
        number
      >,
      total: 0,
      access: {
        ...access,
        planLabel: PLAN_LABELS[access.plan],
      },
    };
  }

  const promotions = await listPromotions(session.shop);
  const counts = Object.fromEntries(
    PROMOTION_TYPES.map((type) => [
      type,
      promotions.filter((promotion) => promotion.promotionType === type).length,
    ]),
  ) as Record<PromotionType, number>;

  return {
    counts,
    total: promotions.length,
    access: {
      ...access,
      planLabel: PLAN_LABELS[access.plan],
    },
  };
};

export default function PromotionsHub() {
  const { counts, total, access } = useLoaderData<typeof loader>();

  if (!access.allowed) {
    return (
      <SPage heading="Promotions">
        <s-banner tone="warning">
          <s-stack direction="block" gap="base">
            <s-text>
              Promotions are available on the <strong>Starter</strong>,{" "}
              <strong>Growth</strong>, and <strong>Pro</strong> plans. Your
              current plan is <strong>{access.planLabel}</strong>.
            </s-text>
            <SButton variant="primary" href="/app/billing">
              Upgrade to unlock promotions
            </SButton>
          </s-stack>
        </s-banner>
      </SPage>
    );
  }

  return (
    <SPage heading="Promotions">
      <div className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.introCopy}>
            Grow order value beyond quantity breaks. Each type syncs to checkout
            automatically — shoppers see the deal on the product page after you
            save the theme embed.
          </p>
          <span className={styles.introCount}>
            {total} promotion{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className={styles.grid}>
          {PROMOTION_TYPES.map((type) => {
            const meta = PROMOTION_TYPE_META[type];
            const count = counts[type];

            return (
              <article key={type} className={styles.card}>
                <div className={styles.cardHeader}>
                  <PromotionTypeMark type={type} />
                  <span className={count > 0 ? styles.badgeLive : styles.badge}>
                    {count} live
                  </span>
                </div>
                <h2 className={styles.cardTitle}>{meta.label}</h2>
                <p className={styles.cardBody}>{meta.description}</p>
                <p className={styles.example}>{TYPE_EXAMPLE[type]}</p>
                <div className={styles.actions}>
                  <SButton variant="primary" href={`${meta.href}/new`}>
                    Create
                  </SButton>
                  <SButton variant="tertiary" href={meta.href}>
                    {count > 0 ? "Manage" : "View"}
                  </SButton>
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
