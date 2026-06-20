import "./popup.css";
import { MESSAGE_TOGGLE_ACTIVE_TAB } from "./shared/messages";
import { loadSettings, saveSettings, SUPPORTED_LANGUAGES, type ExtensionSettings } from "./shared/settings";

const form = queryRequired<HTMLFormElement>("#popup-form");
const sourceLanguageSelect = queryRequired<HTMLSelectElement>("#source-language");
const targetLanguageSelect = queryRequired<HTMLSelectElement>("#target-language");
const showOverlayInput = queryRequired<HTMLInputElement>("#show-overlay");
const swapLanguagesButton = queryRequired<HTMLButtonElement>("#swap-languages");
const toggleTranslationButton = queryRequired<HTMLButtonElement>("#toggle-translation");
const routeLabel = queryRequired<HTMLSpanElement>("#route-label");
const statusText = queryRequired<HTMLSpanElement>("#status");

populateLanguageSelect(sourceLanguageSelect);
populateLanguageSelect(targetLanguageSelect);

void initializePopup();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void persistSettings().then(toggleActiveTab);
});

sourceLanguageSelect.addEventListener("change", () => {
  void persistSettings();
});

targetLanguageSelect.addEventListener("change", () => {
  void persistSettings();
});

showOverlayInput.addEventListener("change", () => {
  void persistSettings();
});

swapLanguagesButton.addEventListener("click", () => {
  const sourceLanguage = sourceLanguageSelect.value;
  sourceLanguageSelect.value = targetLanguageSelect.value;
  targetLanguageSelect.value = sourceLanguage;
  void persistSettings();
});

async function initializePopup(): Promise<void> {
  const settings = await loadSettings();
  applySettings(settings);
  updateRouteLabel();
}

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
    throw new Error(`Popup control is missing: ${selector}`);
  }

  return element;
}

function applySettings(settings: ExtensionSettings): void {
  sourceLanguageSelect.value = settings.sourceLanguage;
  targetLanguageSelect.value = settings.targetLanguage;
  showOverlayInput.checked = settings.showOverlay;
}

async function persistSettings(): Promise<void> {
  await saveSettings(readSettings());
  updateRouteLabel();
  setStatus("Saved");
}

function readSettings(): ExtensionSettings {
  return {
    sourceLanguage: sourceLanguageSelect.value,
    targetLanguage: targetLanguageSelect.value,
    showOverlay: showOverlayInput.checked
  };
}

async function toggleActiveTab(): Promise<void> {
  toggleTranslationButton.disabled = true;
  setStatus("Running");

  try {
    const response = (await chrome.runtime.sendMessage({ type: MESSAGE_TOGGLE_ACTIVE_TAB })) as
      | { ok?: boolean; message?: string }
      | undefined;

    if (response?.ok === false) {
      setStatus(response.message ?? "Failed", "error");
      return;
    }

    setStatus("Applied");
    window.setTimeout(() => window.close(), 250);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Failed";
    setStatus(message, "error");
  } finally {
    toggleTranslationButton.disabled = false;
  }
}

function updateRouteLabel(): void {
  routeLabel.textContent = `${sourceLanguageSelect.value} -> ${targetLanguageSelect.value}`;
}

function setStatus(message: string, tone: "success" | "error" = "success"): void {
  statusText.textContent = message;
  statusText.dataset.tone = tone;
}
