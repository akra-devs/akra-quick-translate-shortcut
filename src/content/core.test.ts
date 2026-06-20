import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectVisibleTextNodes,
  resetTranslationSession,
  togglePageTranslation,
  type ExtensionSettings
} from "./core";

const SETTINGS: ExtensionSettings = {
  sourceLanguage: "en",
  targetLanguage: "ko",
  showOverlay: false
};
const SEGMENT_DELIMITER = "\uE000\uE001";

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

  it("reapplies cached translations after restore without translating again", async () => {
    document.body.innerHTML = `
      <main>
        <p>Hello world</p>
        <p>Good morning</p>
      </main>
    `;
    const translatorInstance: AkraTranslator = {
      translate: vi.fn((text: string) =>
        Promise.resolve(
          text
            .split(SEGMENT_DELIMITER)
            .map((part) => `KO:${part}`)
            .join(SEGMENT_DELIMITER)
        )
      ),
      destroy: vi.fn()
    };
    const translator: AkraTranslatorApi = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(translatorInstance)
    };

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "translated",
      translatedCount: 2
    });
    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "restored",
      restoredCount: 2
    });
    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "translated",
      translatedCount: 2
    });

    expect(translator.availability).toHaveBeenCalledTimes(1);
    expect(translator.create).toHaveBeenCalledTimes(1);
    expect(translatorInstance.translate).toHaveBeenCalledTimes(1);
    expect([...document.querySelectorAll("p")].map((node) => node.textContent)).toEqual(["KO:Hello world", "KO:Good morning"]);
  });

  it("uses the selected source language when translating with a mocked Translator", async () => {
    document.body.innerHTML = `<p>Hola mundo, este texto deberia detectarse como espanol.</p>`;
    const translator = createTranslatorApi((text) => Promise.resolve(`KO:${text}`));

    await togglePageTranslation({ ...SETTINGS, sourceLanguage: "es" }, { document, Translator: translator });

    expect(translator.availability).toHaveBeenCalledWith({
      sourceLanguage: "es",
      targetLanguage: "ko"
    });
    expect(document.querySelector("p")?.textContent).toBe("KO:Hola mundo, este texto deberia detectarse como espanol.");
  });

  it("does not send Korean target-language text through an English to Korean translator", async () => {
    document.body.innerHTML = `
      <main>
        <p>제한사항</p>
        <p>chrome://..., edge://..., about:... 같은 브라우저 내부 페이지에서는 동작하지 않습니다.</p>
      </main>
    `;
    const translatorInstance: AkraTranslator = {
      translate: vi.fn((text: string) => Promise.resolve(`KO:${text}`)),
      destroy: vi.fn()
    };
    const translator: AkraTranslatorApi = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(translatorInstance)
    };

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "translated",
      translatedCount: 0
    });

    expect(translatorInstance.translate).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("제한사항");
    expect(document.body.textContent).toContain("동작하지 않습니다.");
  });

  it("batches multiple text nodes into a single translation call", async () => {
    document.body.innerHTML = `
      <main>
        <p>Hello world</p>
        <p>Good morning</p>
        <p>See you soon</p>
      </main>
    `;
    const translatorInstance: AkraTranslator = {
      translate: vi.fn((text: string) =>
        Promise.resolve(
          text
            .split(SEGMENT_DELIMITER)
            .map((part) => `KO:${part}`)
            .join(SEGMENT_DELIMITER)
        )
      ),
      destroy: vi.fn()
    };
    const translator: AkraTranslatorApi = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(translatorInstance)
    };

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "translated",
      translatedCount: 3
    });

    expect(translatorInstance.translate).toHaveBeenCalledTimes(1);
    expect([...document.querySelectorAll("p")].map((node) => node.textContent)).toEqual([
      "KO:Hello world",
      "KO:Good morning",
      "KO:See you soon"
    ]);
  });

  it("falls back to per-node translation if a batch delimiter is not preserved", async () => {
    document.body.innerHTML = `
      <main>
        <p>Hello world</p>
        <p>Good morning</p>
      </main>
    `;
    const translatorInstance: AkraTranslator = {
      translate: vi
        .fn()
        .mockResolvedValueOnce("Delimiter was removed")
        .mockImplementation((text: string) => Promise.resolve(`KO:${text}`)),
      destroy: vi.fn()
    };
    const translator: AkraTranslatorApi = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(translatorInstance)
    };

    await expect(togglePageTranslation(SETTINGS, { document, Translator: translator })).resolves.toMatchObject({
      status: "translated",
      translatedCount: 2
    });

    expect(translatorInstance.translate).toHaveBeenCalledTimes(3);
    expect([...document.querySelectorAll("p")].map((node) => node.textContent)).toEqual(["KO:Hello world", "KO:Good morning"]);
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
