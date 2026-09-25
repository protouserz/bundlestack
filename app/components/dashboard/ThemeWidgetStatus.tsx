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

type AppExtensionsHost = {
  app?: {
    extensions?: () => Promise<AppExtension[]>;
  };
};

/** Product-page widget handles. Overlay/badge embeds do not count as the widget. */
const THEME_BLOCK_HANDLES = [
  "bundle-widget-embed",
  "bundle-offers",
];

async function loadThemeExtensions(
  shopify: ReturnType<typeof useAppBridge>,
): Promise<AppExtension[]> {
  const fromBridge = (shopify as unknown as AppExtensionsHost).app;
  if (fromBridge?.extensions) {
    return fromBridge.extensions();
  }

  const fromWindow = (window as Window & { shopify?: AppExtensionsHost }).shopify
    ?.app;
  if (fromWindow?.extensions) {
    return fromWindow.extensions();
  }

  return [];
}

function pickPrimaryBlock(activations: ThemeExtensionActivation[]) {
  const matching = activations.filter((activation) =>
    THEME_BLOCK_HANDLES.includes(activation.handle ?? ""),
  );
  return (
    matching.find((activation) => activation.status === "active") ??
    matching.find((activation) => activation.status === "available") ??
    matching[0] ??
    null
  );
}

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
        const extensions = await loadThemeExtensions(shopify);
        const themeExtension = extensions.find(
          (extension) =>
            extension.type === "theme_app_extension" ||
            extension.type === "theme",
        );
        const block = pickPrimaryBlock(themeExtension?.activations ?? []);

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
      <s-section heading="Theme widget">
        <s-banner tone="info">
          <s-text>Checking theme widget status…</s-text>
        </s-banner>
      </s-section>
    );
  }

  if (status === "active") {
    return (
      <s-section heading="Theme widget">
        <s-banner tone="success">
          <s-text>
            <strong>{blockName}</strong> is active on your published theme.
          </s-text>
        </s-banner>
      </s-section>
    );
  }

  return (
    <s-section heading="Theme widget">
      <s-banner tone="warning">
        <s-stack direction="block" gap="base">
          <s-text>
            {status === "available"
              ? `${blockName} is in your theme but not turned on yet. Open the editor, enable it, and save.`
              : `Shoppers will not see quantity breaks until BundleStack is on in your theme. Open the editor, enable it, and save.`}
          </s-text>
          <AdminDeepLinkButton href={themeEditorUrl}>
            Show on product pages
          </AdminDeepLinkButton>
        </s-stack>
      </s-banner>
    </s-section>
  );
}
