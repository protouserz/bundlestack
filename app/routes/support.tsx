import { Link } from "react-router";

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@example.com (update in Render env)";

export default function SupportPage() {
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
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Support</h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        BundleStack · Quantity breaks for Shopify
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Get help</h2>
        <p>
          Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL.split(" ")[0]}`}>{SUPPORT_EMAIL}</a>{" "}
          with your shop domain and a short description of the issue. We
          typically respond within one business day.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Common questions</h2>
        <h3 style={{ fontSize: "1.1rem", marginTop: "1.25rem" }}>
          Discount not showing at checkout?
        </h3>
        <p>
          Confirm the offer is <strong>Active</strong>, the product is included
          in the offer, and the cart quantity meets your tier minimum. Automatic
          discounts apply at checkout — not on the cart page in all themes.
        </p>

        <h3 style={{ fontSize: "1.1rem", marginTop: "1.25rem" }}>
          Widget not visible on the product page?
        </h3>
        <p>
          Open the theme editor → product template → add the{" "}
          <strong>BundleStack</strong> app block and save. Use the Store health
          panel in the app for one-click fixes.
        </p>

        <h3 style={{ fontSize: "1.1rem", marginTop: "1.25rem" }}>
          Uninstalling the app
        </h3>
        <p>
          Uninstalling removes BundleStack discounts and offer data automatically.
          Remove the theme block from your product template if you no longer need
          it.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
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

      <p>
        <Link to="/">← Back to BundleStack</Link>
        {" · "}
        <Link to="/privacy">Privacy Policy</Link>
      </p>
    </div>
  );
}
