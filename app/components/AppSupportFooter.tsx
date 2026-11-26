import { ExternalLinkButton } from "./AdminLink";
import { SButton } from "./polaris";
import { useI18n } from "../i18n/I18nProvider";
import styles from "./support-footer.module.css";

type AppSupportFooterProps = {
  privacyUrl: string;
};

export function AppSupportFooter({ privacyUrl }: AppSupportFooterProps) {
  const { t } = useI18n();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <s-text tone="neutral">{t("footer.helpTrust")}</s-text>
        <div className={styles.actions}>
          <SButton variant="secondary" href="/app/support">
            {t("footer.support")}
          </SButton>
          <ExternalLinkButton href={privacyUrl}>
            {t("footer.privacy")}
          </ExternalLinkButton>
        </div>
      </div>
    </footer>
  );
}
