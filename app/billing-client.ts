/** Load Shopify's exit-iframe handoff route inside the app frame. */
export function openBillingHandoff(path: string) {
  window.location.assign(new URL(path, window.location.href).toString());
}
