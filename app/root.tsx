import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "react-router";
import { isE2EAuthBypassEnabled } from "./e2e-auth.server";

export const loader = async () => {
  return { e2eMode: isE2EAuthBypassEnabled() };
};

export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "An unexpected error occurred. Please try again.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message =
      typeof error.data === "string"
        ? error.data
        : "We could not load this page.";
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <Meta />
        <Links />
        <style>{`
          body {
            font-family: Inter, system-ui, sans-serif;
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f8fafc;
            color: #0f172a;
          }
          main {
            max-width: 28rem;
            padding: 2rem;
            text-align: center;
          }
          h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
          p { color: #475569; line-height: 1.6; margin: 0 0 1.5rem; }
          a {
            color: #059669;
            font-weight: 600;
            text-decoration: none;
          }
        `}</style>
      </head>
      <body>
        <main>
          <h1>{title}</h1>
          <p>{message}</p>
          <a href="/">Return home</a>
        </main>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { e2eMode } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        {e2eMode ? (
          <script src="https://cdn.shopify.com/shopifycloud/polaris.js" />
        ) : null}
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
