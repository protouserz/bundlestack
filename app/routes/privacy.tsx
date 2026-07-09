import { PublicPageLayout } from "../components/public/PublicPageLayout";

export default function PrivacyPolicy() {
  return (
    <PublicPageLayout
      title="Privacy Policy"
      subtitle="Last updated: July 2026 · BundleStack Shopify App"
    >
      <section>
        <h2>Overview</h2>
        <p>
          BundleStack (&quot;we&quot;, &quot;the app&quot;) helps Shopify merchants
          create quantity-break and bundle discount offers. This policy describes
          what data the app processes and how we handle privacy requests.
        </p>
      </section>

      <section>
        <h2>Data we store</h2>
        <ul>
          <li>Shop domain and OAuth session tokens (required to operate the app)</li>
          <li>Offer configuration (titles, product IDs, discount tiers, status)</li>
          <li>Discount redemption counts from synced Shopify automatic discounts</li>
          <li>Shopify discount IDs created by the app</li>
        </ul>
      </section>

      <section>
        <h2>Data we do not store</h2>
        <ul>
          <li>Customer names, emails, or phone numbers</li>
          <li>Individual order details or line-item contents</li>
          <li>Payment or billing card information (Shopify handles billing)</li>
        </ul>
      </section>

      <section>
        <h2>Data retention & deletion</h2>
        <p>
          When you uninstall BundleStack, we delete Shopify discounts created by
          the app and remove your offer data. A <code>shop/redact</code> compliance
          webhook erases remaining shop records and OAuth sessions within 48 hours
          of uninstall.
        </p>
      </section>

      <section>
        <h2>Customer data requests</h2>
        <p>
          Because BundleStack does not store customer personal data, there is
          typically nothing to export or redact per customer. If you receive a
          customer data request, you may inform the customer that this app does
          not retain their personal information.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions, open BundleStack in your Shopify admin and go
          to <strong>Support</strong>. We reply using the email on your Shopify
          staff account.
        </p>
      </section>
    </PublicPageLayout>
  );
}
