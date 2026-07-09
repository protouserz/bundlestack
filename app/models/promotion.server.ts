import prisma from "../db.server";
import { safeJsonParse } from "../utils/json.server";
import {
  PROMOTION_TYPES,
  defaultConfigForType,
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

export function parsePromotionForm(
  formData: FormData,
  expectedType: PromotionType,
): PromotionInput {
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const configRaw = String(formData.get("config") ?? "{}");
  const productIdsRaw = String(formData.get("productIds") ?? "[]");
  const collectionIdsRaw = String(formData.get("collectionIds") ?? "[]");

  if (!title) {
    throw new Response("Title is required", { status: 400 });
  }

  const config = safeJsonParse(
    configRaw,
    defaultConfigForType(expectedType),
  ) as PromotionConfigMap[PromotionType];

  return {
    title,
    promotionType: expectedType,
    status,
    config,
    productIds: safeJsonParse<string[]>(productIdsRaw, []),
    collectionIds: safeJsonParse<string[]>(collectionIdsRaw, []),
  };
}
