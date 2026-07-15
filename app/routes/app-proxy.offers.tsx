import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getActiveOffersForProduct } from "../models/bundle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop: string | null = null;

  try {
    const { session } = await authenticate.public.appProxy(request);
    shop = session?.shop ?? null;
  } catch {
    if (process.env.NODE_ENV === "production") {
      return new Response(JSON.stringify({ offers: [], error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Never trust ?shop= in production — only signed app-proxy sessions are valid.
  if (!shop && process.env.NODE_ENV !== "production") {
    shop = url.searchParams.get("shop");
  }

  if (!shop) {
    return new Response(JSON.stringify({ offers: [], error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const productId = url.searchParams.get("product_id");

  if (!productId) {
    return new Response(JSON.stringify({ error: "product_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const offers = await getActiveOffersForProduct(shop, productId);

  return new Response(JSON.stringify({ offers }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
};
