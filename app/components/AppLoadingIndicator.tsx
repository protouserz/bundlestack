import { useNavigation } from "react-router";

export function AppLoadingIndicator() {
  const navigation = useNavigation();

  if (navigation.state !== "loading") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        height: 3,
        overflow: "hidden",
        background: "var(--p-color-bg-surface-secondary, #f1f1f1)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "40%",
          background: "var(--p-color-bg-fill-brand, #2c6ecb)",
          animation: "bundlestack-nav-progress 1.1s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes bundlestack-nav-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
