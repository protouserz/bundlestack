import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, redirect, useActionData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  createOffer,
  parseOfferForm,
  updateOfferDiscountIds,
} from "../models/bundle.server";
import { applyOfferDiscountSync } from "../models/discount.server";
import { OfferForm } from "../components/offer-form/OfferForm";
import { SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

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
    const discountIds = await applyOfferDiscountSync(admin, offer, []);
    await updateOfferDiscountIds(offer.id, discountIds);
    return redirect("/app/offers");
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

export default function NewOffer() {
  const actionData = useActionData<typeof action>();
  const [formKey, setFormKey] = useState(0);

  return (
    <SPage heading="Create offer">
      <Form
        key={formKey}
        method="post"
        className={styles.offerPage}
        data-save-bar
        data-discard-confirmation
        onReset={() => setFormKey((current) => current + 1)}
      >
        <OfferForm
          key={formKey}
          mode="create"
          defaultTitle="Volume Discount Offer"
          defaultStatus="active"
          error={actionData?.error}
        />
      </Form>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
