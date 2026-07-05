import { Link } from "react-router";

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "3rem 1.5rem",
        fontFamily: "Inter, system-ui, sans-serif",
        lineHeight: 1.6,
        color: "#1e293b",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        Last updated: July 2026 · BundleStack Shopify App
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Overview</h2>
        <p>
          BundleStack (&quot;we&quot;, &quot;the app&quot;) helps Shopify merchants
          create quantity-break and bundle discount offers. This policy describes
          what data the app processes and how we handle privacy requests.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Data we store</h2>
        <ul>
          <li>Shop domain and OAuth session tokens (required to operate the app)</li>
          <li>Offer configuration (titles, product IDs, discount tiers, status)</li>
          <li>Aggregate revenue attributed to offers (currency amount only)</li>
          <li>Shopify discount IDs created by the app</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Data we do not store</h2>
        <ul>
          <li>Customer names, emails, or phone numbers</li>
          <li>Individual order details or line-item contents</li>
          <li>Payment or billing card information (Shopify handles billing)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Data retention & deletion</h2>
        <p>
          When you uninstall BundleStack, we delete Shopify discounts created by
          the app and remove your offer data. A{" "}
          <code>shop/redact</code> compliance webhook erases any remaining shop
          records within 48 hours of uninstall.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Customer data requests</h2>
        <p>
          Because BundleStack does not store customer personal data, there is
          typically nothing to export or redact per customer. If you receive a
          customer data request, you may inform the customer that this app does
          not retain their personal information.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Contact</h2>
        <p>
          For privacy questions, visit our{" "}
          <Link to="/support">support page</Link> or contact us through the
          Shopify App Store listing.
        </p>
      </section>

      <p>
        <Link to="/">← Back to BundleStack</Link>
      </p>
    </div>
  );
}
