import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { SPage } from "../components/polaris";
import prisma from "../db.server";

type ShopContactResponse = {
  data?: {
    shop?: {
      email?: string | null;
      contactEmail?: string | null;
    };
  };
};

async function getSessionProfile(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    select: { email: true, firstName: true, lastName: true },
  });
}

async function resolveMerchantContactEmail(
  admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"],
  sessionEmail?: string | null,
) {
  if (sessionEmail) {
    return sessionEmail;
  }

  const response = await admin.graphql(
    `#graphql
      query shopContactEmail {
        shop {
          email
          contactEmail
        }
      }`,
  );
  const json = (await response.json()) as ShopContactResponse;
  const shop = json.data?.shop;

  return shop?.contactEmail || shop?.email || null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const profile = await getSessionProfile(session.id);

  return {
    shop: session.shop,
    userName:
      [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!subject || !message) {
    return {
      ok: false as const,
      error: "Subject and message are required.",
    };
  }

  const profile = await getSessionProfile(session.id);
  const contactEmail = await resolveMerchantContactEmail(admin, profile?.email);

  console.info(
    JSON.stringify({
      event: "support_request",
      shop: session.shop,
      contactEmail,
      subject,
      message,
    }),
  );

  return {
    ok: true as const,
  };
};

export default function AppSupport() {
  const { shop, userName } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <SPage heading="Support">
      <s-stack direction="block" gap="large">
        {actionData?.ok ? (
          <s-banner tone="success">
            Thanks — your message was received. If a reply is needed, we will use
            the email on your Shopify staff account.
          </s-banner>
        ) : null}

        {actionData && !actionData.ok ? (
          <s-banner tone="critical">{actionData.error}</s-banner>
        ) : null}

        <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
          <s-stack direction="block" gap="base">
            <s-heading>Your Shopify account</s-heading>
            <s-text>Store: {shop}</s-text>
            {userName ? <s-text>Signed in as: {userName}</s-text> : null}
            <s-text>
              Replies go to the email on your Shopify staff account — the same one
              you use to sign in to Shopify admin.
            </s-text>
          </s-stack>
        </s-box>

        <s-section heading="Send a message">
          <Form method="post">
            <s-stack direction="block" gap="base">
              <label>
                <s-text>Subject</s-text>
                <input
                  name="subject"
                  required
                  maxLength={120}
                  placeholder="Brief summary of your issue"
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "8px",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <label>
                <s-text>Message</s-text>
                <textarea
                  name="message"
                  required
                  rows={6}
                  maxLength={4000}
                  placeholder="Include steps to reproduce, offer name, and what you expected to happen."
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "8px",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <s-text tone="neutral">
                Do not include customer names, emails, or order details. We use your
                Shopify login email for follow-up — no separate support address is
                needed.
              </s-text>
              <div>
                <s-button type="submit" variant="primary">
                  Send message
                </s-button>
              </div>
            </s-stack>
          </Form>
        </s-section>

        <s-section heading="Common questions">
          <s-stack direction="block" gap="base">
            <s-text>
              <strong>Discount not at checkout?</strong> Confirm the offer is Active,
              the product is included, and cart quantity meets the tier minimum.
            </s-text>
            <s-text>
              <strong>Widget missing?</strong> Theme editor → product template → add
              the BundleStack block. Check Store health on the Dashboard.
            </s-text>
            <s-text>
              <strong>Uninstalling?</strong> Discounts and offer data are removed
              automatically when you uninstall the app.
            </s-text>
          </s-stack>
        </s-section>
      </s-stack>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
