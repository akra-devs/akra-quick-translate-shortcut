import "./options.css";
import { loadSettings, saveSettings, SUPPORTED_TARGET_LANGUAGES } from "./shared/settings";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const targetLanguageSelect = document.querySelector<HTMLSelectElement>("#target-language");
const showOverlayInput = document.querySelector<HTMLInputElement>("#show-overlay");
const statusText = document.querySelector<HTMLParagraphElement>("#status");

if (!form || !targetLanguageSelect || !showOverlayInput || !statusText) {
  throw new Error("Options page controls are missing");
}

for (const language of SUPPORTED_TARGET_LANGUAGES) {
  const option = document.createElement("option");
  option.value = language.code;
  option.textContent = `${language.label} (${language.code})`;
  targetLanguageSelect.append(option);
}

void loadSettings().then((settings) => {
  targetLanguageSelect.value = settings.targetLanguage;
  showOverlayInput.checked = settings.showOverlay;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  void saveSettings({
    targetLanguage: targetLanguageSelect.value,
    showOverlay: showOverlayInput.checked
  }).then(() => {
    statusText.textContent = "Saved";
    window.setTimeout(() => {
      statusText.textContent = "";
    }, 1800);
  });
});
