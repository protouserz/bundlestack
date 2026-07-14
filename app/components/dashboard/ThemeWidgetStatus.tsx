import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { AdminDeepLinkButton } from "../AdminLink";

type BlockStatus = "loading" | "active" | "available" | "unavailable" | "unknown";

type ThemeExtensionActivation = {
  handle?: string;
  name?: string;
  status?: "active" | "available" | "unavailable";
};

type AppExtension = {
  type?: string;
  activations?: ThemeExtensionActivation[];
};

const BLOCK_HANDLE = "bundle-offers";

export function ThemeWidgetStatus({
  themeEditorUrl,
}: {
  themeEditorUrl: string;
}) {
  const shopify = useAppBridge();
  const [status, setStatus] = useState<BlockStatus>("loading");
  const [blockName, setBlockName] = useState("BundleStack offers");

  useEffect(() => {
    let cancelled = false;

    async function loadExtensionStatus() {
      try {
        const appApi = (
          shopify as unknown as {
            app?: { extensions?: () => Promise<AppExtension[]> };
          }
        ).app;

        if (!appApi?.extensions) {
          if (!cancelled) setStatus("unknown");
          return;
        }

        const extensions = await appApi.extensions();
        const themeExtension = extensions.find(
          (extension) => extension.type === "theme_app_extension",
        );
        const block = themeExtension?.activations?.find(
          (activation) => activation.handle === BLOCK_HANDLE,
        );

        if (cancelled) return;

        if (!block) {
          setStatus("unknown");
          return;
        }

        setBlockName(block.name ?? "BundleStack offers");
        setStatus(block.status ?? "unknown");
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    }

    void loadExtensionStatus();

    return () => {
      cancelled = true;
    };
  }, [shopify]);

  if (status === "loading") {
    return (
      <div className="bundlestack-theme-status">
        <s-banner tone="info">
          <s-text>Checking theme widget status…</s-text>
        </s-banner>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="bundlestack-theme-status">
        <s-banner tone="success">
          <s-stack direction="block" gap="base">
            <s-text>
              <strong>{blockName}</strong> is active on your published theme.
            </s-text>
          </s-stack>
        </s-banner>
      </div>
    );
  }

  return (
    <div className="bundlestack-theme-status">
      <s-banner tone="warning">
        <s-stack direction="block" gap="base">
          <s-text>
            {status === "available"
              ? `${blockName} is available but not placed on your product template yet.`
              : `${blockName} is not active on your published theme.`}
          </s-text>
          <AdminDeepLinkButton href={themeEditorUrl}>
            Open theme editor
          </AdminDeepLinkButton>
        </s-stack>
      </s-banner>
    </div>
  );
}
