export interface ExtensionSettings {
  targetLanguage: string;
  showOverlay: boolean;
}

export interface ContentDependencies {
  document?: Document;
  navigator?: Navigator;
  Translator?: AkraTranslatorApi | null;
  LanguageDetector?: AkraLanguageDetectorApi | null;
}

export type TranslationResult =
  | { status: "translated"; translatedCount: number }
  | { status: "restored"; restoredCount: number }
  | { status: "cancelled"; restoredCount: number }
  | { status: "no_text"; message: string }
  | { status: "error"; message: string };

interface TranslationRecord {
  node: Text;
  originalText: string;
  translatedText?: string;
}

interface TranslationSession {
  status: "idle" | "translating" | "translated";
  records: TranslationRecord[];
  abortController?: AbortController;
  runId?: symbol;
  targetLanguage?: string;
}

interface WhitespaceSplit {
  leading: string;
  core: string;
  trailing: string;
}

const EXCLUDED_TAGS = new Set([
  "canvas",
  "code",
  "input",
  "kbd",
  "math",
  "noscript",
  "option",
  "pre",
  "samp",
  "script",
  "select",
  "style",
  "svg",
  "textarea",
  "var"
]);

const OVERLAY_ID = "akra-quick-translate-overlay";
const OVERLAY_ATTRIBUTE = "data-akra-quick-translate-overlay";
const DEFAULT_SETTINGS: ExtensionSettings = {
  targetLanguage: "ko",
  showOverlay: true
};

let session: TranslationSession = {
  status: "idle",
  records: []
};

export function resetTranslationSession(): void {
  session.abortController?.abort();
  session = {
    status: "idle",
    records: []
  };
}

export function collectVisibleTextNodes(root: ParentNode): Text[] {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) {
    return [];
  }

  const nodeFilter = doc.defaultView?.NodeFilter ?? globalThis.NodeFilter;
  const walker = doc.createTreeWalker(root, nodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldTranslateTextNode(node as Text) ? nodeFilter.FILTER_ACCEPT : nodeFilter.FILTER_REJECT;
    }
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  return nodes;
}

export function shouldTranslateTextNode(node: Text): boolean {
  const text = node.nodeValue ?? "";
  if (!hasTranslatableText(text)) {
    return false;
  }

  const parent = node.parentElement;
  if (!parent) {
    return false;
  }

  if (hasBlockedAncestor(parent)) {
    return false;
  }

  return isVisible(parent);
}

export async function togglePageTranslation(
  settingsInput: Partial<ExtensionSettings> = DEFAULT_SETTINGS,
  dependencies: ContentDependencies = {}
): Promise<TranslationResult> {
  const doc = resolveDocument(dependencies);
  const settings = normalizeSettings(settingsInput);

  if (session.status === "translating") {
    session.abortController?.abort();
    const restoredCount = restoreOriginals();
    showOverlay(doc, "Translation cancelled", "warning", settings.showOverlay);
    return { status: "cancelled", restoredCount };
  }

  if (session.status === "translated") {
    const restoredCount = restoreOriginals();
    showOverlay(doc, "Original text restored", "success", settings.showOverlay);
    return { status: "restored", restoredCount };
  }

  const translatorApi = resolveTranslatorApi(dependencies);
  if (!translatorApi) {
    const message = "Chrome Translator API is not available";
    showOverlay(doc, message, "error", settings.showOverlay);
    return { status: "error", message };
  }

  const root = doc.body ?? doc.documentElement;
  const records = collectVisibleTextNodes(root).map((node) => ({
    node,
    originalText: node.nodeValue ?? ""
  }));

  if (records.length === 0) {
    const message = "No visible text found";
    showOverlay(doc, message, "info", settings.showOverlay);
    return { status: "no_text", message };
  }

  const abortController = new AbortController();
  const runId = Symbol("akra-translation-run");
  session = {
    status: "translating",
    records,
    abortController,
    runId,
    targetLanguage: settings.targetLanguage
  };

  showOverlay(doc, `Translating 0/${records.length}`, "progress", settings.showOverlay, 0);

  try {
    const translatedCount = await translateRecords(records, settings, dependencies, abortController.signal, doc);
    if (abortController.signal.aborted) {
      throw createAbortError();
    }

    session.status = "translated";
    session.abortController = undefined;
    showOverlay(doc, `Translated ${translatedCount} text nodes`, "success", settings.showOverlay);
    return { status: "translated", translatedCount };
  } catch (error) {
    if (abortController.signal.aborted) {
      if (session.runId === runId) {
        const restoredCount = restoreOriginals();
        showOverlay(doc, "Translation cancelled", "warning", settings.showOverlay);
        return { status: "cancelled", restoredCount };
      }

      return { status: "cancelled", restoredCount: records.length };
    }

    const message = toErrorMessage(error);
    if (session.runId === runId) {
      restoreOriginals();
    }
    showOverlay(doc, message, "error", settings.showOverlay);
    return { status: "error", message };
  }
}

