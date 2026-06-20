import { togglePageTranslation } from "./content/core";

const MESSAGE_TOGGLE_TRANSLATION = "akra-quick-translate:toggle";
const CONTENT_LOADED_KEY = "__akraQuickTranslateContentLoaded__";

type ToggleMessage = {
  type?: string;
  settings?: {
    sourceLanguage?: string;
    targetLanguage?: string;
    showOverlay?: boolean;
  };
};

const globalScope = globalThis as typeof globalThis & Record<string, unknown>;

if (!globalScope[CONTENT_LOADED_KEY]) {
  globalScope[CONTENT_LOADED_KEY] = true;

  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: ToggleMessage, _sender, sendResponse) => {
      if (message?.type !== MESSAGE_TOGGLE_TRANSLATION) {
        return false;
      }

      togglePageTranslation(message.settings)
        .then((result) => sendResponse(result))
        .catch((error: unknown) => {
          const message = error instanceof Error && error.message ? error.message : "Translation failed";
          sendResponse({ status: "error", message });
        });

      return true;
    });
  }
}
