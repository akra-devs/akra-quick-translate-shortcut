import { describe, expect, it } from "vitest";
import { isSupportedPageUrl } from "./background";

describe("background page support gate", () => {
  it("allows web and file pages", () => {
    expect(isSupportedPageUrl("https://example.com/page")).toBe(true);
    expect(isSupportedPageUrl("http://example.com/page")).toBe(true);
    expect(isSupportedPageUrl("file:///Users/test/page.html")).toBe(true);
  });

  it("rejects unsupported browser pages", () => {
    expect(isSupportedPageUrl("chrome://extensions")).toBe(false);
    expect(isSupportedPageUrl("edge://settings")).toBe(false);
    expect(isSupportedPageUrl("about:blank")).toBe(false);
    expect(isSupportedPageUrl(undefined)).toBe(false);
  });
});
