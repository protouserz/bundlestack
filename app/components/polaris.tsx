import { createElement, type ReactNode } from "react";
import { useE2EMode } from "./E2EModeContext";

type SButtonProps = JSX.IntrinsicElements["s-button"] & { children?: ReactNode };
type SPageProps = JSX.IntrinsicElements["s-page"] & { children?: ReactNode };

const E2E_BUTTON_OMIT = new Set([
  "command",
  "commandFor",
  "slot",
  "variant",
  "tone",
  "loading",
  "href",
  "type",
  "disabled",
  "onClick",
  "children",
]);

/** Polaris web components can add inline styles before React hydrates. */
export function SButton({ children, ...props }: SButtonProps) {
  const e2eMode = useE2EMode();

  if (e2eMode) {
    const href = typeof props.href === "string" ? props.href : undefined;
    const type = props.type;
    const disabled = Boolean(props.disabled) || Boolean(props.loading);
    const onClick = props.onClick as unknown as
      | React.MouseEventHandler<HTMLButtonElement>
      | undefined;

    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!E2E_BUTTON_OMIT.has(key)) rest[key] = value;
    }

    if (href) {
      return (
        <a
          href={href}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          style={{
            display: "inline-block",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            background: "#0f172a",
            color: "#f8fafc",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        type={(type as "button" | "submit" | "reset" | undefined) ?? "button"}
        disabled={disabled}
        onClick={onClick}
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        style={{
          display: "inline-block",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.375rem",
          border: "1px solid #cbd5e1",
          background: "#fff",
          color: "#0f172a",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {children}
      </button>
    );
  }

  return createElement(
    "s-button",
    { ...props, suppressHydrationWarning: true },
    children,
  );
}

export function SPage({ children, ...props }: SPageProps) {
  const e2eMode = useE2EMode();
  const heading =
    typeof props.heading === "string" ? props.heading : undefined;

  if (e2eMode) {
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key !== "heading") rest[key] = value;
    }

    return (
      <div
        data-testid="e2e-page"
        {...(rest as React.HTMLAttributes<HTMLDivElement>)}
      >
        {heading ? <h1>{heading}</h1> : null}
        {children}
      </div>
    );
  }

  return createElement(
    "s-page",
    { ...props, suppressHydrationWarning: true },
    children,
  );
}
