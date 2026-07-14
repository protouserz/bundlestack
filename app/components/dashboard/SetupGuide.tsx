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
  const steps = [
    {
      id: "offer",
      done: hasOffers,
      title: "Create a quantity-break offer",
      body: "Pick products, set Buy 2 / Buy 3 tiers, and set the offer to Active.",
      action: hasOffers ? null : (
        <SButton href="/app/offers/new" variant="primary">
          Create offer
        </SButton>
      ),
    },
    {
      id: "theme",
      done: false,
      title: "Add the BundleStack block to your product page",
      body: "In the theme editor, add the BundleStack block so shoppers see the tiers.",
      action: (
        <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
          Open theme editor
        </AdminDeepLinkButton>
      ),
    },
    {
      id: "storefront",
      done: false,
      title: "Preview on your storefront",
      body: "Open a product with the offer, pick a tier, and confirm the discount at checkout.",
      action: null,
    },
  ];

  return (
    <section className={styles.setupGuide} aria-label="Setup guide">
      <div className={styles.setupGuideHeader}>
        <div>
          <h2 className={styles.setupGuideTitle}>Set up BundleStack</h2>
          <p className={styles.setupGuideSubtitle}>
            Three quick steps to launch quantity breaks on your store.
          </p>
        </div>
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
    </section>
  );
}
