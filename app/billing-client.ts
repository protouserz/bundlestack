/** Open Shopify billing approval in the top admin frame. */
export function openBillingApprovalUrl(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_top";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
