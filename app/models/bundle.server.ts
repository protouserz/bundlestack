import prisma from "../db.server";

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
  return JSON.parse(raw) as DiscountTier[];
}

function parseProductIds(raw: string): string[] {
  return JSON.parse(raw) as string[];
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
  revenueGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...offer,
    productIds: parseProductIds(offer.productIds),
    tiers: parseTiers(offer.tiers),
    discountIds: offer.discountIds ? (JSON.parse(offer.discountIds) as string[]) : [],
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
    .filter((offer) => offer.productIds.includes(productId));
}

export async function getShopStats(shop: string) {
  const [offers, settings] = await Promise.all([
    prisma.bundleOffer.findMany({ where: { shop } }),
    prisma.shopSettings.findUnique({ where: { shop } }),
  ]);

  const activeOffers = offers.filter((o) => o.status === "active").length;
  const totalRevenue = offers.reduce((sum, o) => sum + o.revenueGenerated, 0);

  return {
    totalOffers: offers.length,
    activeOffers,
    totalRevenue,
    billingPlan: settings?.billingPlan ?? "free",
  };
}

export async function ensureShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export function parseOfferForm(formData: FormData): BundleOfferInput {
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const productIdsRaw = String(formData.get("productIds") ?? "");
  const tiersRaw = String(formData.get("tiers") ?? "[]");

  const productIds = productIdsRaw
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);

  const tiers = JSON.parse(tiersRaw) as DiscountTier[];

  if (!title) {
    throw new Response("Title is required", { status: 400 });
  }

  if (productIds.length === 0) {
    throw new Response("At least one product ID is required", { status: 400 });
  }

  if (tiers.length === 0) {
    throw new Response("At least one quantity tier is required", { status: 400 });
  }

  return { title, status, productIds, tiers };
}
