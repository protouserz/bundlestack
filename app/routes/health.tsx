import type { LoaderFunctionArgs } from "react-router";

/** Fast liveness probe for Render / uptime monitors (no auth). */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  return Response.json(
    { ok: true, service: "bundlestack" },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
};
