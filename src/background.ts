import { t } from "./shared/i18n";
import { MESSAGE_TOGGLE_ACTIVE_TAB, MESSAGE_TOGGLE_TRANSLATION, type ToggleActiveTabMessage, type ToggleTranslationMessage } from "./shared/messages";
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

export async function toggleTranslation(tab: chrome.tabs.Tab | undefined): Promise<void> {
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
    await sendMessageWithContentScriptFallback(tab.id, message);
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
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => {
        const message = error instanceof Error && error.message ? error.message : "Unable to toggle translation";
        sendResponse({ ok: false, message });
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
