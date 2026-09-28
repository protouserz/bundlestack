import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useLoaderData } from "react-router";
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
      <s-stack direction="block" gap="large">
        <s-box
          padding="large"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <s-text tone="neutral">
            Grow AOV beyond quantity breaks with BOGO, free gifts, mix & match,
            bundle builders, and frequently-bought-together upsells.{" "}
            {total} promotion{total === 1 ? "" : "s"} configured.
          </s-text>
        </s-box>

        <s-stack direction="block" gap="base">
          {PROMOTION_TYPES.map((type) => {
            const meta = PROMOTION_TYPE_META[type];
            const isAdvanced = type === "bundle_builder" || type === "fbt";
            const locked = isAdvanced && !access.advancedAllowed;

            return (
              <s-box
                key={type}
                padding="large"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="base">
                    <s-heading>{meta.label}</s-heading>
                    <s-badge>
                      {counts[type]} offer{counts[type] === 1 ? "" : "s"}
                    </s-badge>
                    {locked ? <s-badge>Growth+</s-badge> : null}
                  </s-stack>
                  <s-text tone="neutral">{meta.description}</s-text>
                  {locked ? (
                    <s-stack direction="inline" gap="base">
                      <s-text tone="neutral">
                        Requires Growth or Pro. You&apos;re on {access.planLabel}.
                      </s-text>
                      <SButton variant="primary" href="/app/billing">
                        Upgrade
                      </SButton>
                    </s-stack>
                  ) : (
                    <s-stack direction="inline" gap="base">
                      <SButton variant="primary" href={meta.href}>
                        Manage {meta.shortLabel}
                      </SButton>
                      <Link to={`${meta.href}/new`}>Create new</Link>
                    </s-stack>
                  )}
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-stack>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
