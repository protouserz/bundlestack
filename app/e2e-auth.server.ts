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

/** Catalog large enough that excluding E2E sample products still leaves eligible items. */
const E2E_CATALOG_PRODUCT_IDS = [
  "gid://shopify/Product/1001",
  "gid://shopify/Product/1002",
  "gid://shopify/Product/1003",
  "gid://shopify/Product/1004",
];

let e2eDiscountSeq = 0;
let e2eCollectionSeq = 0;
const collectionProducts = new Map<string, string[]>();

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Auth stub for Playwright e2e.
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
        const variables = options?.variables ?? {};

        if (q.includes("productTitles") || q.includes("nodes(ids")) {
          const ids = (variables.ids as string[]) || [];
          return jsonResponse({
            data: {
              nodes: ids.map((id, index) => ({
                id,
                title: `E2E Product ${index + 1}`,
              })),
            },
          });
        }

        if (q.includes("codeDiscountNodeByCode")) {
          return jsonResponse({
            data: { codeDiscountNodeByCode: null },
          });
        }

        if (
          q.includes("couponCollectionProducts") ||
          q.includes("collection(id:")
        ) {
          const collectionId = String(variables.id ?? "");
          const productIds = collectionProducts.get(collectionId) ?? [];
          return jsonResponse({
            data: {
              collection: {
                products: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: productIds.map((id) => ({ id })),
                },
              },
            },
          });
        }

        if (
          q.includes("couponEligibleProducts") ||
          (q.includes("products(first") && !q.includes("collection("))
        ) {
          return jsonResponse({
            data: {
              products: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: E2E_CATALOG_PRODUCT_IDS.map((id) => ({ id })),
              },
            },
          });
        }

        if (q.includes("collectionCreate")) {
          e2eCollectionSeq += 1;
          const id = `gid://shopify/Collection/e2e-${e2eCollectionSeq}`;
          collectionProducts.set(id, []);
          return jsonResponse({
            data: {
              collectionCreate: {
                collection: { id },
                userErrors: [],
              },
            },
          });
        }

        if (q.includes("collectionAddProducts")) {
          const id = String(variables.id ?? "");
          const productIds = (variables.productIds as string[]) || [];
          const current = collectionProducts.get(id) ?? [];
          const next = [...current];
          for (const productId of productIds) {
            if (!next.includes(productId)) next.push(productId);
          }
          collectionProducts.set(id, next);
          return jsonResponse({
            data: {
              collectionAddProducts: { userErrors: [] },
            },
          });
        }

        if (q.includes("collectionRemoveProducts")) {
          const id = String(variables.id ?? "");
          const productIds = new Set((variables.productIds as string[]) || []);
          const current = collectionProducts.get(id) ?? [];
          collectionProducts.set(
            id,
            current.filter((productId) => !productIds.has(productId)),
          );
          return jsonResponse({
            data: {
              collectionRemoveProducts: { userErrors: [] },
            },
          });
        }

        if (q.includes("collectionDelete")) {
          const input = variables.input as { id?: string } | undefined;
          if (input?.id) collectionProducts.delete(input.id);
          return jsonResponse({
            data: {
              collectionDelete: {
                deletedCollectionId: input?.id ?? null,
                userErrors: [],
              },
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
                deletedAutomaticDiscountId:
                  "gid://shopify/DiscountAutomaticNode/e2e-1",
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
          e2eDiscountSeq += 1;
          return jsonResponse({
            data: {
              discountCodeBasicCreate: {
                codeDiscountNode: {
                  id: `gid://shopify/DiscountCodeNode/e2e-${e2eDiscountSeq}`,
                },
                userErrors: [],
              },
            },
          });
        }

        if (q.includes("discountCodeBasicUpdate")) {
          return jsonResponse({
            data: {
              discountCodeBasicUpdate: {
                codeDiscountNode: {
                  id:
                    (variables.id as string) ||
                    "gid://shopify/DiscountCodeNode/e2e-1",
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
          appSubscriptions: name ? [{ name, status: "ACTIVE" }] : [],
        };
      },
    },
  };
}
