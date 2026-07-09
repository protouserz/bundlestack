import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listPromotions } from "../models/promotion.server";
import {
  PROMOTION_TYPES,
  PROMOTION_TYPE_META,
} from "../models/promotion.types";
import { SButton, SPage } from "../components/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const promotions = await listPromotions(session.shop);

  const counts = Object.fromEntries(
    PROMOTION_TYPES.map((type) => [
      type,
      promotions.filter((promotion) => promotion.promotionType === type).length,
    ]),
  ) as Record<(typeof PROMOTION_TYPES)[number], number>;

  return { counts, total: promotions.length };
};

export default function PromotionsHub() {
  const { counts, total } = useLoaderData<typeof loader>();

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
                  </s-stack>
                  <s-text tone="neutral">{meta.description}</s-text>
                  <s-stack direction="inline" gap="base">
                    <SButton variant="primary" href={meta.href}>
                      Manage {meta.shortLabel}
                    </SButton>
                    <Link to={`${meta.href}/new`}>Create new</Link>
                  </s-stack>
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
