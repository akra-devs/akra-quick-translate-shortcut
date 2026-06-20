import { t } from "./shared/i18n";
import {
  MESSAGE_TOGGLE_ACTIVE_TAB,
  MESSAGE_TOGGLE_TRANSLATION,
  type ToggleActiveTabMessage,
  type ToggleActiveTabResponse,
  type ToggleTranslationMessage,
  type TranslationResult
} from "./shared/messages";
import { loadSettings } from "./shared/settings";

const CONTEXT_MENU_ID = "akra-quick-translate-toggle";
const UNSUPPORTED_PAGE_MESSAGE = "This page cannot be translated";

export function isSupportedPageUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "file:";
  } catch {
    return false;
  }
}

export async function toggleTranslation(tab: chrome.tabs.Tab | undefined): Promise<TranslationResult> {
  if (!tab?.id || !isSupportedPageUrl(tab.url)) {
    await showUnsupportedBadge(tab?.id);
    throw new Error(UNSUPPORTED_PAGE_MESSAGE);
  }

  const settings = await loadSettings();
  const message: ToggleTranslationMessage = {
    type: MESSAGE_TOGGLE_TRANSLATION,
    settings
  };

  try {
    const result = parseTranslationResult(await sendMessageWithContentScriptFallback(tab.id, message));
    if (result.status === "error") {
      throw new Error(result.message);
    }

    return result;
  } catch (error) {
    await showUnsupportedBadge(tab.id);
    throw error;
  }
}

export function registerBackgroundListeners(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: t("contextMenuToggle"),
      contexts: ["page", "selection"]
    });
  });

  chrome.action.onClicked.addListener((tab) => {
    void toggleTranslationFromBackgroundEvent(tab);
  });

  chrome.runtime.onMessage.addListener((message: ToggleActiveTabMessage, _sender, sendResponse) => {
    if (message?.type !== MESSAGE_TOGGLE_ACTIVE_TAB) {
      return false;
    }

    getActiveTab()
      .then(toggleTranslation)
      .then((result) => {
        const response: ToggleActiveTabResponse = { ok: true, result };
        sendResponse(response);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error && error.message ? error.message : "Unable to toggle translation";
        const response: ToggleActiveTabResponse = { ok: false, message };
        sendResponse(response);
      });

    return true;
  });

  chrome.commands.onCommand.addListener((command, tab) => {
    if (command !== "toggle-translation") {
      return;
    }

    if (tab?.id) {
      void toggleTranslationFromBackgroundEvent(tab);
      return;
    }

    void getActiveTab().then(toggleTranslationFromBackgroundEvent);
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID) {
      void toggleTranslationFromBackgroundEvent(tab);
    }
  });
}

async function toggleTranslationFromBackgroundEvent(tab: chrome.tabs.Tab | undefined): Promise<void> {
  try {
    await toggleTranslation(tab);
  } catch (error) {
    console.warn("Akra Quick Translate failed to toggle translation", error);
  }
}

async function sendMessageWithContentScriptFallback(tabId: number, message: ToggleTranslationMessage): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["assets/content.js"]
    });

    return chrome.tabs.sendMessage(tabId, message);
  }
}

function parseTranslationResult(response: unknown): TranslationResult {
  if (!isRecord(response) || typeof response.status !== "string") {
    throw new Error("Unable to read translation response");
  }

  switch (response.status) {
    case "translated":
      return { status: "translated", translatedCount: getNumber(response.translatedCount) };
    case "restored":
      return { status: "restored", restoredCount: getNumber(response.restoredCount) };
    case "cancelled":
      return { status: "cancelled", restoredCount: getNumber(response.restoredCount) };
    case "no_text":
      return { status: "no_text", message: getMessage(response.message, "No visible text found") };
    case "error":
      return { status: "error", message: getMessage(response.message, "Unable to toggle translation") };
    default:
      throw new Error("Unknown translation response");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getMessage(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

async function showUnsupportedBadge(tabId: number | undefined): Promise<void> {
  if (!tabId) {
    return;
  }

  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b42318" });
  await chrome.action.setBadgeText({ tabId, text: "!" });
  setTimeout(() => {
    void chrome.action.setBadgeText({ tabId, text: "" });
  }, 1800);
}

function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Receiving end does not exist");
}

function hasChromeRuntime(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.onInstalled && chrome.tabs?.sendMessage);
}

if (hasChromeRuntime()) {
  registerBackgroundListeners();
}
