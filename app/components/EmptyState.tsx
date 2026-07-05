type EmptyStateProps = {
  heading: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  heading,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="large">
        <s-stack direction="block" gap="base">
          <s-heading>{heading}</s-heading>
          <s-text tone="neutral">{description}</s-text>
        </s-stack>
        {actionLabel && actionHref && (
          <s-button href={actionHref}>{actionLabel}</s-button>
        )}
      </s-stack>
    </s-box>
  );
}
