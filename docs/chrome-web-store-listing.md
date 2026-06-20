# Chrome Web Store Listing Draft

## Store Settings

- Category: Productivity
- Pricing: Free
- Regions: All regions
- Official URL: `https://akra.kr/quick-translate`
- Support URL: `https://akra.kr/quick-translate/support`
- Privacy Policy URL: `https://akra.kr/quick-translate/privacy`
- Donation disclosure: optional donation link only, no paid features, subscriptions, or locked functionality.

## English Listing

### Short Description

Toggle page translation and original text restore with Chrome's built-in Translator API.

### Full Description

Akra Quick Translate is a lightweight Chrome extension for translating the current page and restoring the original text with the same action.

Use the toolbar popup to choose source and target languages, then click Translate / Restore. You can also use the default `Alt+T` shortcut, configure your own shortcut in Chrome, or use the page context menu.

Akra Quick Translate uses Chrome's built-in Translator API. Page text is not sent to or stored on Akra servers. Availability depends on Chrome 138+ and the language models supported by your browser.

The extension is free. A small Support Akra link opens an optional CTEE donation page in a new tab. Donations are not required and do not unlock any features.

## Korean Listing

### Short Description

Chrome 내장 Translator API로 페이지 번역과 원문 복구를 빠르게 전환합니다.

### Full Description

Akra Quick Translate는 현재 페이지를 번역하고 같은 동작으로 원문을 다시 복구하는 가벼운 Chrome 확장 프로그램입니다.

툴바 팝업에서 원본 언어와 대상 언어를 선택한 뒤 Translate / Restore를 누르세요. 기본 단축키 `Alt+T`, Chrome 단축키 설정, 페이지 우클릭 메뉴로도 사용할 수 있습니다.

Akra Quick Translate는 Chrome 내장 Translator API를 사용합니다. 페이지 텍스트는 Akra 서버로 전송하거나 저장하지 않습니다. 동작 가능 여부는 Chrome 138 이상과 브라우저가 지원하는 언어 모델 상태에 따라 달라집니다.

확장은 무료입니다. 작은 Akra 후원 링크는 선택적 CTEE 후원 페이지를 새 탭으로 엽니다. 후원은 필수가 아니며 어떤 기능도 잠금 해제하지 않습니다.

## Privacy Tab

Single purpose:
Provide a quick way to translate visible page text and restore the original text on the current page.

Permission justifications:

- `activeTab`: identify and act on the current tab after the user clicks the extension or invokes a shortcut.
- `contextMenus`: provide a page context-menu entry for toggling translation.
- `scripting`: inject the content script when a supported page has not loaded it yet.
- `storage`: save the user's language pair and status overlay preference.
- `http://*/*`, `https://*/*`, `file://*/*`: run translation on regular web pages and local files when the user enables file URL access.

User data disclosure:

- Page text is processed only for translation through Chrome's built-in Translator API.
- Akra does not collect, transmit, sell, or store page text, translation results, browsing history, or personal information.
- Language and overlay settings are stored in Chrome `storage.sync`.

## Asset Checklist

- `store-assets/icon-128.png`
- `store-assets/screenshot-1-popup-language-select.png`
- `store-assets/screenshot-2-translation-restore-status.png`
- `store-assets/screenshot-3-options-shortcuts.png`
- `store-assets/promo-small-440x280.png`
- `store-assets/marquee-1400x560.png`
