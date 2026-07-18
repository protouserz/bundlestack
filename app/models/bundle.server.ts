import prisma from "../db.server";
import { isBillingPlan, type BillingPlan } from "../billing.server";
import { getTierForPlanHandle, getTierForShopifyPlan } from "../billing.shopify";
import { PLAN_ORDER } from "../billing.plans";
import { safeJsonParse } from "../utils/json.server";

export type DiscountTier = {
  minQty: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  label?: string;
};

export type BundleOfferInput = {
  title: string;
  offerType?: string;
  status?: string;
  productIds: string[];
  tiers: DiscountTier[];
};

function parseTiers(raw: string): DiscountTier[] {
  return safeJsonParse<DiscountTier[]>(raw, []);
}

function parseProductIds(raw: string): string[] {
  return safeJsonParse<string[]>(raw, []);
}

export function serializeOffer(offer: {
  id: string;
  shop: string;
  title: string;
  offerType: string;
  status: string;
  productIds: string;
  tiers: string;
  discountIds?: string;
  discountUses?: number;
  revenueGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...offer,
    productIds: parseProductIds(offer.productIds),
    tiers: parseTiers(offer.tiers),
    discountIds: offer.discountIds
      ? safeJsonParse<string[]>(offer.discountIds, [])
      : [],
  };
}

export async function listOffers(shop: string) {
  const offers = await prisma.bundleOffer.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });

  return offers.map(serializeOffer);
}

export async function getOffer(shop: string, id: string) {
  const offer = await prisma.bundleOffer.findFirst({
    where: { shop, id },
  });

  return offer ? serializeOffer(offer) : null;
}

export async function createOffer(shop: string, input: BundleOfferInput) {
  const offer = await prisma.bundleOffer.create({
    data: {
      shop,
      title: input.title,
      offerType: input.offerType ?? "quantity_break",
      status: input.status ?? "draft",
      productIds: JSON.stringify(input.productIds),
      tiers: JSON.stringify(input.tiers),
      discountIds: "[]",
    },
  });

  return serializeOffer(offer);
}

export async function updateOfferDiscountIds(id: string, discountIds: string[]) {
  const offer = await prisma.bundleOffer.update({
    where: { id },
    data: { discountIds: JSON.stringify(discountIds) },
  });

  return serializeOffer(offer);
}

export async function updateOffer(
  shop: string,
  id: string,
  input: Partial<BundleOfferInput>,
) {
  const existing = await prisma.bundleOffer.findFirst({ where: { shop, id } });
  if (!existing) {
    throw new Response("Not found", { status: 404 });
  }

  const offer = await prisma.bundleOffer.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.offerType !== undefined ? { offerType: input.offerType } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.productIds !== undefined
        ? { productIds: JSON.stringify(input.productIds) }
        : {}),
      ...(input.tiers !== undefined ? { tiers: JSON.stringify(input.tiers) } : {}),
    },
  });

  return serializeOffer(offer);
}

export async function deleteOffer(shop: string, id: string) {
  const offer = await prisma.bundleOffer.findFirst({ where: { shop, id } });
  if (!offer) {
    throw new Response("Not found", { status: 404 });
  }

  return serializeOffer(offer);
}

export async function deleteAllOffers(shop: string) {
  const offers = await listOffers(shop);
  await prisma.bundleOffer.deleteMany({ where: { shop } });
  return offers;
}

export async function removeOfferRecord(id: string) {
  await prisma.bundleOffer.delete({ where: { id } });
}

export async function getActiveOffersForProduct(shop: string, productId: string) {
  const offers = await prisma.bundleOffer.findMany({
    where: {
      shop,
      status: "active",
      // productIds is stored as a JSON string array; contain the GID.
      productIds: { contains: productId },
    },
    orderBy: { updatedAt: "desc" },
  });

  return offers
    .map(serializeOffer)
    .filter((offer) => offer.productIds.includes(productId));
}

