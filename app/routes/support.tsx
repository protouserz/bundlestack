import { PublicPageLayout } from "../components/public/PublicPageLayout";

export default function SupportPage() {
  return (
    <PublicPageLayout
      title="Support"
      subtitle="BundleStack · Quantity breaks for Shopify"
    >
      <section>
        <h2>Get help in Shopify admin</h2>
        <p>
          Open <strong>BundleStack</strong> from your Shopify admin sidebar and go
          to <strong>Support</strong>. Messages are tied to your Shopify staff
          account — we reply to the email on your Shopify login, not a public
          inbox.
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
          Use the in-app Support page from your Shopify admin. Include your shop
          domain, steps to reproduce, and what you expected — no customer personal
          data, please.
        </p>
      </section>
    </PublicPageLayout>
  );
}
