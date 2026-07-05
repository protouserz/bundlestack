import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
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
    title: "Pay when you profit",
    text: "Free to start. Plans scale with revenue BundleStack generates — you only pay more when the app earns more for you.",
  },
];

const STEPS = [
  {
    title: "Install & connect",
    text: "Add BundleStack from the Shopify App Store and authorize your store in seconds.",
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

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

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
            The quantity-break app built for Shopify merchants who want more AOV
            without the complexity. Set up tiered bundle discounts in minutes —
            no code required.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>Free</span>
              <span className={styles.statLabel}>to get started</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>2 min</span>
              <span className={styles.statLabel}>average setup</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>$0</span>
              <span className={styles.statLabel}>until you earn</span>
            </div>
          </div>
        </div>

        {showForm && (
          <div className={styles.loginCard}>
            <h2 className={styles.loginTitle}>Open your dashboard</h2>
            <p className={styles.loginSubtitle}>
              Enter your Shopify store domain to log in or install BundleStack.
            </p>
            <Form className={styles.form} method="post" action="/auth/login">
              <label className={styles.label}>
                Shop domain
                <input
                  className={styles.input}
                  type="text"
                  name="shop"
                  placeholder="your-store.myshopify.com"
                  autoComplete="url"
                />
                <span className={styles.hint}>
                  e.g. my-shop.myshopify.com
                </span>
              </label>
              <button className={styles.button} type="submit">
                Log in to BundleStack
              </button>
            </Form>
          </div>
        )}
      </section>

      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className={styles.featuresHeading}>
            Everything you need to grow AOV
          </h2>
          <p className={styles.featuresSubheading}>
            BundleStack focuses on quantity breaks done right — fast setup,
            clean uninstall, and pricing that scales with your success.
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
