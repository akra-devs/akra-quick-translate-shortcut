import "./options.css";
import { loadSettings, saveSettings, SUPPORTED_LANGUAGES } from "./shared/settings";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const sourceLanguageSelect = document.querySelector<HTMLSelectElement>("#source-language");
const targetLanguageSelect = document.querySelector<HTMLSelectElement>("#target-language");
const showOverlayInput = document.querySelector<HTMLInputElement>("#show-overlay");
const statusText = document.querySelector<HTMLParagraphElement>("#status");

if (!form || !sourceLanguageSelect || !targetLanguageSelect || !showOverlayInput || !statusText) {
  throw new Error("Options page controls are missing");
}

populateLanguageSelect(sourceLanguageSelect);
populateLanguageSelect(targetLanguageSelect);

void loadSettings().then((settings) => {
  sourceLanguageSelect.value = settings.sourceLanguage;
  targetLanguageSelect.value = settings.targetLanguage;
  showOverlayInput.checked = settings.showOverlay;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  void saveSettings({
    sourceLanguage: sourceLanguageSelect.value,
    targetLanguage: targetLanguageSelect.value,
    showOverlay: showOverlayInput.checked
  }).then(() => {
    statusText.textContent = "Saved";
    window.setTimeout(() => {
      statusText.textContent = "";
    }, 1800);
  });
});

function populateLanguageSelect(select: HTMLSelectElement): void {
  for (const language of SUPPORTED_LANGUAGES) {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = `${language.label} (${language.code})`;
    select.append(option);
  }
}
