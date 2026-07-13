import type { BillingPlan } from "./billing.plans";

export type E2EAuthContext = {
  session: {
    shop: string;
    accessToken: string;
    id: string;
    isOnline: boolean;
    state: string;
    scope: string;
  };
  admin: {
    graphql: (
      query: string,
      options?: { variables?: Record<string, unknown> },
    ) => Promise<Response>;
  };
  billing: {
    check: () => Promise<{
      appSubscriptions: Array<{ name: string; status: string }>;
    }>;
  };
};

const E2E_SHOP = process.env.E2E_SHOP || "bundlestack-dev.myshopify.com";
const E2E_PLAN = (process.env.E2E_BILLING_PLAN || "scale") as BillingPlan;

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Auth stub for Playwright screencasts.
 * Enabled only when E2E_AUTH_BYPASS=1 — never set this on Render/production.
 */
export function isE2EAuthBypassEnabled() {
  return process.env.E2E_AUTH_BYPASS === "1";
}

export function createE2EAuthContext(): E2EAuthContext {
  return {
    session: {
      id: `e2e_${E2E_SHOP}`,
      shop: E2E_SHOP,
      accessToken: "e2e-token",
      isOnline: false,
      state: "e2e",
      scope: "read_products,write_products,read_discounts,write_discounts",
    },
    admin: {
      async graphql(query, options) {
        const q = query.replace(/\s+/g, " ");
        if (q.includes("productTitles") || q.includes("nodes(ids")) {
          const ids = (options?.variables?.ids as string[]) || [];
          return jsonResponse({
            data: {
              nodes: ids.map((id, index) => ({
                id,
                title: `E2E Product ${index + 1}`,
              })),
            },
          });
        }

        if (q.includes("discountAutomaticAppCreate")) {
          return jsonResponse({
            data: {
              discountAutomaticAppCreate: {
                automaticAppDiscount: {
                  discountId: "gid://shopify/DiscountAutomaticNode/e2e-1",
                },
                userErrors: [],
              },
            },
          });
        }

        if (
          q.includes("discountAutomaticDelete") ||
          q.includes("discountCodeDelete")
        ) {
          return jsonResponse({
            data: {
              discountAutomaticDelete: {
                deletedAutomaticDiscountId: "gid://shopify/DiscountAutomaticNode/e2e-1",
                userErrors: [],
              },
              discountCodeDelete: {
                deletedCodeDiscountId: "gid://shopify/DiscountCodeNode/e2e-1",
                userErrors: [],
              },
            },
          });
        }

        if (q.includes("discountCodeBasicCreate")) {
          return jsonResponse({
            data: {
              discountCodeBasicCreate: {
                codeDiscountNode: {
                  id: "gid://shopify/DiscountCodeNode/e2e-1",
                },
                userErrors: [],
              },
            },
          });
        }

        return jsonResponse({ data: {} });
      },
    },
    billing: {
      async check() {
        const nameByPlan: Record<BillingPlan, string> = {
          free: "",
          starter: "BundleStack Starter",
          scale: "BundleStack Growth",
          pro: "BundleStack Pro",
        };
        const name = nameByPlan[E2E_PLAN];
        return {
          appSubscriptions: name
            ? [{ name, status: "ACTIVE" }]
            : [],
        };
      },
    },
  };
}
