import "./options.css";
import { applyDocumentLocale, applyLocalizedText, t } from "./shared/i18n";
import { DONATION_URL, PRIVACY_URL, PRODUCT_URL, SUPPORT_URL } from "./shared/links";
import { loadSettings, saveSettings, SUPPORTED_LANGUAGES } from "./shared/settings";

applyDocumentLocale();
applyLocalizedText();

const form = queryRequired<HTMLFormElement>("#settings-form");
const sourceLanguageSelect = queryRequired<HTMLSelectElement>("#source-language");
const targetLanguageSelect = queryRequired<HTMLSelectElement>("#target-language");
const showOverlayInput = queryRequired<HTMLInputElement>("#show-overlay");
const openShortcutsButton = queryRequired<HTMLButtonElement>("#open-shortcuts");
const productLink = queryRequired<HTMLAnchorElement>("#product-link");
const supportLink = queryRequired<HTMLAnchorElement>("#support-link");
const privacyLink = queryRequired<HTMLAnchorElement>("#privacy-link");
const supportAkraLink = queryRequired<HTMLAnchorElement>("#support-akra-link");
const shortcutLabel = queryRequired<HTMLElement>("#shortcut-label");
const statusText = queryRequired<HTMLParagraphElement>("#status");

productLink.href = PRODUCT_URL;
supportLink.href = SUPPORT_URL;
privacyLink.href = PRIVACY_URL;
supportAkraLink.href = DONATION_URL;
let statusTimeoutId: number | undefined;
populateLanguageSelect(sourceLanguageSelect);
populateLanguageSelect(targetLanguageSelect);

void loadSettings().then((settings) => {
  sourceLanguageSelect.value = settings.sourceLanguage;
  targetLanguageSelect.value = settings.targetLanguage;
  showOverlayInput.checked = settings.showOverlay;
});
void updateShortcutLabel();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  void saveSettings({
    sourceLanguage: sourceLanguageSelect.value,
    targetLanguage: targetLanguageSelect.value,
    showOverlay: showOverlayInput.checked
  }).then(() => {
    statusText.textContent = t("statusSaved");
    window.clearTimeout(statusTimeoutId);
    statusTimeoutId = window.setTimeout(() => {
      statusText.textContent = "";
    }, 1800);
  });
});

openShortcutsButton.addEventListener("click", () => {
  void openKeyboardShortcuts();
});

function populateLanguageSelect(select: HTMLSelectElement): void {
  for (const language of SUPPORTED_LANGUAGES) {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = `${language.label} (${language.code})`;
    select.append(option);
  }
}

function queryRequired<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Options control is missing: ${selector}`);
  }

  return element;
}

async function openKeyboardShortcuts(): Promise<void> {
  try {
    await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  } catch {
    statusText.textContent = t("errorOpenShortcuts");
  }
}

async function updateShortcutLabel(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const command = commands.find((command) => command.name === "toggle-translation");
  shortcutLabel.textContent = command?.shortcut || t("shortcutNotSet");
}
