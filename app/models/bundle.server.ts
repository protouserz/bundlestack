import prisma from "../db.server";
import { isBillingPlan, type BillingPlan } from "../billing.server";
import { SUPPORT_PLAN } from "../billing.plans";
import { getTierForShopifyPlan } from "../billing.shopify";
import { safeJsonParse } from "../utils/json.server";
import {
  OFFER_TYPE_BOGO,
  OFFER_TYPE_QUANTITY_BREAK,
  PREVIEW_EXAMPLE_AMOUNT,
  bogoLabel,
  isBogoOffer,
  isCatalogOffer,
  isOfferType,
  type BundleOfferInput,
  type DiscountTier,
  type StorefrontPreviewProduct,
} from "./offer";

export {
  DEFAULT_BOGO_TIERS,
  DEFAULT_BOGO_TITLE,
  DEFAULT_OFFER_TITLE,
  DEFAULT_QUANTITY_TIERS,
  OFFER_TYPE_BOGO,
  OFFER_TYPE_QUANTITY_BREAK,
  OFFER_TYPES,
  bogoLabel,
  isBogoOffer,
  isCatalogOffer,
  isOfferType,
  offerDiscountSummary,
} from "./offer";
export type { BundleOfferInput, DiscountTier, OfferType } from "./offer";

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
      offerType: input.offerType ?? OFFER_TYPE_QUANTITY_BREAK,
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
    where: { shop, status: "active" },
    orderBy: { updatedAt: "desc" },
  });

  return offers
    .map(serializeOffer)
    .filter(
      (offer) =>
        isCatalogOffer(offer.productIds) ||
        offer.productIds.includes(productId),
    );
}

type OfferBadgeFields = {
  minQty: number;
  startingDiscountType: "percentage" | "fixed";
  startingDiscountValue: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  offerType: string;
  getQty?: number;
};

export type OfferBadge = OfferBadgeFields & {
  handle: string;
  productId: string;
  catalog?: boolean;
};

function numericProductId(gid: string): string | null {
  const match = /Product\/(\d+)/.exec(gid);
  return match?.[1] ?? null;
}

function badgeFieldsFromOffer(offer: {
  offerType: string;
  tiers: DiscountTier[];
}): OfferBadgeFields | null {
  const bogo = isBogoOffer(offer.offerType);
  const tiers = [...offer.tiers].sort((a, b) => a.minQty - b.minQty);
  const startingTier = tiers[0];
  if (!startingTier?.minQty) return null;
  if (!bogo && startingTier.discountValue <= 0) return null;

  const best = tiers.reduce((max, tier) =>
    tier.discountValue > max.discountValue ? tier : max,
  );

  return {
    minQty: startingTier.minQty,
    startingDiscountType: startingTier.discountType,
    startingDiscountValue: startingTier.discountValue,
    discountType: best.discountType,
    discountValue: best.discountValue,
    offerType: offer.offerType,
    ...(bogo || Number(startingTier.getQty) > 0
      ? { getQty: Math.max(1, Math.floor(Number(startingTier.getQty)) || 1) }
      : {}),
  };
}

function preferBadge(
  existing: OfferBadgeFields | undefined,
  incoming: OfferBadgeFields,
): OfferBadgeFields {
  if (!existing) return incoming;
  const incomingBogo = isBogoOffer(incoming.offerType);
  const existingBogo = isBogoOffer(existing.offerType);
  if (incomingBogo && !existingBogo) return incoming;
  if (existingBogo && !incomingBogo) return existing;
  return incoming.discountValue > existing.discountValue ? incoming : existing;
}

/** Pick overlay copy for catalog-wide vs product-assigned offers. */
export function selectStorefrontBadges(
  offers: Array<{ offerType: string; productIds: string[]; tiers: DiscountTier[] }>,
): { catalog: OfferBadgeFields | null; byProductId: Map<string, OfferBadgeFields> } {
  let catalog: OfferBadgeFields | null = null;
  const byProductId = new Map<string, OfferBadgeFields>();

  for (const offer of offers) {
    const entry = badgeFieldsFromOffer(offer);
    if (!entry) continue;

    if (isCatalogOffer(offer.productIds)) {
      catalog = preferBadge(catalog ?? undefined, entry);
      continue;
    }

    for (const productId of offer.productIds) {
      byProductId.set(productId, preferBadge(byProductId.get(productId), entry));
    }
  }

  return { catalog, byProductId };
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

  const { catalog, byProductId: bestByProduct } = selectStorefrontBadges(
    offers.map(serializeOffer),
  );

  const productIds = [...bestByProduct.keys()];
  if (productIds.length === 0 && !catalog) return [];

  const badges: OfferBadge[] = [];
  if (catalog) {
    badges.push({
      handle: "",
      productId: "",
      catalog: true,
      ...catalog,
    });
  }

  if (productIds.length === 0) return badges;

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
  for (const name of activeSubscriptionNames) {
    if (getTierForShopifyPlan(name)) {
      return SUPPORT_PLAN;
    }
  }

  return "free";
}

