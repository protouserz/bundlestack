// Provide safe defaults so unit tests can import server modules (which
// initialize Prisma and the Shopify app) without a real environment. Real
// values from a local .env still take precedence.
process.env.DATABASE_URL ||=
  "postgresql://bundlestack:bundlestack@localhost:5432/bundlestack";
process.env.SHOPIFY_APP_URL ||= "https://bundlestack.test";
process.env.SHOPIFY_API_KEY ||= "test-api-key";
process.env.SHOPIFY_API_SECRET ||= "test-api-secret";
process.env.SCOPES ||= "read_products,write_discounts,read_discounts";
