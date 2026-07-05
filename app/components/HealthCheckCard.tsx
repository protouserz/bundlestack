import type { ReactNode } from "react";
import type { HealthFixAction } from "../models/health.server";

type HealthCheckCardProps = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  message: string;
  fix?: HealthFixAction;
  fixButton?: ReactNode;
};

function statusTone(status: "ok" | "warning" | "error") {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  return "critical";
}

export function HealthCheckCard({
  label,
  status,
  message,
  fix,
  fixButton,
}: HealthCheckCardProps) {
  return (
    <s-box padding="large" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base">
          <s-badge tone={statusTone(status)}>{status}</s-badge>
          <s-heading>{label}</s-heading>
        </s-stack>
        <s-text tone="neutral">{message}</s-text>
        {fix && (status === "error" || status === "warning") && fixButton}
      </s-stack>
    </s-box>
  );
}

export { statusTone };
