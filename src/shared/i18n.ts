const FALLBACK_MESSAGES: Record<string, string> = {
  actionTitle: "Akra Quick Translate",
  commandToggleTranslation: "Toggle page translation",
  contextMenuToggle: "Toggle page translation",
  errorOpenDonation: "Unable to open support page",
  errorOpenShortcuts: "Unable to open shortcuts",
  extensionDescription: "Toggle page translation and original text restore with Chrome's built-in Translator API.",
  extensionName: "Akra Quick Translate",
  options: "Options",
  optionsHeading: "Translation",
  optionsTitle: "Akra Quick Translate Options",
  popupHeading: "Akra Translate",
  privacy: "Privacy",
  productLinks: "Product links",
  save: "Save",
  settings: "Settings",
  shortcut: "Shortcut",
  shortcutNotSet: "Not set",
  source: "Source",
  statusApplied: "Applied",
  statusFailed: "Failed",
  statusOverlay: "Status overlay",
  statusRunning: "Running",
  statusSaved: "Saved",
  support: "Support",
  supportAkra: "Support Akra",
  swapLanguages: "Swap languages",
  target: "Target",
  translateRestore: "Translate / Restore",
  translationLanguages: "Translation languages",
  website: "Website"
};

const LOCALIZED_ATTRIBUTES = ["aria-label", "title"] as const;

export function t(messageName: string): string {
  const localized = globalThis.chrome?.i18n?.getMessage?.(messageName);
  return localized || FALLBACK_MESSAGES[messageName] || messageName;
}

export function applyDocumentLocale(): void {
  const locale = globalThis.chrome?.i18n?.getUILanguage?.();
  if (locale) {
    document.documentElement.lang = locale;
  }
}

export function applyLocalizedText(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const messageName = element.getAttribute("data-i18n");
    if (messageName) {
      element.textContent = t(messageName);
    }
  });

  root.querySelectorAll<HTMLElement>("[data-i18n-aria-label], [data-i18n-title]").forEach((element) => {
    for (const attribute of LOCALIZED_ATTRIBUTES) {
      const messageName = element.getAttribute(`data-i18n-${attribute}`);
      if (messageName) {
        element.setAttribute(attribute, t(messageName));
      }
    }
  });
}
