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
import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n";
import { PromotionTypeMark } from "../components/promotions/PromotionTypeMark";
import styles from "../components/promotions/promotions.module.css";

const TYPE_COPY: Record<
  PromotionType,
  { label: MessageKey; desc: MessageKey; example: MessageKey }
> = {
  bogo: {
    label: "promotions.bogo",
    desc: "promotions.bogoDesc",
    example: "promotions.bogoExample",
  },
  free_gift: {
    label: "promotions.gifts",
    desc: "promotions.giftsDesc",
    example: "promotions.giftsExample",
  },
  mix_match: {
    label: "promotions.mix",
    desc: "promotions.mixDesc",
    example: "promotions.mixExample",
  },
  bundle_builder: {
    label: "promotions.builder",
    desc: "promotions.builderDesc",
    example: "promotions.builderExample",
  },
  fbt: {
    label: "promotions.fbt",
    desc: "promotions.fbtDesc",
    example: "promotions.fbtExample",
  },
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
  const { t, plural } = useI18n();

  return (
    <SPage heading={t("promotions.title")}>
      <div className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.introCopy}>
            {access.advancedAllowed
              ? t("promotions.introPaid")
              : t("promotions.introFree")}
          </p>
          <span className={styles.introCount}>
            {plural("promotions.count", total)}
          </span>
        </div>

        <div className={styles.grid}>
          {PROMOTION_TYPES.map((type) => {
            const meta = PROMOTION_TYPE_META[type];
            const copy = TYPE_COPY[type];
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
                    <h2 className={styles.cardTitle}>{t(copy.label)}</h2>
                    {typeAllowed ? (
                      <span
                        className={`${styles.badge}${count > 0 ? ` ${styles.badgeLive}` : ""}`}
                      >
                        {t("promotions.live", { count })}
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgePro}`}>
                        {t("common.pro")}
                      </span>
                    )}
                  </div>
                </div>
                <p className={styles.cardBody}>{t(copy.desc)}</p>
                <p className={styles.example}>{t(copy.example)}</p>
                <div className={styles.actions}>
                  {typeAllowed ? (
                    <>
                      <SButton variant="primary" href={`${meta.href}/new`}>
                        {t("common.create")}
                      </SButton>
                      <SButton variant="tertiary" href={meta.href}>
                        {count > 0 ? t("common.manage") : t("common.view")}
                      </SButton>
                    </>
                  ) : (
                    <SButton variant="primary" href="/app/billing">
                      {t("common.upgradeToPro")}
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