async function translateRecords(
  records: TranslationRecord[],
  settings: ExtensionSettings,
  dependencies: ContentDependencies,
  signal: AbortSignal,
  doc: Document
): Promise<number> {
  const targetLanguage = normalizeLanguageCode(settings.targetLanguage);
  const fallbackSourceLanguage = getFallbackSourceLanguage(doc, dependencies.navigator ?? globalThis.navigator);
  const translatorPool = new TranslatorPool(resolveTranslatorApi(dependencies), targetLanguage, doc, settings.showOverlay);
  const detector = await createLanguageDetector(dependencies, doc, settings.showOverlay);
  let translatedCount = 0;

  try {
    for (const [index, record] of records.entries()) {
      assertNotAborted(signal);
      const split = splitWhitespace(record.originalText);
      const sourceLanguage = await detectSourceLanguage(detector, split.core, fallbackSourceLanguage, targetLanguage);

      if (sourceLanguage === targetLanguage) {
        continue;
      }

      const translatedText = await translatorPool.translate(split.core, sourceLanguage, signal);
      assertNotAborted(signal);
      record.translatedText = `${split.leading}${translatedText}${split.trailing}`;
      record.node.nodeValue = record.translatedText;
      translatedCount += 1;
      showOverlay(doc, `Translating ${index + 1}/${records.length}`, "progress", settings.showOverlay, 0);
    }
  } finally {
    detector?.destroy?.();
    translatorPool.destroy();
  }

  return translatedCount;
}

class TranslatorPool {
  private readonly translators = new Map<string, AkraTranslator>();

  constructor(
    private readonly translatorApi: AkraTranslatorApi | undefined,
    private readonly targetLanguage: string,
    private readonly document: Document,
    private readonly showStatus: boolean
  ) {}

  async translate(text: string, sourceLanguage: string, signal: AbortSignal): Promise<string> {
    assertNotAborted(signal);

    const translator = await this.getTranslator(sourceLanguage);
    assertNotAborted(signal);
    return translator.translate(text);
  }

  destroy(): void {
    for (const translator of this.translators.values()) {
      translator.destroy?.();
    }
    this.translators.clear();
  }

  private async getTranslator(sourceLanguage: string): Promise<AkraTranslator> {
    if (!this.translatorApi) {
      throw new Error("Chrome Translator API is not available");
    }

    const key = `${sourceLanguage}:${this.targetLanguage}`;
    const existing = this.translators.get(key);
    if (existing) {
      return existing;
    }

    const options: AkraTranslatorCreateOptions = {
      sourceLanguage,
      targetLanguage: this.targetLanguage
    };

    if (this.translatorApi.availability) {
      const availability = await this.translatorApi.availability(options);
      if (availability === "unavailable") {
        throw new Error(`Translation is unavailable for ${sourceLanguage} to ${this.targetLanguage}`);
      }
    }

    const translator = await this.translatorApi.create({
      ...options,
      monitor: (monitor) => {
        monitor.addEventListener("downloadprogress", (event) => {
          const progress = event as ProgressEvent;
          const percent = Math.round(progress.loaded * 100);
          showOverlay(this.document, `Downloading translation model ${percent}%`, "progress", this.showStatus, 0);
        });
      }
    });

    this.translators.set(key, translator);
    return translator;
  }
}

async function createLanguageDetector(
  dependencies: ContentDependencies,
  doc: Document,
  showStatus: boolean
): Promise<AkraLanguageDetector | undefined> {
  const detectorApi = resolveLanguageDetectorApi(dependencies);
  if (!detectorApi) {
    return undefined;
  }

  try {
    if (detectorApi.availability) {
      const availability = await detectorApi.availability();
      if (availability === "unavailable") {
        return undefined;
      }
    }

    return await detectorApi.create({
      monitor: (monitor) => {
        monitor.addEventListener("downloadprogress", (event) => {
          const progress = event as ProgressEvent;
          const percent = Math.round(progress.loaded * 100);
          showOverlay(doc, `Downloading language detector ${percent}%`, "progress", showStatus, 0);
        });
      }
    });
  } catch {
    return undefined;
  }
}

async function detectSourceLanguage(
  detector: AkraLanguageDetector | undefined,
  text: string,
  fallbackLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!detector || text.length < 20) {
    return fallbackLanguage;
  }

  try {
    const [bestResult] = await detector.detect(text.slice(0, 1000));
    if (bestResult && bestResult.confidence >= 0.55) {
      return normalizeLanguageCode(bestResult.detectedLanguage);
    }
  } catch {
    return fallbackLanguage;
  }

  return fallbackLanguage === targetLanguage ? targetLanguage : fallbackLanguage;
}

