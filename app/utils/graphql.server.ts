import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

const NODE_BATCH_SIZE = 50;

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

type DiscountNodeResult = {
  id?: string;
  discount?: {
    asyncUsageCount?: number;
  };
};

export async function fetchDiscountNodesByIds(
  admin: AdminApiContext,
  discountIds: string[],
): Promise<Map<string, DiscountNodeResult>> {
  const uniqueIds = [...new Set(discountIds.filter(Boolean))];
  const results = new Map<string, DiscountNodeResult>();

  if (uniqueIds.length === 0) {
    return results;
  }

  for (const batch of chunkArray(uniqueIds, NODE_BATCH_SIZE)) {
    const response = await admin.graphql(
      `#graphql
        query discountNodesByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on DiscountNode {
              id
              discount {
                ... on DiscountAutomaticBasic {
                  asyncUsageCount
                }
              }
            }
          }
        }`,
      { variables: { ids: batch } },
    );

    const json = await response.json();
    const nodes = (json.data?.nodes ?? []) as Array<DiscountNodeResult | null>;

    for (const node of nodes) {
      if (node?.id) {
        results.set(node.id, node);
      }
    }
  }

  return results;
}