export function resolveCurrentBillingPlan({
  activeSubscriptionNames,
  storedPlan,
}: {
  activeSubscriptionNames: string[];
  /** @deprecated Ignored — never trust query params to set plan. */
  planHandle?: string | null;
  /** @deprecated Ignored — never trust query params to set plan. */
  chargeId?: string | null;
  storedPlan: BillingPlan;
}): BillingPlan {
  const fromSubscriptions = resolveBillingPlan(activeSubscriptionNames);
  if (fromSubscriptions !== "free") {
    return fromSubscriptions;
  }

  // No verified paid subscription from Shopify. Do not upgrade from
  // plan_handle / charge_id — those are attacker-controlled. Keep the
  // stored plan so a transient empty billing.check() does not wipe a
  // legitimate paid tier; cancellations are applied via the subscriptions
  // webhook which writes an authoritative plan.
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
  const offerType = String(formData.get("offerType") ?? OFFER_TYPE_QUANTITY_BREAK);
  const productIdsRaw = String(formData.get("productIds") ?? "");
  const tiersRaw = String(formData.get("tiers") ?? "[]");
  const allProducts =
    formData.get("allProducts") === "on" ||
    formData.get("allProducts") === "true" ||
    formData.get("allProducts") === "1";

  const productIds = allProducts
    ? []
    : productIdsRaw
        .split(/[\n,]/)
        .map((id) => id.trim())
        .filter(Boolean);

  let rawTiers: unknown;
  try {
    rawTiers = JSON.parse(tiersRaw);
  } catch {
    throw new Response("Invalid tier data", { status: 400 });
  }

  if (!title) {
    throw new Response("Title is required", { status: 400 });
  }

  if (!["draft", "active", "paused"].includes(status)) {
    throw new Response("Invalid offer status", { status: 400 });
  }

  if (!isOfferType(offerType)) {
    throw new Response("Invalid offer type", { status: 400 });
  }

  if (!allProducts && productIds.length === 0) {
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

  if (!Array.isArray(rawTiers) || rawTiers.length === 0) {
    throw new Response(
      offerType === OFFER_TYPE_BOGO
        ? "Buy and get quantities are required"
        : "At least one quantity tier is required",
      { status: 400 },
    );
  }

  if (offerType === OFFER_TYPE_BOGO) {
    const record = rawTiers[0];
    if (!record || typeof record !== "object") {
      throw new Response("Invalid BOGO configuration", { status: 400 });
    }

    const data = record as Record<string, unknown>;
    const buyQty = Number(data.minQty);
    const getQty = Number(data.getQty ?? 1);

    if (!Number.isInteger(buyQty) || buyQty < 1 || buyQty > 10) {
      throw new Response("Buy quantity must be a whole number from 1 to 10", {
        status: 400,
      });
    }
    if (!Number.isInteger(getQty) || getQty < 1 || getQty > 10) {
      throw new Response("Get quantity must be a whole number from 1 to 10", {
        status: 400,
      });
    }

    return {
      title,
      status,
      offerType,
      productIds,
      tiers: [
        {
          minQty: buyQty,
          getQty,
          discountType: "percentage",
          discountValue: 100,
          label: bogoLabel(buyQty, getQty),
        },
      ],
    };
  }

  const tiers: DiscountTier[] = rawTiers.map((tier, index) => {
    if (!tier || typeof tier !== "object") {
      throw new Response(`Invalid tier at position ${index + 1}`, { status: 400 });
    }

    const record = tier as Record<string, unknown>;
    const minQty = Number(record.minQty);
    const discountValue = Number(record.discountValue);
    const discountType = String(record.discountType ?? "");
    const label =
      typeof record.label === "string" ? record.label.trim() : undefined;

    if (!Number.isInteger(minQty) || minQty < 2) {
      throw new Response(
        `Tier ${index + 1}: minimum quantity must be an integer of 2 or more`,
        { status: 400 },
      );
    }

    if (discountType !== "percentage" && discountType !== "fixed") {
      throw new Response(
        `Tier ${index + 1}: discount type must be percentage or fixed`,
        { status: 400 },
      );
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new Response(
        `Tier ${index + 1}: discount value must be a positive number`,
        { status: 400 },
      );
    }

    if (discountType === "percentage" && discountValue > 50) {
      throw new Response(
        `Tier ${index + 1}: percentage discount cannot exceed 50%`,
        { status: 400 },
      );
    }

    if (discountType === "fixed" && discountValue > 100_000) {
      throw new Response(
        `Tier ${index + 1}: fixed discount is unreasonably large`,
        { status: 400 },
      );
    }

    return {
      minQty,
      discountType,
      discountValue,
      ...(label ? { label } : {}),
    };
  });

  return { title, status, offerType, productIds, tiers };
}

export async function cleanupShopData(shop: string) {
  await prisma.bundleOffer.deleteMany({ where: { shop } });
  await prisma.promotion.deleteMany({ where: { shop } });
  await prisma.coupon.deleteMany({ where: { shop } });
  await prisma.shopSettings.deleteMany({ where: { shop } });
}

/** Drop OAuth sessions only — keep offers/settings for a possible reinstall. */
export async function clearShopSessions(shop: string) {
  await prisma.session.deleteMany({ where: { shop } });
}

/**
 * Full shop erasure for GDPR `shop/redact` (and similar).
 * Offers/settings are intentionally NOT deleted on `app/uninstalled` so a
 * quick reinstall after a deploy or accidental uninstall can restore them.
 * Shopify still requires complete deletion when `shop/redact` arrives (~48h).
 */
export async function redactShopRecords(shop: string) {
  await cleanupShopData(shop);
  await clearShopSessions(shop);
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

export type OfferThumbnail = {
  imageUrl: string;
  imageAlt: string;
};

/**
 * Returns a thumbnail for each offer using the first assigned product's
 * featured image. Missing/deleted products leave that offer without a thumb.
 */
export async function fetchOfferThumbnails(
  admin: {
    graphql: (
      query: string,
      options?: { variables?: Record<string, unknown> },
    ) => Promise<Response>;
  },
  offers: Array<{ id: string; productIds: string[] }>,
): Promise<Record<string, OfferThumbnail>> {
  const firstProductIds = [
    ...new Set(
      offers
        .map((offer) => offer.productIds[0])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (firstProductIds.length === 0) return {};

  const products = await fetchProductTitles(admin, firstProductIds);
  const byProductId = new Map(products.map((product) => [product.id, product]));

  const thumbnails: Record<string, OfferThumbnail> = {};
  for (const offer of offers) {
    const product = offer.productIds[0]
      ? byProductId.get(offer.productIds[0])
      : undefined;
    if (!product?.imageUrl) continue;
    thumbnails[offer.id] = {
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt || product.title,
    };
  }

  return thumbnails;
}

const PREVIEW_PRODUCT_FIELDS = `
  title
  handle
  onlineStoreUrl
  featuredMedia {
    ... on MediaImage {
      image {
        url
        altText
      }
    }
  }
  priceRangeV2 {
    minVariantPrice {
      amount
      currencyCode
    }
  }
`;

export type PreviewProductNode = {
  title?: string | null;
  handle?: string | null;
  onlineStoreUrl?: string | null;
  featuredMedia?: {
    image?: { url?: string; altText?: string | null } | null;
  } | null;
  priceRangeV2?: {
    minVariantPrice?: {
      amount?: string | null;
      currencyCode?: string | null;
    } | null;
  } | null;
};

export function previewProductFromNode(
  node: PreviewProductNode | null | undefined,
  shop?: string,
): StorefrontPreviewProduct | null {
  const handle = node?.handle?.trim();
  if (!node || !handle) return null;

  const amount = Number(node.priceRangeV2?.minVariantPrice?.amount);
  const currencyCode =
    node.priceRangeV2?.minVariantPrice?.currencyCode?.trim() || "USD";
  const image = node.featuredMedia?.image;
  const shopHost = shop
    ?.replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
  const fallbackStorefront =
    shopHost && handle ? `https://${shopHost}/products/${handle}` : undefined;
  const storefrontUrl = node.onlineStoreUrl || fallbackStorefront;

  return {
    title: node.title?.trim() || handle,
    handle,
    exampleAmount:
      Number.isFinite(amount) && amount > 0 ? amount : PREVIEW_EXAMPLE_AMOUNT,
    currencyCode,
    ...(image?.url
      ? {
          imageUrl: image.url,
          imageAlt: image.altText?.trim() || node.title?.trim() || handle,
        }
      : {}),
    ...(storefrontUrl ? { storefrontUrl } : {}),
  };
}

function pickPreviewProduct(
  nodes: Array<PreviewProductNode | null | undefined>,
  shop?: string,
): StorefrontPreviewProduct | null {
  const mapped = nodes
    .map((node) => previewProductFromNode(node, shop))
    .filter((product): product is StorefrontPreviewProduct => Boolean(product));
  return mapped.find((product) => product.imageUrl) ?? mapped[0] ?? null;
}

/**
 * Product used in the in-app storefront preview and theme-editor deep link.
 * Prefers an offer-assigned product; otherwise the first active catalog product.
 */
export async function fetchPreviewProduct(
  admin: {
    graphql: (
      query: string,
      options?: { variables?: Record<string, unknown> },
    ) => Promise<Response>;
  },
  shop: string,
  productIds: string[] = [],
): Promise<StorefrontPreviewProduct | null> {
  try {
    const assignedId = productIds.find(Boolean);
    if (assignedId) {
      const response = await admin.graphql(
        `#graphql
          query previewAssignedProduct($id: ID!) {
            product(id: $id) {
              ${PREVIEW_PRODUCT_FIELDS}
            }
          }`,
        { variables: { id: assignedId } },
      );
      const json = await response.json();
      const assigned = previewProductFromNode(json.data?.product, shop);
      if (assigned) return assigned;
    }

    const response = await admin.graphql(
      `#graphql
        query previewCatalogProduct {
          products(first: 12, query: "status:active") {
            nodes {
              ${PREVIEW_PRODUCT_FIELDS}
            }
          }
        }`,
    );
    const json = await response.json();
    return pickPreviewProduct(json.data?.products?.nodes ?? [], shop);
  } catch {
    return null;
  }
}