export type OfferBadge = {
  handle: string;
  productId: string;
  minQty: number;
  startingDiscountType: "percentage" | "fixed";
  startingDiscountValue: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

function numericProductId(gid: string): string | null {
  const match = /Product\/(\d+)/.exec(gid);
  return match?.[1] ?? null;
}

/**
 * Badge data for every product covered by an active offer, keyed by product
 * handle so the storefront overlay can match product-card links.
 */
export async function getActiveOfferBadges(
  shop: string,
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
): Promise<OfferBadge[]> {
  const offers = await prisma.bundleOffer.findMany({
    where: { shop, status: "active" },
    orderBy: { updatedAt: "desc" },
  });

  const bestByProduct = new Map<
    string,
    {
      minQty: number;
      startingDiscountType: "percentage" | "fixed";
      startingDiscountValue: number;
      discountType: "percentage" | "fixed";
      discountValue: number;
    }
  >();

  for (const offer of offers.map(serializeOffer)) {
    const tiers = offer.tiers
      .filter((tier) => tier.discountValue > 0)
      .sort((a, b) => a.minQty - b.minQty);
    if (tiers.length === 0) continue;

    const startingTier = tiers[0];
    const best = tiers.reduce((max, tier) =>
      tier.discountValue > max.discountValue ? tier : max,
    );
    const entry = {
      minQty: startingTier.minQty,
      startingDiscountType: startingTier.discountType,
      startingDiscountValue: startingTier.discountValue,
      discountType: best.discountType,
      discountValue: best.discountValue,
    };

    for (const productId of offer.productIds) {
      const existing = bestByProduct.get(productId);
      if (!existing || entry.discountValue > existing.discountValue) {
        bestByProduct.set(productId, entry);
      }
    }
  }

  const productIds = [...bestByProduct.keys()];
  if (productIds.length === 0) return [];

  const response = await admin.graphql(
    `#graphql
      query productHandles($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            handle
          }
        }
      }`,
    { variables: { ids: productIds } },
  );

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join("; "));
  }

  const nodes: Array<{ id?: string; handle?: string } | null> =
    json.data?.nodes ?? [];

  const badges: OfferBadge[] = [];
  for (const node of nodes) {
    if (!node?.id || !node.handle) continue;
    const entry = bestByProduct.get(node.id);
    if (!entry) continue;
    badges.push({
      handle: node.handle,
      productId: numericProductId(node.id) ?? node.id,
      ...entry,
    });
  }

  return badges;
}

export async function getShopStats(
  shop: string,
  offersInput?: Awaited<ReturnType<typeof listOffers>>,
) {
  const offers =
    offersInput ??
    (await prisma.bundleOffer.findMany({ where: { shop } }));

  const activeOffers = offers.filter((o) => o.status === "active").length;
  const totalDiscountUses = offers.reduce(
    (sum, o) => sum + (o.discountUses ?? 0),
    0,
  );
  const settings = await getShopSettings(shop);

  return {
    totalOffers: offers.length,
    activeOffers,
    totalDiscountUses,
    totalRevenue: totalDiscountUses,
    billingPlan: settings.billingPlan,
  };
}

export async function getShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function setShopBillingPlan(shop: string, plan: BillingPlan) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, billingPlan: plan, pendingBillingPlan: "" },
    update: { billingPlan: plan },
  });
}

export async function setPendingBillingPlan(shop: string, plan: BillingPlan | "") {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, pendingBillingPlan: plan },
    update: { pendingBillingPlan: plan },
  });
}

export async function clearPendingBillingPlan(shop: string) {
  return setPendingBillingPlan(shop, "");
}

export function resolveBillingPlan(
  activeSubscriptionNames: string[],
): BillingPlan {
  let bestPlan: BillingPlan = "free";

  for (const name of activeSubscriptionNames) {
    const tier = getTierForShopifyPlan(name);
    if (!tier) continue;

    if (PLAN_ORDER.indexOf(tier) > PLAN_ORDER.indexOf(bestPlan)) {
      bestPlan = tier;
    }
  }

  return bestPlan;
}

