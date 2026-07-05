import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { createOffer, parseOfferForm, updateOfferDiscountIds, type DiscountTier } from "../models/bundle.server";
import { replaceOfferDiscounts } from "../models/discount.server";
import { ProductPickerField } from "../components/ProductPickerField";
import { fieldStyle, labelStyle } from "../components/fieldStyles";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const input = parseOfferForm(formData);
    const offer = await createOffer(session.shop, input);
    const discountIds = await replaceOfferDiscounts(admin, offer, []);
    const saved = await updateOfferDiscountIds(offer.id, discountIds);
    return redirect(`/app/offers/${saved.id}`);
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

const DEFAULT_TIERS: DiscountTier[] = [
  { minQty: 2, discountType: "percentage", discountValue: 10, label: "Save 10%" },
  { minQty: 3, discountType: "percentage", discountValue: 15, label: "Save 15%" },
];

export default function NewOffer() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [tiers, setTiers] = useState<DiscountTier[]>(DEFAULT_TIERS);

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

  const addTier = () => {
    setTiers((current) => [
      ...current,
      {
        minQty: (current.at(-1)?.minQty ?? 1) + 1,
        discountType: "percentage",
        discountValue: 20,
        label: "Save 20%",
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers((current) => current.filter((_, i) => i !== index));
  };

  return (
    <s-page heading="Create offer">
      <Form method="post">
        <s-stack direction="block" gap="large">
          <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
            <s-text tone="neutral">
              Set up a quantity-break offer — pick products, define tiers, and
              activate to sync discounts to Shopify automatically.
            </s-text>
          </s-box>

          <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />

          <s-section heading="Offer details">
            <s-stack direction="block" gap="large">
              {actionData?.error && (
                <s-banner tone="critical">{actionData.error}</s-banner>
              )}

              <label style={labelStyle}>
                <s-text>Offer title</s-text>
                <input
                  name="title"
                  required
                  placeholder="Buy more, save more"
                  style={fieldStyle}
                />
              </label>

              <label style={labelStyle}>
                <s-text>Status</s-text>
                <select
                  name="status"
                  defaultValue="draft"
                  style={fieldStyle}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>

              <s-stack direction="block" gap="base">
                <s-text>Products</s-text>
                <ProductPickerField />
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
                    {tiers.length > 1 && (
                      <s-button type="button" variant="tertiary" onClick={() => removeTier(index)}>
                        Remove
                      </s-button>
                    )}
                  </s-stack>
                </s-box>
              ))}
              <s-button type="button" variant="secondary" onClick={addTier}>
                Add tier
              </s-button>
            </s-stack>
          </s-section>

          <s-stack direction="inline" gap="base" paddingBlockStart="large">
            <s-button type="submit" {...(isSubmitting ? { loading: true } : {})}>
              Save offer
            </s-button>
            <s-button href="/app/offers" variant="tertiary">
              Cancel
            </s-button>
          </s-stack>
        </s-stack>
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
