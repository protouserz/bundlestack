import prisma from "../db.server";
import { safeJsonParse } from "../utils/json.server";
import {
  PROMOTION_TYPES,
  defaultConfigForType,
  summarizePromotionConfig,
  type BundleBuilderConfig,
  type FbtConfig,
  type FreeGiftConfig,
  type PromotionConfigMap,
  type PromotionRecord,
  type PromotionType,
} from "./promotion.types";

export type PromotionInput = {
  title: string;
  promotionType: PromotionType;
  status?: string;
  config?: PromotionConfigMap[PromotionType];
  productIds?: string[];
  collectionIds?: string[];
};

function isPromotionType(value: string): value is PromotionType {
  return (PROMOTION_TYPES as readonly string[]).includes(value);
}

export function serializePromotion(row: {
  id: string;
  shop: string;
  title: string;
  promotionType: string;
  status: string;
  config: string;
  productIds: string;
  collectionIds: string;
  discountIds: string;
  discountUses: number;
  revenueGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}): PromotionRecord {
  const promotionType = isPromotionType(row.promotionType)
    ? row.promotionType
    : "bogo";

  return {
    id: row.id,
    shop: row.shop,
    title: row.title,
    promotionType,
    status: row.status,
    config: safeJsonParse(
      row.config,
      defaultConfigForType(promotionType),
    ) as PromotionConfigMap[PromotionType],
    productIds: safeJsonParse<string[]>(row.productIds, []),
    collectionIds: safeJsonParse<string[]>(row.collectionIds, []),
    discountIds: safeJsonParse<string[]>(row.discountIds, []),
    discountUses: row.discountUses,
    revenueGenerated: row.revenueGenerated,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPromotions(shop: string, type?: PromotionType) {
  const rows = await prisma.promotion.findMany({
    where: {
      shop,
      ...(type ? { promotionType: type } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(serializePromotion);
}

export type StorefrontPromotion = {
  id: string;
  title: string;
  promotionType: PromotionType;
  summary: string;
  config: PromotionConfigMap[PromotionType];
  productIds: string[];
  giftProductIds?: string[];
  recommendedProductIds?: string[];
  steps?: BundleBuilderConfig["steps"];
};

function promotionAppliesToProduct(
  promotion: PromotionRecord,
  productId: string,
): boolean {
  switch (promotion.promotionType) {
    case "bogo":
    case "mix_match":
      return (
        promotion.productIds.length === 0 ||
        promotion.productIds.includes(productId)
      );
    case "free_gift": {
      const gift = promotion.config as FreeGiftConfig;
      const gifts = gift.giftProductIds ?? [];
      if (promotion.productIds.length === 0) return true;
      return (
        promotion.productIds.includes(productId) || gifts.includes(productId)
      );
    }
    case "bundle_builder": {
      const builder = promotion.config as BundleBuilderConfig;
      const stepIds = (builder.steps ?? []).flatMap((step) => step.productIds);
      return (
        promotion.productIds.includes(productId) ||
        stepIds.includes(productId)
      );
    }
    case "fbt": {
      const fbt = promotion.config as FbtConfig;
      const anchors =
        fbt.anchorProductIds?.length > 0
          ? fbt.anchorProductIds
          : promotion.productIds;
      const recommended = fbt.recommendedProductIds ?? [];
      return (
        anchors.includes(productId) || recommended.includes(productId)
      );
    }
    default:
      return false;
  }
}

/** Active promotions that apply to a storefront product (app proxy). */
export async function getActivePromotionsForProduct(
  shop: string,
  productId: string,
): Promise<StorefrontPromotion[]> {
  const promotions = await listPromotions(shop);
  return promotions
    .filter(
      (promotion) =>
        promotion.status === "active" &&
        promotionAppliesToProduct(promotion, productId),
    )
    .map((promotion) => {
      const base: StorefrontPromotion = {
        id: promotion.id,
        title: promotion.title,
        promotionType: promotion.promotionType,
        summary: summarizePromotionConfig(
          promotion.promotionType,
          promotion.config,
        ),
        config: promotion.config,
        productIds: promotion.productIds,
      };

      if (promotion.promotionType === "free_gift") {
        base.giftProductIds =
          (promotion.config as FreeGiftConfig).giftProductIds ?? [];
      }
      if (promotion.promotionType === "fbt") {
        const fbt = promotion.config as FbtConfig;
        base.recommendedProductIds = fbt.recommendedProductIds ?? [];
      }
      if (promotion.promotionType === "bundle_builder") {
        base.steps = (promotion.config as BundleBuilderConfig).steps ?? [];
      }
      return base;
    });
}

export async function getPromotion(shop: string, id: string) {
  const row = await prisma.promotion.findFirst({ where: { shop, id } });
  return row ? serializePromotion(row) : null;
}

export async function createPromotion(shop: string, input: PromotionInput) {
  const config = input.config ?? defaultConfigForType(input.promotionType);
  const row = await prisma.promotion.create({
    data: {
      shop,
      title: input.title.trim(),
      promotionType: input.promotionType,
      status: input.status ?? "draft",
      config: JSON.stringify(config),
      productIds: JSON.stringify(input.productIds ?? []),
      collectionIds: JSON.stringify(input.collectionIds ?? []),
      discountIds: "[]",
    },
  });
  return serializePromotion(row);
}

export async function updatePromotion(
  shop: string,
  id: string,
  input: Partial<PromotionInput>,
) {
  const existing = await prisma.promotion.findFirst({ where: { shop, id } });
  if (!existing) {
    throw new Response("Not found", { status: 404 });
  }

  const row = await prisma.promotion.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.config !== undefined
        ? { config: JSON.stringify(input.config) }
        : {}),
      ...(input.productIds !== undefined
        ? { productIds: JSON.stringify(input.productIds) }
        : {}),
      ...(input.collectionIds !== undefined
        ? { collectionIds: JSON.stringify(input.collectionIds) }
        : {}),
    },
  });

  return serializePromotion(row);
}

export async function updatePromotionDiscountIds(
  id: string,
  discountIds: string[],
) {
  const row = await prisma.promotion.update({
    where: { id },
    data: { discountIds: JSON.stringify(discountIds) },
  });
  return serializePromotion(row);
}

export async function deletePromotion(shop: string, id: string) {
  const row = await prisma.promotion.findFirst({ where: { shop, id } });
  if (!row) {
    throw new Response("Not found", { status: 404 });
  }
  return serializePromotion(row);
}

export async function removePromotionRecord(id: string) {
  await prisma.promotion.delete({ where: { id } });
}

export async function deletePromotionsByType(shop: string, type: PromotionType) {
  const rows = await prisma.promotion.findMany({
    where: { shop, promotionType: type },
  });
  await prisma.promotion.deleteMany({
    where: { shop, promotionType: type },
  });
  return rows.map(serializePromotion);
}

function parseIdList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    return safeJsonParse<string[]>(trimmed, []).filter(Boolean);
  }

  return trimmed
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function assertProductGids(ids: string[], label: string) {
  for (const id of ids) {
    if (!/^gid:\/\/shopify\/Product\/\d+$/.test(id)) {
      throw new Response(
        `Invalid ${label} "${id}". Use the product picker.`,
        { status: 400 },
      );
    }
  }
}

export function parsePromotionForm(
  formData: FormData,
  expectedType: PromotionType,
): PromotionInput {
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const configRaw = String(formData.get("config") ?? "{}");
  const productIdsRaw = String(formData.get("productIds") ?? "");
  const collectionIdsRaw = String(formData.get("collectionIds") ?? "[]");
  const getProductIdsRaw = String(formData.get("getProductIds") ?? "");
  const giftProductIdsRaw = String(formData.get("giftProductIds") ?? "");
  const recommendedProductIdsRaw = String(
    formData.get("recommendedProductIds") ?? "",
  );

  if (!title) {
    throw new Response("Title is required", { status: 400 });
  }

  const config = safeJsonParse(
    configRaw,
    defaultConfigForType(expectedType),
  ) as PromotionConfigMap[PromotionType];

  const productIds = parseIdList(productIdsRaw);
  assertProductGids(productIds, "product ID");

  if (expectedType === "bogo") {
    const bogo = config as PromotionConfigMap["bogo"];
    const getProductIds = parseIdList(getProductIdsRaw);
    assertProductGids(getProductIds, "get product ID");
    bogo.getProductIds = getProductIds;
  }

  if (expectedType === "free_gift") {
    const gift = config as PromotionConfigMap["free_gift"];
    const giftProductIds = parseIdList(giftProductIdsRaw);
    assertProductGids(giftProductIds, "gift product ID");
    gift.giftProductIds = giftProductIds;
  }

  if (expectedType === "fbt") {
    const fbt = config as PromotionConfigMap["fbt"];
    fbt.anchorProductIds = productIds;
    const recommendedProductIds = parseIdList(recommendedProductIdsRaw);
    assertProductGids(recommendedProductIds, "recommended product ID");
    fbt.recommendedProductIds = recommendedProductIds;
  }

  return {
    title,
    promotionType: expectedType,
    status,
    config,
    productIds,
    collectionIds: parseIdList(collectionIdsRaw),
  };
}