export function resolveCurrentBillingPlan({
  activeSubscriptionNames,
  planHandle,
  chargeId,
  storedPlan,
}: {
  activeSubscriptionNames: string[];
  planHandle: string | null;
  chargeId: string | null;
  storedPlan: BillingPlan;
}): BillingPlan {
  if (chargeId && planHandle) {
    const fromHandle = getTierForPlanHandle(planHandle);
    if (fromHandle) return fromHandle;
  }

  const fromSubscriptions = resolveBillingPlan(activeSubscriptionNames);
  if (fromSubscriptions !== "free") return fromSubscriptions;

  if (planHandle) {
    const fromHandle = getTierForPlanHandle(planHandle);
    if (fromHandle) return fromHandle;
  }

  return storedPlan;
}

export function resolvePendingBillingPlan(
  pendingBillingPlan: string,
): BillingPlan | null {
  if (!pendingBillingPlan || !isBillingPlan(pendingBillingPlan)) {
    return null;
  }

  return pendingBillingPlan === "free" ? null : pendingBillingPlan;
}

export async function ensureShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function setOnboardingDone(shop: string, done = true) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, onboardingDone: done },
    update: { onboardingDone: done },
  });
}

export function parseOfferForm(formData: FormData): BundleOfferInput {
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const offerType = String(formData.get("offerType") ?? "quantity_break");
  const productIdsRaw = String(formData.get("productIds") ?? "");
  const tiersRaw = String(formData.get("tiers") ?? "[]");

  const productIds = productIdsRaw
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);

  let tiers: DiscountTier[];
  try {
    tiers = JSON.parse(tiersRaw) as DiscountTier[];
  } catch {
    throw new Response("Invalid tier data", { status: 400 });
  }

  if (!title) {
    throw new Response("Title is required", { status: 400 });
  }

  if (productIds.length === 0) {
    throw new Response("Select at least one product", { status: 400 });
  }

  for (const id of productIds) {
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(id)) {
      throw new Response(
        `Invalid product ID "${id}". Use the product picker — theme or collection IDs are not supported.`,
        { status: 400 },
      );
    }
  }

  if (tiers.length === 0) {
    throw new Response("At least one quantity tier is required", { status: 400 });
  }

  return { title, status, offerType, productIds, tiers };
}

export async function cleanupShopData(shop: string) {
  await prisma.bundleOffer.deleteMany({ where: { shop } });
  await prisma.shopSettings.deleteMany({ where: { shop } });
}

/** GDPR shop/redact and full shop data removal (offers, settings, OAuth sessions). */
export async function redactShopRecords(shop: string) {
  await cleanupShopData(shop);
  await prisma.session.deleteMany({ where: { shop } });
}

export async function listOffersRaw(shop: string) {
  return prisma.bundleOffer.findMany({ where: { shop } });
}

export async function fetchProductTitles(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  productIds: string[],
) {
  if (productIds.length === 0) return [];

  const response = await admin.graphql(
    `#graphql
      query productTitles($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredMedia {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }`,
    { variables: { ids: productIds } },
  );

  const json = await response.json();
  const nodes = json.data?.nodes ?? [];

  type ProductNode = {
    id?: string;
    title?: string;
    featuredMedia?: {
      image?: { url?: string; altText?: string | null } | null;
    } | null;
  } | null;

  const byId = new Map<
    string,
    { id: string; title: string; imageUrl?: string; imageAlt?: string }
  >();

  for (const node of nodes as ProductNode[]) {
    if (!node?.id) continue;
    const image = node.featuredMedia?.image;
    byId.set(node.id, {
      id: node.id,
      title: node.title || node.id,
      ...(image?.url
        ? {
            imageUrl: image.url,
            ...(image.altText ? { imageAlt: image.altText } : {}),
          }
        : {}),
    });
  }

  // Preserve the offer's product order; fall back to the GID if a product
  // was deleted in Shopify but is still referenced on the offer.
  return productIds.map(
    (id) => byId.get(id) ?? { id, title: id },
  );
}
