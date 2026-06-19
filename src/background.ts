import { MESSAGE_TOGGLE_TRANSLATION, type ToggleTranslationMessage } from "./shared/messages";
import { loadSettings } from "./shared/settings";

const CONTEXT_MENU_ID = "akra-quick-translate-toggle";

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
    return;
  }

  const settings = await loadSettings();
  const message: ToggleTranslationMessage = {
    type: MESSAGE_TOGGLE_TRANSLATION,
    settings
  };

  try {
    await sendMessageWithContentScriptFallback(tab.id, message);
  } catch (error) {
    console.warn("Akra Quick Translate failed to toggle translation", error);
    await showUnsupportedBadge(tab.id);
  }
}

export function registerBackgroundListeners(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Toggle page translation",
      contexts: ["page", "selection"]
    });
  });

  chrome.action.onClicked.addListener((tab) => {
    void toggleTranslation(tab);
  });

  chrome.commands.onCommand.addListener((command, tab) => {
    if (command !== "toggle-translation") {
      return;
    }

    if (tab?.id) {
      void toggleTranslation(tab);
      return;
    }

    void getActiveTab().then(toggleTranslation);
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID) {
      void toggleTranslation(tab);
    }
  });
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
