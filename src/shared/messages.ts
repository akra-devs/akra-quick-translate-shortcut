import type { ExtensionSettings } from "./settings";

export const MESSAGE_TOGGLE_TRANSLATION = "akra-quick-translate:toggle";
export const MESSAGE_TOGGLE_ACTIVE_TAB = "akra-quick-translate:toggle-active-tab";

export interface ToggleTranslationMessage {
  type: typeof MESSAGE_TOGGLE_TRANSLATION;
  settings: ExtensionSettings;
}

export interface ToggleActiveTabMessage {
  type: typeof MESSAGE_TOGGLE_ACTIVE_TAB;
}
