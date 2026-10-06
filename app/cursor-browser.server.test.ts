import { isbot } from "isbot";
import { describe, expect, it } from "vitest";
import {
  isCursorEmbeddedBrowser,
  requestWithoutCursorBotUa,
} from "./cursor-browser.server";

const CURSOR_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.23.23 Chrome/148.0.7778.280 Electron/42.10.0 Safari/537.36";

const BRAVE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

describe("isCursorEmbeddedBrowser", () => {
  it("detects Cursor's Electron user agent", () => {
    expect(isbot(CURSOR_UA)).toBe(true);
    expect(isCursorEmbeddedBrowser(CURSOR_UA)).toBe(true);
  });

  it("leaves Brave and Chrome alone", () => {
    expect(isbot(BRAVE_UA)).toBe(false);
    expect(isCursorEmbeddedBrowser(BRAVE_UA)).toBe(false);
  });
});

describe("requestWithoutCursorBotUa", () => {
  it("rewrites Cursor UA so Shopify auth does not 410", () => {
    const request = new Request("https://bundlestack.example/app", {
      headers: { "user-agent": CURSOR_UA },
    });
    const rewritten = requestWithoutCursorBotUa(request);
    const ua = rewritten.headers.get("user-agent") ?? "";

    expect(rewritten).not.toBe(request);
    expect(isbot(ua)).toBe(false);
    expect(isCursorEmbeddedBrowser(ua)).toBe(false);
  });

  it("preserves POST bodies used by dismiss and other form actions", async () => {
    const request = new Request("https://bundlestack.example/app", {
      method: "POST",
      headers: {
        "user-agent": CURSOR_UA,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "intent=dismiss-onboarding",
    });
    const rewritten = requestWithoutCursorBotUa(request);

    expect(await rewritten.text()).toBe("intent=dismiss-onboarding");
  });

  it("returns the original request for normal browsers", () => {
    const request = new Request("https://bundlestack.example/app", {
      headers: { "user-agent": BRAVE_UA },
    });
    expect(requestWithoutCursorBotUa(request)).toBe(request);
  });
});
