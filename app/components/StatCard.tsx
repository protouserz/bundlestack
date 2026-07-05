type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <s-box padding="large" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-text tone="neutral">{label}</s-text>
        <s-heading>{value}</s-heading>
        {hint && <s-text tone="neutral">{hint}</s-text>}
      </s-stack>
    </s-box>
  );
}
