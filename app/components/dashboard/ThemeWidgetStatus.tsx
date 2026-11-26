import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { AdminDeepLinkButton, ExternalLinkButton } from "../AdminLink";
import { SButton } from "../polaris";
import { OfferStorefrontPreview } from "./OfferStorefrontPreview";
import { useI18n } from "../../i18n/I18nProvider";
import type { DiscountTier, StorefrontPreviewProduct, WidgetLook } from "../../models/offer";
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
  widgetLook?: WidgetLook;
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
  customizeOfferHref,
  previewOffer,
  previewProduct,
}: {
  themeEditorUrl: string;
  customizeOfferHref: string;
  previewOffer?: PreviewOffer | null;
  previewProduct?: StorefrontPreviewProduct | null;
}) {
  const shopify = useAppBridge();
  const { t } = useI18n();
  const [status, setStatus] = useState<BlockStatus>("loading");
  const [blockName, setBlockName] = useState(() => t("theme.blockFallback"));

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

        setBlockName(block.name ?? t("theme.blockFallback"));
        setStatus(block.status ?? "unknown");
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    }

    void loadExtensionStatus();

    return () => {
      cancelled = true;
    };
  }, [shopify, t]);

  const embedOn = status === "active";

  return (
    <s-section
      heading={
        embedOn
          ? t("theme.liveOnProductPages")
          : t("theme.liveAtCheckout")
      }
    >
      <s-stack direction="block" gap="base">
        {embedOn ? (
          <s-banner tone="success">
            <s-stack direction="block" gap="base">
              <s-text>
                {t("theme.embedOn", { name: blockName })}
              </s-text>
              <s-stack direction="inline" gap="base">
                <SButton href={customizeOfferHref} variant="primary">
                  {t("dashboard.customizeOffer")}
                </SButton>
                {previewProduct?.storefrontUrl ? (
                  <ExternalLinkButton href={previewProduct.storefrontUrl}>
                    {t("theme.openLiveProduct")}
                  </ExternalLinkButton>
                ) : null}
              </s-stack>
            </s-stack>
          </s-banner>
        ) : (
          <>
            <s-banner tone="success">
              <s-stack direction="block" gap="base">
                <s-text>
                  {t("theme.embedOff")}
                </s-text>
                <SButton href={customizeOfferHref} variant="primary">
                  {t("dashboard.customizeOffer")}
                </SButton>
              </s-stack>
            </s-banner>
            <s-banner tone="info">
              <s-stack direction="block" gap="base">
                <s-text>
                  {t("theme.optionalWidget", { name: blockName })}
                </s-text>
                <AdminDeepLinkButton href={themeEditorUrl}>
                  {t("dashboard.showOnProductPages")}
                </AdminDeepLinkButton>
              </s-stack>
            </s-banner>
          </>
        )}

        <p className={styles.storefrontPreviewCaption}>
          {embedOn
            ? previewProduct?.title
              ? t("theme.previewNamedOn", { title: previewProduct.title })
              : t("theme.previewLiveWidget")
            : previewProduct?.title
              ? t("theme.previewNamedCheckout", { title: previewProduct.title })
              : t("theme.previewInsideApp")}
        </p>
        <OfferStorefrontPreview offer={previewOffer} product={previewProduct} />
      </s-stack>
    </s-section>
  );
}
