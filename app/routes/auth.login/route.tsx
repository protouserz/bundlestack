import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { SButton, SPage } from "../../components/polaris";

export default function Auth() {
  return (
    <AppProvider embedded={false}>
      <SPage>
        <s-section heading="Open BundleStack from Shopify">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              For your security, BundleStack installation and authentication
              begin inside Shopify. Open Shopify Admin, select Apps, and choose
              BundleStack.
            </s-paragraph>
            <SButton href="/">Back to BundleStack</SButton>
          </s-stack>
        </s-section>
      </SPage>
    </AppProvider>
  );
}
