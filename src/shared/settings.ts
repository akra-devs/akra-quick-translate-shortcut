export interface ExtensionSettings {
  targetLanguage: string;
  showOverlay: boolean;
}

export interface LanguageOption {
  code: string;
  label: string;
}

export const STORAGE_KEY = "akraQuickTranslateSettings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  targetLanguage: "ko",
  showOverlay: true
};

export const SUPPORTED_TARGET_LANGUAGES: LanguageOption[] = [
  { code: "ar", label: "Arabic" },
  { code: "bg", label: "Bulgarian" },
  { code: "bn", label: "Bengali" },
  { code: "cs", label: "Czech" },
  { code: "da", label: "Danish" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "hi", label: "Hindi" },
  { code: "hr", label: "Croatian" },
  { code: "hu", label: "Hungarian" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "iw", label: "Hebrew" },
  { code: "ja", label: "Japanese" },
  { code: "kn", label: "Kannada" },
  { code: "ko", label: "Korean" },
  { code: "lt", label: "Lithuanian" },
  { code: "mr", label: "Marathi" },
  { code: "nl", label: "Dutch" },
  { code: "no", label: "Norwegian" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "sv", label: "Swedish" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "vi", label: "Vietnamese" },
  { code: "zh", label: "Chinese" },
  { code: "zh-Hant", label: "Chinese (Traditional)" }
];

export function normalizeSettings(value: Partial<ExtensionSettings> | undefined): ExtensionSettings {
  return {
    targetLanguage: normalizeLanguageCode(value?.targetLanguage ?? DEFAULT_SETTINGS.targetLanguage),
    showOverlay: typeof value?.showOverlay === "boolean" ? value.showOverlay : DEFAULT_SETTINGS.showOverlay
  };
}

export function normalizeLanguageCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_SETTINGS.targetLanguage;
  }

  const normalized = trimmed.toLowerCase().replace("_", "-");
  if (normalized === "zh-hant" || normalized.startsWith("zh-hant-")) {
    return "zh-Hant";
  }

  return normalized.split("-")[0] ?? DEFAULT_SETTINGS.targetLanguage;
}

export async function loadSettings(): Promise<ExtensionSettings> {
  if (!globalThis.chrome?.storage?.sync) {
    return DEFAULT_SETTINGS;
  }

  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return normalizeSettings(result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  if (!globalThis.chrome?.storage?.sync) {
    return;
  }

  await chrome.storage.sync.set({
    [STORAGE_KEY]: normalizeSettings(settings)
  });
}
