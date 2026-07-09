type AppSupportFooterProps = {
  supportUrl: string;
  privacyUrl: string;
};

export function AppSupportFooter({
  supportUrl,
  privacyUrl,
}: AppSupportFooterProps) {
  return (
    <footer style={{ marginTop: "1.5rem", paddingBottom: "1rem" }}>
      <s-text tone="neutral">
        <a href={supportUrl} target="_blank" rel="noreferrer">
          Support
        </a>
        {" · "}
        <a href={privacyUrl} target="_blank" rel="noreferrer">
          Privacy policy
        </a>
      </s-text>
    </footer>
  );
}
