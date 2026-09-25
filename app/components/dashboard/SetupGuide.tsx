import type { ElementType } from "react";
import { AdminDeepLinkButton } from "../AdminLink";
import { SButton } from "../polaris";
import styles from "./dashboard.module.css";

type SetupGuideProps = {
  hasOffers: boolean;
  themeEditorUrl: string;
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
  dismissFetcher,
}: SetupGuideProps) {
  const steps = hasOffers
    ? [
        {
          id: "offer",
          done: true,
          title: "Quantity breaks are ready",
          body: "Buy 2 save 10% and Buy 3 save 15% apply to all products. Edit the offer anytime.",
          action: null,
        },
        {
          id: "theme",
          done: false,
          title: "Show offers on product pages",
          body: "Open the theme editor, enable BundleStack qty breaks, and save. Shoppers will not see tiers until this is on.",
          action: (
            <AdminDeepLinkButton href={themeEditorUrl} variant="primary">
              Show on product pages
            </AdminDeepLinkButton>
          ),
        },
        {
          id: "storefront",
          done: false,
          title: "Preview a live product page",
          body: "Open any product, pick Buy 2 or Buy 3, and confirm the discount at checkout.",
          action: null,
        },
      ]
    : [
        {
          id: "offer",
          done: false,
          title: "Create a quantity-break offer",
          body: "Set Buy 2 / Buy 3 tiers and set the offer to Active.",
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
          body: "Open the theme editor, enable BundleStack quantity breaks, and save.",
          action: (
            <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
              Show on product pages
            </AdminDeepLinkButton>
          ),
        },
      ];

  return (
    <s-section heading="Get your first discount live">
      <div className={styles.setupGuideHeader}>
        <p className={styles.setupGuideSubtitle}>
          One theme save is what most merchants miss. Do that before anything else.
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
