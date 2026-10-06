/**
 * Cursor's embedded browser identifies as Electron, which `isbot` treats as a
 * crawler. Shopify then returns 410 before admin auth can run.
 */
const CURSOR_BROWSER = /Cursor\//i;
const ELECTRON = /Electron\//i;

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.280 Safari/537.36";

export function isCursorEmbeddedBrowser(userAgent: string): boolean {
  return CURSOR_BROWSER.test(userAgent) && ELECTRON.test(userAgent);
}

export function requestWithoutCursorBotUa(request: Request): Request {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!isCursorEmbeddedBrowser(userAgent)) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("user-agent", CHROME_UA);
  return new Request(request, { headers });
}
