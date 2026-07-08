import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  createOffer,
  parseOfferForm,
  updateOfferDiscountIds,
} from "../models/bundle.server";
import { replaceOfferDiscounts } from "../models/discount.server";
import { OfferForm } from "../components/offer-form/OfferForm";
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
    const discountIds = await replaceOfferDiscounts(admin, offer, []);
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
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <s-page>
      <Form method="post" className={styles.offerPage}>
        <OfferForm
          mode="create"
          defaultTitle="Volume Discount Offer"
          defaultStatus="active"
          error={actionData?.error}
          isSubmitting={isSubmitting}
        />
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
