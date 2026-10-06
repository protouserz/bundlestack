import type { ElementType } from "react";
import { AdminDeepLinkButton, ExternalLinkButton } from "../AdminLink";
import { SButton } from "../polaris";
import styles from "./dashboard.module.css";

type SetupGuideProps = {
  hasOffers: boolean;
  themeEditorUrl: string;
  storefrontProductUrl?: string | null;
  productTitle?: string | null;
  dismissFetcher: {
    Form: ElementType;
    state: string;
  };
};

/**
 * Concise, dismissible onboarding (BFS 4.2.2 / 4.2.3).
 * Shown until the merchant completes setup or dismisses.
 */
export function SetupGuide({
  hasOffers,
  themeEditorUrl,
  storefrontProductUrl,
  productTitle,
  dismissFetcher,
}: SetupGuideProps) {
  const steps = hasOffers
    ? [
        {
          id: "offer",
          done: true,
          title: "Checkout discounts are on",
          body: "Buy 2 save 10% and Buy 3 save 15% already apply at checkout on every product. Add a buy-one-get-one-free offer anytime.",
          action: null,
        },
        {
          id: "theme",
          done: false,
          title: "Show this on product pages",
          body: "Checkout already works. One Save in the theme editor puts the same widget above Add to cart.",
          action: (
            <AdminDeepLinkButton href={themeEditorUrl} variant="primary">
              Show on product pages
            </AdminDeepLinkButton>
          ),
        },
        {
          id: "storefront",
          done: false,
          title: "Confirm on a live product",
          body: productTitle
            ? `After you save the theme, open ${productTitle}. The same widget should appear above Add to cart.`
            : "After you save the theme, open any product. The same widget should appear above Add to cart.",
          action: storefrontProductUrl ? (
            <ExternalLinkButton href={storefrontProductUrl}>
              Preview on a live product
            </ExternalLinkButton>
          ) : (
            <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
              Preview on a live product
            </AdminDeepLinkButton>
          ),
        },
      ]
    : [
        {
          id: "offer",
          done: false,
          title: "Create an offer",
          body: "Set Buy 2 / Buy 3 quantity breaks or a buy-one-get-one-free deal, then set the offer to Active.",
          action: (
            <SButton href="/app/offers/new" variant="primary">
              Create offer
            </SButton>
          ),
        },
        {
          id: "theme",
          done: false,
          title: "Show offers on product pages",
          body: "Checkout already works once an offer is active. One Save in the theme editor puts the widget on product pages.",
          action: (
            <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
              Show on product pages
            </AdminDeepLinkButton>
          ),
        },
      ];

  return (
    <s-section heading="Optional: show it on product pages">
      <div className={styles.setupGuideHeader}>
        <p className={styles.setupGuideSubtitle}>
          Checkout already has Buy 2 / Buy 3. Save the theme embed if you want
          the widget on product pages before you leave.
        </p>
        <dismissFetcher.Form method="post">
          <input type="hidden" name="intent" value="dismiss-onboarding" />
          <SButton
            type="submit"
            variant="tertiary"
            {...(dismissFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Dismiss
          </SButton>
        </dismissFetcher.Form>
      </div>

      <ol className={styles.setupSteps}>
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={
              step.done ? styles.setupStepDone : styles.setupStep
            }
          >
            <span className={styles.setupStepIndex} aria-hidden="true">
              {step.done ? "✓" : index + 1}
            </span>
            <div className={styles.setupStepBody}>
              <p className={styles.setupStepTitle}>{step.title}</p>
              <p className={styles.setupStepText}>{step.body}</p>
              {step.action}
            </div>
          </li>
        ))}
      </ol>
    </s-section>
  );
}
