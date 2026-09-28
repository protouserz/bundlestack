import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { AdminDeepLinkButton, ExternalLinkButton } from "../AdminLink";
import { OfferStorefrontPreview } from "./OfferStorefrontPreview";
import type { DiscountTier, StorefrontPreviewProduct } from "../../models/offer";
import styles from "./dashboard.module.css";

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

type PreviewOffer = {
  offerType: string;
  title?: string;
  tiers: DiscountTier[];
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
  previewOffer,
  previewProduct,
}: {
  themeEditorUrl: string;
  previewOffer?: PreviewOffer | null;
  previewProduct?: StorefrontPreviewProduct | null;
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

  const embedOn = status === "active";

  return (
    <s-section
      heading={
        embedOn ? "Live on product pages" : "Shoppers cannot see this yet"
      }
    >
      <s-stack direction="block" gap="base">
        {status === "loading" ? (
          <s-banner tone="info">
            <s-text>Checking whether the theme widget is on…</s-text>
          </s-banner>
        ) : embedOn ? (
          <s-banner tone="success">
            <s-stack direction="block" gap="base">
              <s-text>
                <strong>{blockName}</strong> is active on your published theme.
                This is what shoppers see on product pages.
              </s-text>
              {previewProduct?.storefrontUrl ? (
                <ExternalLinkButton href={previewProduct.storefrontUrl}>
                  Open live product
                </ExternalLinkButton>
              ) : null}
            </s-stack>
          </s-banner>
        ) : (
          <s-banner tone="warning">
            <s-stack direction="block" gap="base">
              <s-text>
                Quantity breaks already apply at checkout, but the product-page
                widget stays hidden until you enable <strong>{blockName}</strong>{" "}
                in the theme editor and click Save. That is the step most
                merchants skip.
              </s-text>
              <AdminDeepLinkButton href={themeEditorUrl}>
                Show on product pages
              </AdminDeepLinkButton>
            </s-stack>
          </s-banner>
        )}

        <p className={styles.storefrontPreviewCaption}>
          {embedOn
            ? previewProduct?.title
              ? `Preview of ${previewProduct.title} on a product page.`
              : "Preview of the live product-page widget."
            : previewProduct?.title
              ? `Preview using ${previewProduct.title} — works before the theme embed is on.`
              : "Preview inside the app — works before the theme embed is on."}
        </p>
        <OfferStorefrontPreview offer={previewOffer} product={previewProduct} />
      </s-stack>
    </s-section>
  );
}
