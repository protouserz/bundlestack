import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import styles from "./public.module.css";

type PublicPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function PublicPageLayout({
  title,
  subtitle,
  children,
}: PublicPageLayoutProps) {
  const location = useLocation();

  const navClass = (path: string) =>
    location.pathname === path
      ? `${styles.navLink} ${styles.navLinkActive}`
      : styles.navLink;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">
              B
            </span>
            <span className={styles.brandName}>BundleStack</span>
          </Link>
          <nav className={styles.nav} aria-label="Public pages">
            <Link to="/privacy" className={navClass("/privacy")}>
              Privacy
            </Link>
            <Link to="/support" className={navClass("/support")}>
              Support
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        <div className={styles.content}>{children}</div>
      </main>

      <footer className={styles.footer}>
        <p>
          <strong>BundleStack</strong> · Quantity breaks for Shopify
        </p>
        <p>
          <Link to="/" className={styles.footerLink}>
            Home
          </Link>
          {" · "}
          <Link to="/privacy" className={styles.footerLink}>
            Privacy
          </Link>
          {" · "}
          <Link to="/support" className={styles.footerLink}>
            Support
          </Link>
        </p>
      </footer>
    </div>
  );
}
