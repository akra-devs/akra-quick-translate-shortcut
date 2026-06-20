# Akra Quick Translate

Chrome 내장 `Translator API`를 사용해 현재 페이지의 텍스트를 빠르게 번역하고, 다시 원문으로 복구하는 Manifest V3 확장 프로그램입니다.

## 주요 기능

- `Alt+T` 단축키로 페이지 번역과 원문 복구를 토글합니다.
- macOS에서는 `Option+T`로 동일하게 동작합니다.
- 확장 아이콘을 클릭하면 언어쌍을 고르고 번역/복구를 실행하는 popup이 열립니다.
- popup에서 현재 등록된 단축키를 확인하고 단축키 설정 화면으로 이동할 수 있습니다.
- 페이지 우클릭 메뉴에서도 빠르게 번역/복구를 토글할 수 있습니다.
- 기본 언어쌍은 영어(`en`)에서 한국어(`ko`)입니다.
- 옵션 페이지에서 원본 언어, 대상 언어, 상태 오버레이 표시 여부를 설정할 수 있습니다.
- 번역 중, 완료, 복구, 오류 상태를 작은 오버레이로 표시합니다.
- `script`, `style`, `code`, `pre`, 입력 필드, `contenteditable` 영역 등은 번역 대상에서 제외합니다.

## 요구사항

- Chrome 138+ 데스크톱
- Node.js 24+
- npm 11+

Chrome 내장 번역 API를 사용하므로, 지원되지 않는 Chrome 버전이나 브라우저에서는 번역이 동작하지 않을 수 있습니다. 첫 번역 시 언어 모델 다운로드가 필요할 수 있습니다.

## 설치 및 빌드

```bash
npm install
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

## Chrome에 로드하기

1. Chrome에서 `chrome://extensions`를 엽니다.
2. 오른쪽 위의 **Developer mode**를 켭니다.
3. **Load unpacked**를 클릭합니다.
4. 이 프로젝트의 `dist/` 폴더를 선택합니다.

```text
/home/akra/dev/akra-quick-translate/dist
```

코드를 수정한 뒤에는 다시 빌드하고, `chrome://extensions`에서 확장을 새로고침해야 합니다.

```bash
npm run build
```

## 사용법

웹페이지를 연 뒤 다음 중 하나로 번역을 토글합니다.

- `Alt+T`
- macOS `Option+T`
- 확장 아이콘 클릭 후 `Translate / Restore`
- 페이지 우클릭 후 `Toggle page translation`

한 번 실행하면 페이지의 보이는 텍스트가 대상 언어로 번역됩니다. 다시 실행하면 저장해 둔 원문으로 복구됩니다.

기본 설정은 `English (en) -> Korean (ko)`입니다. 다른 원본 언어 페이지를 번역할 때는 확장 popup 또는 옵션 페이지에서 원본 언어를 먼저 바꾸는 것이 좋습니다.

## 옵션

Chrome 툴바의 확장 아이콘을 클릭하면 바로 설정할 수 있습니다. popup의 shortcut 표시를 누르면 Chrome 단축키 설정 화면이 열립니다. 확장 상세 페이지의 **Extension options**에서도 같은 설정을 변경할 수 있습니다.

- 원본 언어
- 대상 언어
- 상태 오버레이 표시 여부

단축키는 Chrome의 `chrome://extensions/shortcuts`에서 변경할 수 있습니다.

## 개발 명령어

```bash
npm run test
npm run typecheck
npm run build
```

- `npm run test`: Vitest 기반 단위 테스트 실행
- `npm run typecheck`: TypeScript 타입 검사
- `npm run build`: Chrome 확장 배포용 파일 생성

## 테스트 범위

현재 테스트는 다음 동작을 검증합니다.

- 보이는 텍스트 노드 수집과 제외 대상 필터링
- 번역 전 원문 저장 및 원문 복구
- `Translator` mock 기반 번역 치환
- 선택한 원본 언어가 번역 API에 전달되는지 확인
- 한국어 원문이 영어에서 한국어 번역 요청에 섞이지 않는지 확인
- 지원되지 않는 페이지 URL 판별
- 지원되지 않는 Translator API 처리
- 번역 중 재토글 시 취소 및 원문 복구

## 제한사항

- `chrome://...`, `edge://...`, `about:...` 같은 브라우저 내부 페이지에서는 동작하지 않습니다.
- 로컬 파일(`file://`)에서 사용하려면 확장 상세 페이지에서 **Allow access to file URLs**를 켜야 합니다.
- 원본 언어를 잘못 선택하면 번역 품질이 크게 떨어질 수 있습니다.
- 페이지가 번역 중에 DOM을 크게 변경하면 일부 텍스트는 복구 대상에서 제외될 수 있습니다.
- Chrome의 내장 번역 API 지원 여부와 언어 모델 상태에 따라 번역 가능 여부가 달라질 수 있습니다.

## 프로젝트 구조

```text
public/manifest.json        Chrome MV3 manifest
src/background.ts           확장 이벤트와 토글 진입점
src/content.ts              content script 메시지 리스너
src/content/core.ts         텍스트 수집, 번역, 복구 핵심 로직
src/options.ts              옵션 페이지 동작
src/shared/                 공용 메시지와 설정 타입
```
