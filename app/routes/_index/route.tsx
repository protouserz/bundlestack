import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import styles from "./styles.module.css";

const APP_STORE_URL = "https://apps.shopify.com/bundlestack";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

const FEATURES = [
  {
    icon: "📦",
    title: "Quantity break offers",
    text: "Create tiered discounts like Buy 2 save 10%, Buy 3 save 15% — synced automatically as Shopify discounts at checkout.",
  },
  {
    icon: "🎨",
    title: "Theme-native widget",
    text: "Drop the BundleStack block on your product page. Shoppers see offers instantly and pick a tier with one click.",
  },
  {
    icon: "💰",
    title: "Simple pricing",
    text: "Free includes unlimited quantity breaks, BOGO, and product-page upsells. Pro is $2/month for extra offer types and email support.",
  },
];

const STEPS = [
  {
    title: "Install & connect",
    text: "Add BundleStack from the Shopify App Store and authorize access through Shopify.",
  },
  {
    title: "Create an offer",
    text: "Pick products, set quantity tiers, and activate — discounts sync to Shopify automatically.",
  },
  {
    title: "Add the widget",
    text: "Enable the theme block on your product template and start boosting average order value.",
  },
];

const COMPARE_ROWS = [
  {
    label: "Typical price",
    us: "Free; Pro $2/mo",
    specialists: "Often $7–30/mo, or a revenue-capped free plan",
    suites: "Often $20–100+/mo",
  },
  {
    label: "Quantity breaks",
    us: "Unlimited, no revenue cap",
    specialists: "Yes — this is the core product",
    suites: "Yes, plus many other offer types",
  },
  {
    label: "BOGO",
    us: "Included on Free",
    specialists: "Usually on a paid plan",
    suites: "Usually included",
  },
  {
    label: "Product-page upsell / FBT",
    us: "Included on Free",
    specialists: "Sometimes",
    suites: "Usually a flagship feature",
  },
  {
    label: "Gifts, mix & match, builders, coupons",
    us: "Pro",
    specialists: "Varies by app",
    suites: "Usually included",
  },
  {
    label: "Checkout discounts",
    us: "Shopify Function — automatic",
    specialists: "Functions on some plans; others still use codes",
    suites: "Usually automatic",
  },
  {
    label: "Product-page widget",
    us: "Theme block + app embed",
    specialists: "Usually",
    suites: "Usually, often more templates",
  },
  {
    label: "Reviews and installs",
    us: "Newer app",
    specialists: "Often thousands of reviews",
    suites: "Often thousands of reviews",
  },
];

const PROS = [
  "No revenue cap on Free for quantity breaks, BOGO, and product-page upsells.",
  "Pro is $2/month — extra offer types plus email support — instead of a $10–30 plan.",
  "Discounts apply at checkout through a Shopify Function, not a code shoppers have to enter.",
  "Uninstall removes the discounts BundleStack created.",
  "Admin stays small: pick products, set tiers, go live.",
];

const CONS = [
  "Fewer public reviews and installs than Bundler, Kaching, Bold, or Rebuy, so social proof is weaker.",
  "The theme embed still needs a Save in the theme editor before the widget shows on the live store.",
  "Mix & match, free gifts, bundle builders, and coupons are Pro-only.",
  "Not a merchandising platform — no email flows, A/B tests, or cart-drawer ecosystem.",
  "Free-gift discounts only apply when the gift is already in the cart.",
];

export default function App() {
  return (
    <div className={styles.index}>
      <section className={styles.hero}>
        <div>
          <div className={styles.brand}>
            <div className={styles.logo}>B</div>
            <span className={styles.brandName}>BundleStack</span>
          </div>

          <h1 className={styles.heading}>
            Turn single orders into{" "}
            <span className={styles.highlight}>bigger carts</span>
          </h1>

          <p className={styles.text}>
            Quantity breaks and volume discounts that grow order value — Buy 2
            save 10%, Buy 3 save 15% — with a product-page widget and automatic
            Shopify discount sync. No code required.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>Free</span>
              <span className={styles.statLabel}>to get started</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>3 steps</span>
              <span className={styles.statLabel}>guided setup</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Unlimited</span>
              <span className={styles.statLabel}>offers included</span>
            </div>
          </div>
        </div>

        <div className={styles.loginCard}>
          <h2 className={styles.loginTitle}>Install on Shopify</h2>
          <p className={styles.loginSubtitle}>
            Add BundleStack from the Shopify App Store, then open it from Apps
            in your admin. Installation and authentication stay on Shopify.
          </p>
          <a className={styles.button} href={APP_STORE_URL}>
            Install on Shopify App Store
          </a>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className={styles.featuresHeading}>
            Everything you need to grow AOV
          </h2>
          <p className={styles.featuresSubheading}>
            BundleStack focuses on quantity breaks done right — fast setup,
            a product-page widget, and pricing that does not scale with your
            revenue.
          </p>
          <ul className={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <li key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.compare} aria-labelledby="compare-heading">
        <div className={styles.compareInner}>
          <h2 id="compare-heading" className={styles.compareHeading}>
            How we compare to other apps
          </h2>
          <p className={styles.compareSubheading}>
            Most quantity-break apps charge $7–30/month or cap the free plan by
            revenue. All-in-one AOV suites cost more and take longer to set up.
            BundleStack keeps the core offers free.
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th scope="col">What you get</th>
                  <th scope="col">BundleStack</th>
                  <th scope="col">Quantity-break apps</th>
                  <th scope="col">AOV suites</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className={styles.usCell}>{row.us}</td>
                    <td>{row.specialists}</td>
                    <td>{row.suites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.compareNote}>
            Specialist apps include listings like Bundler and Kaching.
            AOV suites include broader tools like Bold, Pumper, and Rebuy.
            Competitor prices and features change — check each App Store listing.
          </p>

          <div className={styles.prosCons}>
            <article className={styles.prosCard}>
              <h3 className={styles.prosTitle}>Where BundleStack wins</h3>
              <ul>
                {PROS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.consCard}>
              <h3 className={styles.consTitle}>Where others are stronger</h3>
              <ul>
                {CONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.steps}>
        <div className={styles.stepsInner}>
          <h2 className={styles.stepsHeading}>Up and running in 3 steps</h2>
          <ol className={styles.stepGrid}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <div className={styles.stepNumber}>{index + 1}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          <strong>BundleStack</strong> · Quantity breaks for Shopify · Built for
          merchants who want results, not bloat
        </p>
        <p>
          <a href={APP_STORE_URL} className={styles.footerLink}>
            Shopify App Store
          </a>
          {" · "}
          <a href="/privacy" className={styles.footerLink}>
            Privacy Policy
          </a>
          {" · "}
          <a href="/support" className={styles.footerLink}>
            Support
          </a>
        </p>
      </footer>
    </div>
  );
}
