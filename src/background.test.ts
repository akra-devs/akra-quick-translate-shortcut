import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupportedPageUrl, toggleTranslation } from "./background";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "chrome");
});

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

  it("rejects unsupported pages after showing a badge", async () => {
    vi.useFakeTimers();
    globalThis.chrome = {
      action: {
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
        setBadgeText: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as typeof chrome;

    await expect(toggleTranslation({ id: 9, url: "chrome://extensions" } as chrome.tabs.Tab)).rejects.toThrow("This page cannot be translated");
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 9, color: "#b42318" });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 9, text: "!" });
  });

  it("propagates content script failures to message callers", async () => {
    vi.useFakeTimers();
    globalThis.chrome = {
      action: {
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
        setBadgeText: vi.fn().mockResolvedValue(undefined)
      },
      tabs: {
        sendMessage: vi.fn().mockRejectedValue(new Error("Cannot access page"))
      }
    } as unknown as typeof chrome;

    await expect(toggleTranslation({ id: 4, url: "https://example.com" } as chrome.tabs.Tab)).rejects.toThrow("Cannot access page");
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 4, text: "!" });
  });
});
