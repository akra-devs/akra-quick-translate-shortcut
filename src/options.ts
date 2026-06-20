import "./options.css";
import { loadSettings, saveSettings, SUPPORTED_LANGUAGES } from "./shared/settings";

const form = queryRequired<HTMLFormElement>("#settings-form");
const sourceLanguageSelect = queryRequired<HTMLSelectElement>("#source-language");
const targetLanguageSelect = queryRequired<HTMLSelectElement>("#target-language");
const showOverlayInput = queryRequired<HTMLInputElement>("#show-overlay");
const openShortcutsButton = queryRequired<HTMLButtonElement>("#open-shortcuts");
const shortcutLabel = queryRequired<HTMLElement>("#shortcut-label");
const statusText = queryRequired<HTMLParagraphElement>("#status");

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
    statusText.textContent = "Saved";
    window.setTimeout(() => {
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
    statusText.textContent = "Unable to open shortcuts";
  }
}

async function updateShortcutLabel(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const command = commands.find((command) => command.name === "toggle-translation");
  shortcutLabel.textContent = command?.shortcut || "Not set";
}
