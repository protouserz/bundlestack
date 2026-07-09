import { SButton } from "./polaris";
import styles from "./support-footer.module.css";

type AppSupportFooterProps = {
  privacyUrl: string;
};

export function AppSupportFooter({ privacyUrl }: AppSupportFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <s-text tone="neutral">Help & trust</s-text>
        <div className={styles.actions}>
          <SButton variant="secondary" href="/app/support">
            Support
          </SButton>
          <SButton variant="secondary" href={privacyUrl} target="_blank">
            Privacy policy
          </SButton>
        </div>
      </div>
    </footer>
  );
}
