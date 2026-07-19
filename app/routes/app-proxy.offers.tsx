import type { LoaderFunctionArgs } from "react-router";
import { authenticate, unauthenticated } from "../shopify.server";
import {
  getActiveOfferBadges,
  getActiveOffersForProduct,
} from "../models/bundle.server";

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

async function resolveAdmin(shop: string, proxyAdmin?: AdminClient | null) {
  if (proxyAdmin) return proxyAdmin;
  try {
    const { admin } = await unauthenticated.admin(shop);
    return admin as AdminClient;
  } catch {
    return null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop: string | null = null;
  let proxyAdmin: AdminClient | null = null;

  try {
    const proxy = await authenticate.public.appProxy(request);
    shop = proxy.session?.shop ?? url.searchParams.get("shop");
    proxyAdmin = (proxy as { admin?: AdminClient }).admin ?? null;
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

  if (url.searchParams.get("badges") === "1") {
    try {
      const admin = await resolveAdmin(shop, proxyAdmin);
      const badges = admin ? await getActiveOfferBadges(shop, admin) : [];
      return new Response(JSON.stringify({ badges }), {
        headers: {
          "Content-Type": "application/json",
          // Shop-scoped config — avoid shared public caches that key poorly.
          "Cache-Control": "private, max-age=60",
          Vary: "Cookie",
        },
      });
    } catch {
      return new Response(JSON.stringify({ badges: [], error: "badge_lookup_failed" }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }
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
      "Cache-Control": "private, max-age=120",
      Vary: "Cookie",
    },
  });
};
