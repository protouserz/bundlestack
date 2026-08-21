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

type SAppNavProps = { children?: ReactNode };

/** App Bridge admin nav (BFS 4.1.4). Not in polaris-types yet. */
export function SAppNav({ children }: SAppNavProps) {
  return createElement("s-app-nav", { suppressHydrationWarning: true }, children);
}

type SNavLinkProps = {
  href: string;
  rel?: "home";
  children?: ReactNode;
};

/** App nav item. `rel="home"` is an App Bridge attribute, not a Polaris s-link prop. */
export function SNavLink({ href, rel, children }: SNavLinkProps) {
  return createElement(
    "s-link",
    { href, rel, suppressHydrationWarning: true },
    children,
  );
}
