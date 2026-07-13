import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { isE2EAuthBypassEnabled } from "../e2e-auth.server";
import { getActiveOffersForProduct } from "../models/bundle.server";
import { getActivePromotionsForProduct } from "../models/promotion.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop: string | null = null;
  const e2eBypass = isE2EAuthBypassEnabled();

  try {
    const { session } = await authenticate.public.appProxy(request);
    shop = session?.shop ?? null;
  } catch {
    if (process.env.NODE_ENV === "production" && !e2eBypass) {
      return new Response(
        JSON.stringify({ offers: [], promotions: [], error: "unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // Never trust ?shop= in production — only signed app-proxy sessions are valid.
  // E2E bypass (local Playwright) is an intentional exception.
  if (!shop && (process.env.NODE_ENV !== "production" || e2eBypass)) {
    shop = url.searchParams.get("shop");
  }

  if (!shop) {
    return new Response(
      JSON.stringify({ offers: [], promotions: [], error: "unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const productId = url.searchParams.get("product_id");

  if (!productId) {
    return new Response(JSON.stringify({ error: "product_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [offers, promotions] = await Promise.all([
    getActiveOffersForProduct(shop, productId),
    getActivePromotionsForProduct(shop, productId),
  ]);

  return new Response(JSON.stringify({ offers, promotions }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
    },
  });
};
