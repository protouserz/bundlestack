import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  deleteOffer,
  fetchProductTitles,
  getOffer,
  parseOfferForm,
  removeOfferRecord,
  updateOffer,
  updateOfferDiscountIds,
  type DiscountTier,
} from "../models/bundle.server";
import { deleteShopifyDiscounts, replaceOfferDiscounts } from "../models/discount.server";
import { ProductPickerField } from "../components/ProductPickerField";

const fieldStyle = {
  width: "100%",
  maxWidth: "100%",
  padding: "8px",
  marginTop: "8px",
  display: "block",
  boxSizing: "border-box" as const,
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const offer = await getOffer(session.shop, params.id!);

  if (!offer) {
    throw new Response("Not found", { status: 404 });
  }

  const products = await fetchProductTitles(admin, offer.productIds);

  return { offer, products };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const offer = await deleteOffer(session.shop, params.id!);
    await deleteShopifyDiscounts(admin, offer.discountIds);
    await removeOfferRecord(params.id!);
    return redirect("/app/offers");
  }

  try {
    const existing = await getOffer(session.shop, params.id!);
    if (!existing) {
      throw new Response("Not found", { status: 404 });
    }

    const input = parseOfferForm(formData);
    const updated = await updateOffer(session.shop, params.id!, input);
    const discountIds = await replaceOfferDiscounts(
      admin,
      updated,
      existing.discountIds,
    );
    await updateOfferDiscountIds(params.id!, discountIds);
    return redirect(`/app/offers/${params.id}`);
  } catch (error) {
    if (error instanceof Response) {
      return { error: await error.text() };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
};

export default function EditOffer() {
  const { offer, products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [tiers, setTiers] = useState<DiscountTier[]>(offer.tiers);

  const updateTier = (index: number, field: keyof DiscountTier, value: string) => {
    setTiers((current) =>
      current.map((tier, i) => {
        if (i !== index) return tier;
        if (field === "minQty" || field === "discountValue") {
          return { ...tier, [field]: Number(value) || 0 };
        }
        return { ...tier, [field]: value };
      }),
    );
  };

  return (
    <s-page heading="Edit offer">
      <Form method="post">
        <s-stack direction="block" gap="large">
          <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />

          <s-section heading="Offer details">
            <s-stack direction="block" gap="large">
              {actionData?.error && (
                <s-banner tone="critical">{actionData.error}</s-banner>
              )}

              <label style={{ display: "block", width: "100%", maxWidth: "100%" }}>
                <s-text>Offer title</s-text>
                <input
                  name="title"
                  required
                  defaultValue={offer.title}
                  style={fieldStyle}
                />
              </label>

              <label style={{ display: "block", width: "100%", maxWidth: "100%" }}>
                <s-text>Status</s-text>
                <select
                  name="status"
                  defaultValue={offer.status}
                  style={fieldStyle}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>

              <s-stack direction="block" gap="base">
                <s-text>Products</s-text>
                <ProductPickerField initialProducts={products} />
              </s-stack>
            </s-stack>
          </s-section>

          <s-section heading="Quantity tiers">
            <s-stack direction="block" gap="large">
              {tiers.map((tier, index) => (
                <s-box
                  key={index}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="inline" gap="base">
                    <label>
                      Min qty
                      <input
                        type="number"
                        min={2}
                        value={tier.minQty}
                        onChange={(e) => updateTier(index, "minQty", e.target.value)}
                        style={{ width: "80px", padding: "8px", marginLeft: "8px" }}
                      />
                    </label>
                    <label>
                      Discount %
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={tier.discountValue}
                        onChange={(e) =>
                          updateTier(index, "discountValue", e.target.value)
                        }
                        style={{ width: "80px", padding: "8px", marginLeft: "8px" }}
                      />
                    </label>
                    <label>
                      Label
                      <input
                        value={tier.label ?? ""}
                        onChange={(e) => updateTier(index, "label", e.target.value)}
                        style={{ width: "160px", padding: "8px", marginLeft: "8px" }}
                      />
                    </label>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          </s-section>

          <s-stack direction="inline" gap="base" paddingBlockStart="large">
            <s-button type="submit" {...(isSubmitting ? { loading: true } : {})}>
              Save changes
            </s-button>
            <s-button href="/app/offers" variant="tertiary">
              Back
            </s-button>
          </s-stack>
        </s-stack>
      </Form>

      <s-section slot="aside" heading="Performance">
        <s-paragraph>
          <s-text tone="neutral">Revenue generated: </s-text>
          ${offer.revenueGenerated.toFixed(2)}
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Danger zone" paddingBlockStart="large">
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <s-button type="submit" tone="critical" variant="tertiary">
            Delete offer
          </s-button>
        </Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