function restoreOriginals(): number {
  const restoredCount = session.records.length;
  for (const record of session.records) {
    if (record.node.isConnected) {
      record.node.nodeValue = record.originalText;
    }
  }

  session = {
    status: "idle",
    records: []
  };

  return restoredCount;
}

function hasBlockedAncestor(element: Element): boolean {
  for (let current: Element | null = element; current; current = current.parentElement) {
    const tagName = current.localName.toLowerCase();
    if (EXCLUDED_TAGS.has(tagName)) {
      return true;
    }

    if (current.hasAttribute(OVERLAY_ATTRIBUTE)) {
      return true;
    }

    if (current.hasAttribute("hidden") || current.getAttribute("aria-hidden") === "true") {
      return true;
    }

    const contentEditable = current.getAttribute("contenteditable");
    if (contentEditable !== null && contentEditable.toLowerCase() !== "false") {
      return true;
    }
  }

  return false;
}

function isVisible(element: Element): boolean {
  const win = element.ownerDocument.defaultView;
  if (!win) {
    return true;
  }

  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = win.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0") {
      return false;
    }
  }

  return true;
}

function hasTranslatableText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && /\p{L}/u.test(trimmed);
}

function splitWhitespace(text: string): WhitespaceSplit {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return {
    leading: match?.[1] ?? "",
    core: match?.[2] ?? text.trim(),
    trailing: match?.[3] ?? ""
  };
}

function normalizeSettings(settings: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    targetLanguage: normalizeLanguageCode(settings.targetLanguage ?? DEFAULT_SETTINGS.targetLanguage),
    showOverlay: typeof settings.showOverlay === "boolean" ? settings.showOverlay : DEFAULT_SETTINGS.showOverlay
  };
}

function normalizeLanguageCode(value: string): string {
  const normalized = value.trim().toLowerCase().replace("_", "-");
  if (!normalized) {
    return DEFAULT_SETTINGS.targetLanguage;
  }

  if (normalized === "zh-hant" || normalized.startsWith("zh-hant-")) {
    return "zh-Hant";
  }

  return normalized.split("-")[0] ?? DEFAULT_SETTINGS.targetLanguage;
}

function getFallbackSourceLanguage(doc: Document, nav: Navigator | undefined): string {
  return normalizeLanguageCode(doc.documentElement.lang || nav?.language || "en");
}

function resolveDocument(dependencies: ContentDependencies): Document {
  const doc = dependencies.document ?? globalThis.document;
  if (!doc) {
    throw new Error("Document is not available");
  }

  return doc;
}

function resolveTranslatorApi(dependencies: ContentDependencies): AkraTranslatorApi | undefined {
  if (Object.hasOwn(dependencies, "Translator")) {
    return dependencies.Translator ?? undefined;
  }

  return globalThis.Translator;
}

function resolveLanguageDetectorApi(dependencies: ContentDependencies): AkraLanguageDetectorApi | undefined {
  if (Object.hasOwn(dependencies, "LanguageDetector")) {
    return dependencies.LanguageDetector ?? undefined;
  }

  return globalThis.LanguageDetector;
}

function showOverlay(
  doc: Document,
  message: string,
  tone: "error" | "info" | "progress" | "success" | "warning",
  enabled: boolean,
  autoHideMs = 2400
): void {
  if (!enabled || !doc.body) {
    return;
  }

  let overlay = doc.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = doc.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute(OVERLAY_ATTRIBUTE, "true");
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    Object.assign(overlay.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      maxWidth: "320px",
      padding: "10px 12px",
      borderRadius: "8px",
      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.22)",
      color: "#ffffff",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: "13px",
      lineHeight: "1.35",
      pointerEvents: "none"
    });
    doc.body.append(overlay);
  }

  overlay.textContent = message;
  overlay.style.background = getOverlayColor(tone);

  if (autoHideMs > 0) {
    const win = doc.defaultView ?? window;
    win.setTimeout(() => {
      overlay?.remove();
    }, autoHideMs);
  }
}

function getOverlayColor(tone: "error" | "info" | "progress" | "success" | "warning"): string {
  switch (tone) {
    case "error":
      return "#b42318";
    case "success":
      return "#067647";
    case "warning":
      return "#b54708";
    case "progress":
      return "#175cd3";
    case "info":
      return "#344054";
  }
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw createAbortError();
  }
}

function createAbortError(): DOMException {
  return new DOMException("Translation cancelled", "AbortError");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Translation failed";
}
