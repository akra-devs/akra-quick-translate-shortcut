# akra.kr Public Page Drafts

## `/quick-translate`

# Akra Quick Translate

Chrome 내장 Translator API로 현재 페이지를 빠르게 번역하고, 같은 단축키로 원문을 다시 복구하는 무료 Chrome 확장 프로그램입니다.

## 주요 기능

- `Alt+T` 또는 macOS `Option+T`로 페이지 번역과 원문 복구를 토글합니다.
- 팝업에서 원본 언어와 대상 언어를 선택합니다.
- 옵션 페이지에서 기본 언어쌍, 상태 오버레이, 단축키 설정으로 이동할 수 있습니다.
- 페이지 우클릭 메뉴에서도 번역을 실행할 수 있습니다.
- 번역 텍스트는 Chrome의 내장 Translator API 처리에만 사용됩니다.

## 설치

Chrome Web Store 출시 후 설치 버튼을 연결합니다.

## 사용법

1. Chrome 138 이상에서 웹페이지를 엽니다.
2. 확장 아이콘을 눌러 원본 언어와 대상 언어를 고릅니다.
3. `Translate / Restore` 또는 `Alt+T`를 누릅니다.
4. 다시 누르면 저장해 둔 원문으로 복구됩니다.

## 제한사항

- `chrome://`, `edge://`, `about:` 같은 브라우저 내부 페이지에서는 동작하지 않습니다.
- 로컬 파일에서 사용하려면 Chrome 확장 상세 페이지에서 `Allow access to file URLs`를 켜야 합니다.
- Chrome 내장 Translator API가 지원되지 않거나 언어 모델 다운로드가 필요한 경우 번역이 지연되거나 실패할 수 있습니다.

## 후원

Akra Quick Translate는 무료로 제공합니다. 개발을 응원하려면 CTEE 후원 페이지를 이용할 수 있습니다. 후원은 선택 사항이며 기능 사용과 무관합니다.

## `/quick-translate/privacy`

# Akra Quick Translate 개인정보 처리방침

Akra Quick Translate는 현재 페이지의 보이는 텍스트를 번역하기 위해 Chrome 브라우저의 내장 Translator API를 사용합니다. Akra는 번역할 텍스트를 Akra 서버로 전송하거나 저장하지 않습니다.

## 처리하는 정보

- 사용자가 선택한 원본 언어, 대상 언어, 상태 오버레이 설정
- 현재 탭에서 번역 대상이 되는 페이지 텍스트

## 저장 위치

언어와 오버레이 설정은 Chrome `storage.sync`에 저장되어 사용자의 Chrome 프로필에서 동기화될 수 있습니다. 페이지 텍스트와 번역 결과는 확장 기능 실행 중 현재 탭 안에서만 사용되며 Akra 서버에 저장되지 않습니다.

## 외부 전송

Akra는 페이지 텍스트, 번역 결과, 방문 URL, 사용 기록을 자체 서버로 전송하지 않습니다. 번역 가능 여부와 실제 번역 처리는 Chrome 내장 Translator API의 동작과 Chrome 정책을 따릅니다.

## 문의

개인정보 관련 문의는 `contact@akradev.studio`로 보내 주세요.

## `/quick-translate/support`

# Akra Quick Translate 지원

문의: `contact@akradev.studio`

버그 제보와 기능 요청은 GitHub Issues를 사용할 수 있습니다.

## FAQ

### 어떤 Chrome 버전이 필요한가요?

Chrome 138 이상이 필요합니다. 다른 Chromium 브라우저에서는 Chrome 내장 Translator API 지원 상태에 따라 동작하지 않을 수 있습니다.

### 단축키를 바꿀 수 있나요?

예. 팝업이나 옵션 페이지에서 `Shortcut`을 누르거나 `chrome://extensions/shortcuts`에서 Akra Quick Translate의 단축키를 변경할 수 있습니다.

### 로컬 파일에서 동작하지 않습니다.

Chrome 확장 상세 페이지에서 `Allow access to file URLs`를 켠 뒤 다시 시도하세요.

### 브라우저 내부 페이지에서 동작하지 않습니다.

Chrome 보안 제한으로 `chrome://`, `edge://`, `about:` 페이지에서는 확장이 페이지 내용을 변경할 수 없습니다.

### 번역이 느리거나 실패합니다.

처음 사용하는 언어쌍은 Chrome이 언어 모델을 다운로드해야 할 수 있습니다. Chrome 내장 Translator API가 해당 환경에서 지원되는지도 확인하세요.
