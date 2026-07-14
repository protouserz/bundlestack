import prisma from "../db.server";
import type { CouponAppliesTo, CouponDiscountType } from "./coupon.types";

export type { CouponAppliesTo, CouponDiscountType } from "./coupon.types";

export type CouponInput = {
  title: string;
  code: string;
  status?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  appliesOncePerCustomer?: boolean;
  appliesTo?: CouponAppliesTo;
  productIds?: string[];
  excludedProductIds?: string[];
  usageLimit?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const MAX_INCLUDED_PRODUCTS = 100;
const MAX_EXCLUDED_PRODUCTS = 100;

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function parseProductIdsJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function serializeCoupon(coupon: {
  id: string;
  shop: string;
  title: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: number;
  appliesOncePerCustomer: boolean;
  appliesTo: string;
  productIds: string;
  excludedProductIds: string;
  eligibleCollectionId: string | null;
  usageLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  discountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...coupon,
    discountType: coupon.discountType as CouponDiscountType,
    appliesTo: (coupon.appliesTo === "products"
      ? "products"
      : "all") as CouponAppliesTo,
    productIds: parseProductIdsJson(coupon.productIds),
    excludedProductIds: parseProductIdsJson(coupon.excludedProductIds),
  };
}

export async function listCoupons(shop: string) {
  const coupons = await prisma.coupon.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });
  return coupons.map(serializeCoupon);
}

export async function getCoupon(shop: string, id: string) {
  const coupon = await prisma.coupon.findFirst({ where: { shop, id } });
  return coupon ? serializeCoupon(coupon) : null;
}

export async function getCouponByCode(shop: string, code: string) {
  const coupon = await prisma.coupon.findFirst({
    where: { shop, code: normalizeCode(code) },
  });
  return coupon ? serializeCoupon(coupon) : null;
}

export async function createCoupon(shop: string, input: CouponInput) {
  const appliesTo = input.appliesTo ?? "all";
  const coupon = await prisma.coupon.create({
    data: {
      shop,
      title: input.title.trim(),
      code: normalizeCode(input.code),
      status: input.status ?? "draft",
      discountType: input.discountType,
      discountValue: input.discountValue,
      appliesOncePerCustomer: input.appliesOncePerCustomer ?? true,
      appliesTo,
      productIds: JSON.stringify(
        appliesTo === "products" ? (input.productIds ?? []) : [],
      ),
      excludedProductIds: JSON.stringify(
        appliesTo === "all" ? (input.excludedProductIds ?? []) : [],
      ),
      usageLimit: input.usageLimit ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
  });
  return serializeCoupon(coupon);
}

export async function updateCoupon(
  shop: string,
  id: string,
  input: Partial<CouponInput>,
) {
  const existing = await prisma.coupon.findFirst({ where: { shop, id } });
  if (!existing) {
    throw new Response("Not found", { status: 404 });
  }

  const appliesTo =
    input.appliesTo ??
    (existing.appliesTo === "products" ? "products" : "all");

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.code !== undefined ? { code: normalizeCode(input.code) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.discountType !== undefined
        ? { discountType: input.discountType }
        : {}),
      ...(input.discountValue !== undefined
        ? { discountValue: input.discountValue }
        : {}),
      ...(input.appliesOncePerCustomer !== undefined
        ? { appliesOncePerCustomer: input.appliesOncePerCustomer }
        : {}),
      ...(input.appliesTo !== undefined ? { appliesTo: input.appliesTo } : {}),
      ...(input.productIds !== undefined || input.appliesTo !== undefined
        ? {
            productIds: JSON.stringify(
              appliesTo === "products"
                ? (input.productIds ??
                    parseProductIdsJson(existing.productIds))
                : [],
            ),
          }
        : {}),
      ...(input.excludedProductIds !== undefined ||
      input.appliesTo !== undefined
        ? {
            excludedProductIds: JSON.stringify(
              appliesTo === "all"
                ? (input.excludedProductIds ??
                    parseProductIdsJson(existing.excludedProductIds))
                : [],
            ),
          }
        : {}),
      ...(input.usageLimit !== undefined
        ? { usageLimit: input.usageLimit }
        : {}),
      ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
    },
  });

  return serializeCoupon(coupon);
}

export async function updateCouponDiscountId(
  id: string,
  discountId: string | null,
  shop?: string,
) {
  const result = await prisma.coupon.updateMany({
    where: shop ? { id, shop } : { id },
    data: { discountId },
  });
  if (result.count === 0) {
    throw new Response("Not found", { status: 404 });
  }
  const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id } });
  return serializeCoupon(coupon);
}

