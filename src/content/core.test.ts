import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectVisibleTextNodes,
  resetTranslationSession,
  togglePageTranslation,
  type ExtensionSettings
} from "./core";

const SETTINGS: ExtensionSettings = {
  targetLanguage: "ko",
  showOverlay: false
};

describe("content translation core", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    resetTranslationSession();
    document.documentElement.lang = "en";
  });

  it("collects visible text nodes and skips excluded or non-editable surfaces", () => {
    document.body.innerHTML = `
      <main>
        <p>Hello world</p>
        <script>const hiddenScript = "ignore";</script>
        <style>.hidden { color: red; }</style>
        <pre>const code = true;</pre>
        <code>inlineCode()</code>
        <input value="input text" />
        <textarea>textarea text</textarea>
        <select><option>option text</option></select>
        <div contenteditable="true">Editable text</div>
        <p hidden>Hidden text</p>
        <p style="display: none">Display none text</p>
        <p aria-hidden="true">Aria hidden text</p>
        <p data-akra-quick-translate-overlay="true">Overlay text</p>
        <p>123 !!!</p>
      </main>
    `;

    const texts = collectVisibleTextNodes(document.body).map((node) => node.nodeValue?.trim());

    expect(texts).toEqual(["Hello world"]);
  });

  it("stores originals and restores them on the second toggle", async () => {
    document.body.innerHTML = `<p>Hello world</p>`;
    const translator = createTranslatorApi((text) => Promise.resolve(`KO:${text}`));

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "translated",
      translatedCount: 1
    });
    expect(document.querySelector("p")?.textContent).toBe("KO:Hello world");

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "restored",
      restoredCount: 1
    });
    expect(document.querySelector("p")?.textContent).toBe("Hello world");
  });

  it("uses the Language Detector result when translating with a mocked Translator", async () => {
    document.body.innerHTML = `<p>Hola mundo, este texto deberia detectarse como espanol.</p>`;
    const translator = createTranslatorApi((text) => Promise.resolve(`KO:${text}`));
    const detector: AkraLanguageDetectorApi = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue({
        detect: vi.fn().mockResolvedValue([{ detectedLanguage: "es", confidence: 0.92 }]),
        destroy: vi.fn()
      })
    };

    await togglePageTranslation(SETTINGS, { document, Translator: translator, LanguageDetector: detector });

    expect(translator.availability).toHaveBeenCalledWith({
      sourceLanguage: "es",
      targetLanguage: "ko"
    });
    expect(document.querySelector("p")?.textContent).toBe("KO:Hola mundo, este texto deberia detectarse como espanol.");
  });

  it("reports an unsupported Translator API without mutating the page", async () => {
    document.body.innerHTML = `<p>Hello world</p>`;

    await expect(togglePageTranslation(SETTINGS, { document, Translator: null })).resolves.toMatchObject({
      status: "error",
      message: "Chrome Translator API is not available"
    });
    expect(document.querySelector("p")?.textContent).toBe("Hello world");
  });

  it("cancels an in-flight translation and restores pending originals", async () => {
    document.body.innerHTML = `<p>Hello world</p>`;
    const deferred = createDeferred<string>();
    const translatorInstance: AkraTranslator = {
      translate: vi.fn().mockReturnValue(deferred.promise),
      destroy: vi.fn()
    };
    const translator: AkraTranslatorApi = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(translatorInstance)
    };

    const firstToggle = togglePageTranslation(SETTINGS, { document, Translator: translator });
    await vi.waitFor(() => expect(translatorInstance.translate).toHaveBeenCalled());

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "cancelled",
      restoredCount: 1
    });
    expect(document.querySelector("p")?.textContent).toBe("Hello world");

    deferred.resolve("KO:Hello world");
    await expect(firstToggle).resolves.toMatchObject({
      status: "cancelled"
    });
    expect(document.querySelector("p")?.textContent).toBe("Hello world");
  });
});

function createTranslatorApi(translate: (text: string) => Promise<string>): AkraTranslatorApi {
  return {
    availability: vi.fn().mockResolvedValue("available"),
    create: vi.fn().mockResolvedValue({
      translate: vi.fn(translate),
      destroy: vi.fn()
    })
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
