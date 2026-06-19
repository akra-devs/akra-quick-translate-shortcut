import type { ExtensionSettings } from "./settings";

export const MESSAGE_TOGGLE_TRANSLATION = "akra-quick-translate:toggle";

export interface ToggleTranslationMessage {
  type: typeof MESSAGE_TOGGLE_TRANSLATION;
  settings: ExtensionSettings;
}
