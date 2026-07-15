import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

const NODE_BATCH_SIZE = 50;

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function discountNodeNumericId(gid: string): string | null {
  const match = gid.match(/(\d+)$/);
  return match?.[1] ?? null;
}

export function normalizeDiscountNodeId(gid: string): string {
  const numericId = discountNodeNumericId(gid);
  if (!numericId) return gid;
  return `gid://shopify/DiscountNode/${numericId}`;
}

/** Mutations like discountAutomaticDelete require DiscountAutomaticNode GIDs. */
export function toDiscountAutomaticNodeId(gid: string): string {
  const numericId = discountNodeNumericId(gid);
  if (!numericId) return gid;
  return `gid://shopify/DiscountAutomaticNode/${numericId}`;
}

export function discountNodeIdsMatch(left: string, right: string): boolean {
  const leftNumeric = discountNodeNumericId(left);
  const rightNumeric = discountNodeNumericId(right);
  return leftNumeric !== null && leftNumeric === rightNumeric;
}

type DiscountNodeResult = {
  id?: string;
  discount?: {
    asyncUsageCount?: number;
  };
};

type DiscountNodeWithTitle = {
  id: string;
  title: string | null;
};

export async function listAllAutomaticDiscountNodes(
  admin: AdminApiContext,
): Promise<DiscountNodeWithTitle[]> {
  const results: DiscountNodeWithTitle[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(
      `#graphql
        query listAutomaticDiscounts($cursor: String) {
          discountNodes(first: 50, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              discount {
                ... on DiscountAutomaticApp {
                  title
                }
                ... on DiscountAutomaticBasic {
                  title
                }
                ... on DiscountAutomaticBxgy {
                  title
                }
                ... on DiscountAutomaticFreeShipping {
                  title
                }
              }
            }
          }
        }`,
      { variables: { cursor } },
    );

    const json = (await response.json()) as {
      errors?: Array<{ message: string }>;
      data?: {
        discountNodes?: {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          nodes?: Array<{ id: string; discount?: { title?: string } }>;
        };
      };
    };
    if (json.errors?.length) {
      throw new Error(
        `listAutomaticDiscounts: ${json.errors.map((error) => error.message).join(", ")}`,
      );
    }

    const connection = json.data?.discountNodes;

    for (const node of connection?.nodes ?? []) {
      results.push({
        id: node.id,
        title: node.discount?.title ?? null,
      });
    }

    hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
    cursor = connection?.pageInfo?.endCursor ?? null;
  }

  return results;
}

export async function countExistingDiscountIds(
  admin: AdminApiContext,
  discountIds: string[],
): Promise<number> {
  const uniqueIds = [...new Set(discountIds.filter(Boolean))];
  if (uniqueIds.length === 0) return 0;

  const listed = await listAllAutomaticDiscountNodes(admin);
  const listedNumericIds = new Set(
    listed
      .map((node) => discountNodeNumericId(node.id))
      .filter((id): id is string => Boolean(id)),
  );

  return uniqueIds.filter((id) => {
    const numericId = discountNodeNumericId(id);
    return numericId !== null && listedNumericIds.has(numericId);
  }).length;
}

export async function fetchDiscountNodesByIds(
  admin: AdminApiContext,
  discountIds: string[],
): Promise<Map<string, DiscountNodeResult>> {
  const uniqueIds = [...new Set(discountIds.filter(Boolean))];
  const results = new Map<string, DiscountNodeResult>();

  if (uniqueIds.length === 0) {
    return results;
  }

  const queryIds = [
    ...new Set(uniqueIds.map((id) => normalizeDiscountNodeId(id))),
  ];

  for (const batch of chunkArray(queryIds, NODE_BATCH_SIZE)) {
    const response = await admin.graphql(
      `#graphql
        query discountNodesByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on DiscountNode {
              id
              discount {
                ... on DiscountAutomaticApp {
                  asyncUsageCount
                }
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
      if (!node?.id) continue;

      for (const requestedId of uniqueIds) {
        if (discountNodeIdsMatch(requestedId, node.id)) {
          results.set(requestedId, node);
        }
      }

      results.set(node.id, node);
      results.set(normalizeDiscountNodeId(node.id), node);
    }
  }

  return results;
}
