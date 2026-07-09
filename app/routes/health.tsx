import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";

/** Liveness probe for Render / uptime monitors (no auth). */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      { ok: true, service: "bundlestack", database: "ok" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { ok: false, service: "bundlestack", database: "error" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
};
