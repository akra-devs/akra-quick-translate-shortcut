export {};

declare global {
  type AkraTranslatorAvailability = "available" | "downloadable" | "downloading" | "unavailable";

  interface AkraTranslatorCreateOptions {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }

  interface AkraTranslator {
    translate(text: string): Promise<string>;
    destroy?: () => void;
  }

  interface AkraTranslatorApi {
    availability?: (options: AkraTranslatorCreateOptions) => Promise<AkraTranslatorAvailability>;
    create(options: AkraTranslatorCreateOptions): Promise<AkraTranslator>;
  }

  interface AkraLanguageDetectionResult {
    detectedLanguage: string;
    confidence: number;
  }

  interface AkraLanguageDetector {
    detect(text: string): Promise<AkraLanguageDetectionResult[]>;
    destroy?: () => void;
  }

  interface AkraLanguageDetectorApi {
    availability?: () => Promise<AkraTranslatorAvailability>;
    create(options?: { monitor?: (monitor: EventTarget) => void }): Promise<AkraLanguageDetector>;
  }

  var Translator: AkraTranslatorApi | undefined;
  var LanguageDetector: AkraLanguageDetectorApi | undefined;

  interface Window {
    Translator?: AkraTranslatorApi;
    LanguageDetector?: AkraLanguageDetectorApi;
  }
}
