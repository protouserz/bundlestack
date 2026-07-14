import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router";
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
} from "../models/bundle.server";
import { applyOfferDiscountSync, deleteShopifyDiscounts } from "../models/discount.server";
import { OfferForm } from "../components/offer-form/OfferForm";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/offer-form/offer-form.module.css";

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
    const discountIds = await applyOfferDiscountSync(
      admin,
      updated,
      existing.discountIds,
    );
    await updateOfferDiscountIds(params.id!, discountIds);
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

export default function EditOffer() {
  const { offer, products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const deleteFetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const isDeleting = deleteFetcher.state !== "idle";
  const isSaving = navigation.state === "submitting";
  const formId = "edit-offer-form";

  return (
    <SPage heading="Edit offer">
      <Form
        id={formId}
        key={formKey}
        method="post"
        className={styles.offerPage}
        data-save-bar
        data-discard-confirmation
        onReset={() => setFormKey((current) => current + 1)}
      >
        <OfferForm
          key={formKey}
          mode="edit"
          defaultTitle={offer.title}
          defaultStatus={offer.status}
          defaultOfferType={offer.offerType}
          initialProducts={products}
          initialTiers={offer.tiers}
          error={actionData?.error}
          discountUses={offer.discountUses}
          discountCount={offer.discountIds.length}
          isSaving={isSaving}
          deleteButton={
            <SButton
              type="button"
              tone="critical"
              variant="tertiary"
              {...(isDeleting ? { loading: true } : {})}
              onClick={() =>
                deleteFetcher.submit({ intent: "delete" }, { method: "post" })
              }
            >
              Delete offer
            </SButton>
          }
        />
      </Form>
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
