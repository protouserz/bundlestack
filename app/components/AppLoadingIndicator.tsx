import { useNavigation } from "react-router";

export function AppLoadingIndicator() {
  const navigation = useNavigation();

  if (navigation.state !== "loading") {
    return null;
  }

  return (
    <s-banner tone="info">
      <s-text>Loading…</s-text>
    </s-banner>
  );
}
