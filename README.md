# 퍼즐 놀이터 (puzzle-guide)

스도쿠와 「고양이 자리」(장르: 스타 배틀 1개형) 논리 퍼즐을 처음부터 배우고 푸는 학습 웹앱. 인터넷 없이 열리는 `index.html` 한 파일.

- 판: v1.0.2 (2026-11-15, 오늘의 퍼즐 기록을 난이도마다) · v1.0.1 (2026-11-15, 앱으로 설치 단추) · v1.0.0 (2026-11-14)
- 두 갈래 길: 스도쿠 18차시(4×4 → 6×6 → 9×9) + 고양이 자리 14차시(4×4 → 9×9), 단원 미션 10개
- 힌트 3단계(어디를 볼까 → 기법 이름과 이유 → 이렇게 해요). 문장은 풀이기가 지금 판에서 찾은 논리 단계로 만든다.
- 오늘의 퍼즐(날짜 씨앗, 스도쿠 1 + 고양이 자리 1, 가족 모두 같은 문제), 자유 연습, 메모, 도전 모드(하트 3), 별·배지·달력·내 기록, 프로필 5명, 기록 파일 옮기기
- 밝게/어둡게, 키보드 조작, 화면 읽기 이름, 구역 색 + 무늬(색약 대비)

## 쓰는 법

```
npm test                  # 시험 61개(무작위 2,500판·힌트 문장 독립 검산 포함, 약 100초)
node build.mjs            # src/ → index.html, sw.js
node tools/serve.mjs 8782 # 화면 확인용 서버(127.0.0.1)
node tools/make-packs.mjs # 차시·미션·큰 판 문제 묶음 다시 만들기(약 1분, 씨앗 고정)
node tools/make-font.mjs  # 글꼴 서브셋 + 이름 바꾸기(PRETENDARD_DIR, PYTHON, PYFTSUBSET 환경 변수)
```

`index.html`을 파일로 열어도 되고, 주소(https)로 열면 서비스 워커가 앱을 기기에 담아 인터넷 없이도 다시 열린다.

## 앱으로 설치 (v1.0.1)

- `manifest.webmanifest`: `id` `/puzzle-guide/`(설치된 앱의 정체성, 예전 판의 기본값 start_url과 같은 주소), `start_url`·`scope` `./`, `display` `standalone`, 아이콘 192·512·maskable 192·512(크기는 빌드 시험이 PNG 머리에서 확인), 스크린샷 narrow 390×844·wide 1280×800(`screenshots/`, 설치 창 미리보기).
- 서비스 워커(`sw.js`)에 fetch 처리기가 있다. Chrome 설치 기준(https, manifest, 아이콘, 서비스 워커)을 채우면 Chrome이 `beforeinstallprompt`를 보낸다.
- 앱 안 「홈 화면에 앱으로 설치」(놀이터 맨 아래 카드, 더보기 목록, 보조 단추): `beforeinstallprompt`를 받아 두었다가 누르면 설치 창을 띄운다. 브라우저 자체 설치 안내를 막지 않으려고 `preventDefault`는 부르지 않는다. 이벤트가 없는 브라우저(아이폰 Safari, 삼성 인터넷 등)나 설치 창을 한 번 닫은 뒤에는 기기별 단계 안내 시트(아이폰·아이패드 Safari, 안드로이드 Chrome, 컴퓨터 Chrome·Edge, 이 기기를 맨 위에)를 연다.
- 이미 앱으로 열렸으면(`display-mode: standalone`·`fullscreen`·`minimal-ui` 또는 `navigator.standalone`) 단추를 숨기고, 파일(`file:`)로 열었을 때도 숨긴다. 설치가 끝나면(`appinstalled`) 단추를 숨기고 토스트 「홈 화면에 퍼즐 놀이터를 담았어요.」.

키보드: 화살표 칸 옮기기, 숫자 넣기, 스페이스·M 메모 켜고 끄기, 백스페이스 지우기, Z 되돌리기, H 힌트. 고양이 자리는 스페이스로 × → 고양이 → 빈칸, X는 ×, C는 고양이.

## 구조

```
src/rng.mjs            씨앗 난수, 조합, 한국어 조사
src/sudoku.mjs         스도쿠: 판 모양, 규칙, 해 세기(2개에서 멈춤), 기법 11개 풀이기, 난이도, 생성기, 같은 판 찾기
src/cats.mjs           고양이 자리: 규칙, 해 세기, 기법 5개 풀이기, 구역 키우기 생성기
src/find-step.mjs      풀이 길에서 어떤 기법을 쓸 수 있는 상태 찾기(차시 걸음)
src/hint.mjs           힌트 3단계 자료(틀린 수·메모 먼저 짚기)
src/daily.mjs          오늘의 퍼즐, 자유 연습 생성(고양이 자리 기기 생성은 8×8까지)
src/lesson-engine.mjs  차시 자료 → 화면용 문제(정답은 엔진이 계산)
src/lessons/           sudoku.mjs(18차시·미션 5), cats.mjs(14차시·미션 5), index.mjs(길·열림)
src/packs/             recipes.mjs(묶음 조건), packs.mjs(만든 묶음 171문제, 손으로 고치지 않음)
src/store.mjs          프로필·진행도·기록(localStorage puzzle-guide:v1, rev 2: 오늘의 퍼즐은 날짜 × 난이도 × 퍼즐, 진행 중 저장은 퍼즐마다 한 칸)
src/settings.mjs       설정, 새로 생긴 것
src/glossary.mjs       용어 사전, 퍼즐 이야기
src/ui/                boards.js(판 SVG), game.js(풀기 상태), icons.js, app.js(화면)
src/tokens.css         디자인 토큰, style.css(화면)
tests/                 node --test
screenshots/           manifest 설치 창 미리보기(390×844, 1280×800)
tools/                 make-packs, make-font, serve, feasibility(0단계 검증)
```

빌드 주의: `src/`의 import 줄은 빌드 때 지워지고 한 스크립트로 합쳐진다. `import { a as b }` 같은 별칭은 쓰지 않는다(빌드가 막음). 파일끼리 맨 바깥 이름이 겹치면 빌드가 멈춘다.

## 문서

- 기획서 [docs/기획서.md](docs/기획서.md), 결정사항 [docs/결정사항.md](docs/결정사항.md), 조사 [docs/조사.md](docs/조사.md)
- 화면 디자인 [docs/디자인.md](docs/디자인.md), 자가 점검 [docs/자가점검.md](docs/자가점검.md)

## 이름과 라이선스

- 「고양이 자리」의 고양이 그림, 문제, 문구는 직접 만들었다. 다른 퍼즐 게임의 이름·그림·문구는 쓰지 않는다. 장르 이름 「스타 배틀」은 앱 안 퍼즐 이야기 화면에서만 밝힌다.
- 코드: MIT(LICENSE). 글꼴: Pretendard를 잘라 이름을 바꾼 수정본 「PG Sans」, SIL Open Font License 1.1(THIRD-PARTY-LICENSES.md, 앱 더보기 화면).
- 공개: GitHub Pages(noindex). 이 개발 레포는 비공개로 두고, 이력 없는 새 공개 레포에 한 커밋으로 발행한다. 비공개 오락실 대시보드에 링크 카드로 올린다. 공개 전에 상표(스도쿠 KIPRIS) 확인과 준법 검토를 거친다.
