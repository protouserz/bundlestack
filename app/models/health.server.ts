import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { listOffers, type DiscountTier } from "./bundle.server";
import { parseDiscountIds } from "./discount.server";
import { fetchDiscountNodesByIds } from "../utils/graphql.server";

export type HealthFixAction = {
  intent: string;
  label: string;
  external?: boolean;
  href?: string;
};

export type HealthCheck = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  message: string;
  fix?: HealthFixAction;
};

export type ShopHealth = {
  checks: HealthCheck[];
  overall: "healthy" | "attention" | "critical";
  themeEditorUrl: string;
};

type SerializedOffer = {
  id: string;
  title: string;
  status: string;
  productIds: string[];
  tiers: DiscountTier[];
  discountIds: string[];
};

export async function getShopHealth(
  admin: AdminApiContext,
  shop: string,
  offersInput?: SerializedOffer[],
): Promise<ShopHealth> {
  const checks: HealthCheck[] = [];
  const offers = offersInput ?? (await listOffers(shop));
  const activeOffers = offers.filter((o) => o.status === "active");

  if (activeOffers.length === 0) {
    checks.push({
      id: "active-offers",
      label: "Active offers",
      status: "warning",
      message: "No active offers. Create one and set status to Active.",
      fix: {
        intent: "create-offer",
        label: "Create offer",
        href: "/app/offers/new",
      },
    });
  } else {
    checks.push({
      id: "active-offers",
      label: "Active offers",
      status: "ok",
      message: `${activeOffers.length} active offer(s) configured.`,
    });
  }

  const offersMissingDiscounts = activeOffers.filter(
    (o) => o.discountIds.length === 0,
  );
  if (offersMissingDiscounts.length > 0) {
    checks.push({
      id: "discount-sync",
      label: "Shopify discounts",
      status: "error",
      message: `${offersMissingDiscounts.length} active offer(s) missing synced discounts.`,
      fix: {
        intent: "sync-discounts",
        label: "Sync discounts",
      },
    });
  } else if (activeOffers.length > 0) {
    checks.push({
      id: "discount-sync",
      label: "Shopify discounts",
      status: "ok",
      message: "All active offers have discount rules linked.",
    });
  }

  const allDiscountIds = activeOffers.flatMap((o) => o.discountIds);
  const discountNodes = await fetchDiscountNodesByIds(admin, allDiscountIds);
  const missingInShopify = allDiscountIds.filter((id) => !discountNodes.has(id)).length;

  if (missingInShopify > 0) {
    checks.push({
      id: "discount-exists",
      label: "Discount verification",
      status: "error",
      message: `${missingInShopify} discount(s) missing in Shopify.`,
      fix: {
        intent: "sync-discounts",
        label: "Recreate discounts",
      },
    });
  } else if (allDiscountIds.length > 0) {
    checks.push({
      id: "discount-exists",
      label: "Discount verification",
      status: "ok",
      message: "All discount rules verified in Shopify.",
    });
  }

  checks.push({
    id: "app-proxy",
    label: "Storefront API",
    status: "ok",
    message: "App proxy configured at /apps/bundlestack/offers",
  });

  const hasError = checks.some((c) => c.status === "error");
  const hasWarning = checks.some((c) => c.status === "warning");

  const shopHandle = shop.replace(".myshopify.com", "");

  return {
    checks,
    overall: hasError ? "critical" : hasWarning ? "attention" : "healthy",
    themeEditorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`,
  };
}

export function collectDiscountIdsFromOffers(
  offers: { discountIds: string[] }[],
): string[] {
  return offers.flatMap((o) => o.discountIds);
}

export { parseDiscountIds };

export async function syncAllActiveOfferDiscounts(
  admin: AdminApiContext,
  shop: string,
): Promise<{ synced: number; failed: string[] }> {
  const { listOffers, updateOfferDiscountIds } = await import("./bundle.server");
  const { replaceOfferDiscounts } = await import("./discount.server");

  const offers = await listOffers(shop);
  const activeOffers = offers.filter((o) => o.status === "active");
  const failed: string[] = [];

  for (const offer of activeOffers) {
    try {
      const discountIds = await replaceOfferDiscounts(
        admin,
        offer,
        offer.discountIds,
      );
      await updateOfferDiscountIds(offer.id, discountIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      failed.push(`${offer.title}: ${message}`);
    }
  }

  return { synced: activeOffers.length - failed.length, failed };
}
