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

export type TranslationResult =
  | { status: "translated"; translatedCount: number }
  | { status: "restored"; restoredCount: number }
  | { status: "cancelled"; restoredCount: number }
  | { status: "no_text"; message: string }
  | { status: "error"; message: string };

export type ToggleActiveTabResponse =
  | { ok: true; result: TranslationResult }
  | { ok: false; message: string };
