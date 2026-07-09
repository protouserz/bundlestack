import { Link } from "react-router";
import styles from "./support-footer.module.css";

type AppSupportFooterProps = {
  privacyUrl: string;
};

export function AppSupportFooter({ privacyUrl }: AppSupportFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.label}>Help & trust</p>
        <div className={styles.links}>
          <Link className={styles.link} to="/app/support">
            Support
          </Link>
          <a className={styles.link} href={privacyUrl} target="_blank" rel="noreferrer">
            Privacy policy
          </a>
        </div>
      </div>
    </footer>
  );
}
