import type { ElementType } from "react";
import { AdminDeepLinkButton, ExternalLinkButton } from "../AdminLink";
import { SButton } from "../polaris";
import { useI18n } from "../../i18n/I18nProvider";
import styles from "./dashboard.module.css";

type SetupGuideProps = {
  hasOffers: boolean;
  customizeOfferHref: string;
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
  customizeOfferHref,
  themeEditorUrl,
  storefrontProductUrl,
  productTitle,
  dismissFetcher,
}: SetupGuideProps) {
  const { t } = useI18n();
  const steps = hasOffers
    ? [
        {
          id: "offer",
          done: false,
          title: t("setup.changeProductsTitle"),
          body: t("setup.changeProductsBody"),
          action: (
            <SButton href={customizeOfferHref} variant="primary">
              {t("dashboard.customizeOffer")}
            </SButton>
          ),
        },
        {
          id: "theme",
          done: false,
          title: t("setup.showWidgetTitle"),
          body: t("setup.showWidgetBody"),
          action: (
            <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
              {t("dashboard.showOnProductPages")}
            </AdminDeepLinkButton>
          ),
        },
        {
          id: "storefront",
          done: false,
          title: t("setup.confirmTitle"),
          body: productTitle
            ? t("setup.confirmBodyNamed", { title: productTitle })
            : t("setup.confirmBody"),
          action: storefrontProductUrl ? (
            <ExternalLinkButton href={storefrontProductUrl}>
              {t("setup.previewLive")}
            </ExternalLinkButton>
          ) : (
            <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
              {t("setup.previewLive")}
            </AdminDeepLinkButton>
          ),
        },
      ]
    : [
        {
          id: "offer",
          done: false,
          title: t("setup.createTitle"),
          body: t("setup.createBody"),
          action: (
            <SButton href="/app/offers/new" variant="primary">
              {t("dashboard.createOffer")}
            </SButton>
          ),
        },
        {
          id: "theme",
          done: false,
          title: t("setup.showOffersTitle"),
          body: t("setup.showOffersBody"),
          action: (
            <AdminDeepLinkButton href={themeEditorUrl} variant="secondary">
              {t("dashboard.showOnProductPages")}
            </AdminDeepLinkButton>
          ),
        },
      ];

  return (
    <s-section heading={t("setup.heading")}>
      <div className={styles.setupGuideHeader}>
        <p className={styles.setupGuideSubtitle}>
          {t("setup.subtitle")}
        </p>
        <dismissFetcher.Form method="post">
          <input type="hidden" name="intent" value="dismiss-onboarding" />
          <SButton
            type="submit"
            variant="tertiary"
            {...(dismissFetcher.state !== "idle" ? { loading: true } : {})}
          >
            {t("common.dismiss")}
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