export async function updateCouponEligibleCollectionId(
  id: string,
  eligibleCollectionId: string | null,
  shop?: string,
) {
  const result = await prisma.coupon.updateMany({
    where: shop ? { id, shop } : { id },
    data: { eligibleCollectionId },
  });
  if (result.count === 0) {
    throw new Response("Not found", { status: 404 });
  }
  const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id } });
  return serializeCoupon(coupon);
}

export async function deleteCoupon(shop: string, id: string) {
  const coupon = await prisma.coupon.findFirst({ where: { shop, id } });
  if (!coupon) {
    throw new Response("Not found", { status: 404 });
  }
  return serializeCoupon(coupon);
}

export async function removeCouponRecord(id: string, shop?: string) {
  await prisma.coupon.deleteMany({
    where: shop ? { id, shop } : { id },
  });
}

export async function deleteAllCoupons(shop: string) {
  const coupons = await prisma.coupon.findMany({ where: { shop } });
  await prisma.coupon.deleteMany({ where: { shop } });
  return coupons.map(serializeCoupon);
}

function parseProductIdList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function assertProductGids(ids: string[], label: string) {
  for (const id of ids) {
    if (!PRODUCT_GID.test(id)) {
      throw new Response(
        `Invalid ${label} product ID "${id}". Use the product picker.`,
        { status: 400 },
      );
    }
  }
}

export function parseCouponForm(formData: FormData): CouponInput {
  const title = String(formData.get("title") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const discountTypeRaw = String(formData.get("discountType") ?? "percentage");
  const discountValue = Number(formData.get("discountValue") ?? 0);
  const appliesOncePerCustomer =
    String(formData.get("appliesOncePerCustomer") ?? "true") === "true";
  const appliesToRaw = String(formData.get("appliesTo") ?? "all");
  const appliesTo: CouponAppliesTo =
    appliesToRaw === "products" ? "products" : "all";
  const productIds = parseProductIdList(
    String(formData.get("productIds") ?? ""),
  );
  const excludedProductIds = parseProductIdList(
    String(formData.get("excludedProductIds") ?? ""),
  );
  const usageLimitRaw = String(formData.get("usageLimit") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();

  if (!title) {
    throw new Response("Title is required", { status: 400 });
  }
  if (!code) {
    throw new Response("Coupon code is required", { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]+$/.test(code.replace(/\s+/g, ""))) {
    throw new Response(
      "Coupon code can only include letters, numbers, hyphens, and underscores",
      { status: 400 },
    );
  }

  const discountType: CouponDiscountType =
    discountTypeRaw === "fixed" ? "fixed" : "percentage";

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Response("Discount value must be greater than 0", { status: 400 });
  }
  if (discountType === "percentage" && discountValue > 100) {
    throw new Response("Percentage discount cannot exceed 100%", {
      status: 400,
    });
  }

  if (appliesTo === "products") {
    if (productIds.length === 0) {
      throw new Response("Select at least one product for this coupon", {
        status: 400,
      });
    }
    if (productIds.length > MAX_INCLUDED_PRODUCTS) {
      throw new Response(
        `A coupon can include at most ${MAX_INCLUDED_PRODUCTS} products`,
        { status: 400 },
      );
    }
    assertProductGids(productIds, "included");
  } else {
    if (excludedProductIds.length > MAX_EXCLUDED_PRODUCTS) {
      throw new Response(
        `A coupon can exclude at most ${MAX_EXCLUDED_PRODUCTS} products`,
        { status: 400 },
      );
    }
    assertProductGids(excludedProductIds, "excluded");
  }

  const allowedStatuses = new Set(["active", "draft", "paused"]);
  if (!allowedStatuses.has(status)) {
    throw new Response("Invalid coupon status", { status: 400 });
  }

  let usageLimit: number | null = null;
  if (usageLimitRaw) {
    usageLimit = Number(usageLimitRaw);
    if (!Number.isInteger(usageLimit) || usageLimit < 1) {
      throw new Response("Usage limit must be a positive whole number", {
        status: 400,
      });
    }
  }

  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw new Response("Invalid start date", { status: 400 });
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Response("Invalid end date", { status: 400 });
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new Response("End date must be after start date", { status: 400 });
  }

  return {
    title,
    code: normalizeCode(code),
    status,
    discountType,
    discountValue,
    appliesOncePerCustomer,
    appliesTo,
    productIds: appliesTo === "products" ? productIds : [],
    excludedProductIds: appliesTo === "all" ? excludedProductIds : [],
    usageLimit,
    startsAt,
    endsAt,
  };
}

/** Pure helper: filter catalog IDs to those eligible after exclusions. */
export function filterEligibleProductIds(
  catalogProductIds: string[],
  excludedProductIds: string[],
) {
  const excluded = new Set(excludedProductIds);
  return catalogProductIds.filter((id) => !excluded.has(id));
}
