import { PublicPageLayout } from "../components/public/PublicPageLayout";

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "protouserz@proton.me";

export default function SupportPage() {
  return (
    <PublicPageLayout
      title="Support"
      subtitle="BundleStack · Quantity breaks for Shopify"
    >
      <section>
        <h2>Get help</h2>
        <p>
          Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL.split(" ")[0]}`}>{SUPPORT_EMAIL}</a>{" "}
          with your shop domain and a short description of the issue. We
          typically respond within one business day.
        </p>
      </section>

      <section>
        <h2>Common questions</h2>
        <h3>Discount not showing at checkout?</h3>
        <p>
          Confirm the offer is <strong>Active</strong>, the product is included
          in the offer, and the cart quantity meets your tier minimum. Automatic
          discounts apply at checkout — not on the cart page in all themes.
        </p>

        <h3>Widget not visible on the product page?</h3>
        <p>
          Open the theme editor → product template → add the{" "}
          <strong>BundleStack</strong> app block and save. Use the Store health
          panel in the app for one-click fixes.
        </p>

        <h3>Uninstalling the app</h3>
        <p>
          Uninstalling removes BundleStack discounts and offer data automatically.
          Remove the theme block from your product template if you no longer need
          it.
        </p>
      </section>

      <section>
        <h2>Bug reports & feature requests</h2>
        <p>
          Open an issue on{" "}
          <a
            href="https://github.com/protouserz/bundlestack/issues"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>{" "}
          with steps to reproduce and your shop domain (no customer data
          please).
        </p>
      </section>
    </PublicPageLayout>
  );
}
