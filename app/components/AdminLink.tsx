import { useAppBridge } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router";
import { SButton } from "./polaris";

/** Opens a Shopify admin page in the top-level admin chrome (not the app iframe). */
export function AdminDeepLinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
}) {
  const shopifyUrl = toShopifyAdminProtocol(href);

  return (
    <SButton href={shopifyUrl} target="_top" variant={variant}>
      {children}
    </SButton>
  );
}

/**
 * Prefer shopify://admin/... so App Bridge navigates inside admin.
 * Falls back to https://admin.shopify.com/... with target=_top.
 */
export function toShopifyAdminProtocol(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "admin.shopify.com" &&
      parsed.pathname.startsWith("/store/")
    ) {
      // /store/{handle}/themes/... → shopify://admin/themes/...
      const parts = parsed.pathname.split("/").filter(Boolean);
      // ["store", handle, ...rest]
      const rest = parts.slice(2).join("/");
      const search = parsed.search || "";
      return `shopify://admin/${rest}${search}`;
    }
  } catch {
    // ignore
  }
  return url;
}

export function ExternalLinkButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
}) {
  // App Bridge documented pattern for URLs outside the admin.
  return (
    <SButton href={href} target="_blank" variant={variant}>
      {children}
    </SButton>
  );
}

export function useLeaveWithSaveBar() {
  const shopify = useAppBridge();
  const navigate = useNavigate();

  return async (href: string) => {
    const confirmLeave = shopify.saveBar?.leaveConfirmation;
    if (confirmLeave) {
      try {
        await confirmLeave();
      } catch {
        // Merchant cancelled the leave confirmation.
        return;
      }
    }
    // SPA navigate keeps App Bridge session-token auth on subsequent requests.
    navigate(href);
  };
}
