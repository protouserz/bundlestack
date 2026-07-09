import { createElement, type ReactNode } from "react";

type SButtonProps = JSX.IntrinsicElements["s-button"] & { children?: ReactNode };
type SPageProps = JSX.IntrinsicElements["s-page"] & { children?: ReactNode };

/** Polaris web components can add inline styles before React hydrates. */
export function SButton({ children, ...props }: SButtonProps) {
  return createElement(
    "s-button",
    { ...props, suppressHydrationWarning: true },
    children,
  );
}

export function SPage({ children, ...props }: SPageProps) {
  return createElement(
    "s-page",
    { ...props, suppressHydrationWarning: true },
    children,
  );
}
