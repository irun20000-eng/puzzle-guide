// 퍼즐 놀이터 화면. 한 파일 안에서 해시 주소(#/...)로 화면을 바꾼다.
// 화면 디자인: 「먹과 종이」 시안(tokens-puzzle.css, mockup-puzzle.html)을 따른다.

// ── 저장소와 설정 ──
let uiStorage;
try { uiStorage = window.localStorage; uiStorage.getItem('puzzle-guide:probe'); } catch (err) { uiStorage = memoryStorage(); }
const APP = {
  store: createStore(uiStorage),
  settings: loadSettings(uiStorage),
  route: { name: 'home', arg: '' },
  play: null, lesson: null, sheet: null, dialog: null, toast: null,
  boardScale: {}, keepCellFocus: false,
  dailyCache: {}, practice: { kind: 'sd', n: 9, level: 'easy' }, month: null, genMs: [],
};
const appRoot = document.getElementById('app');
const uiEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 구역 이름: (구역 번호, 판의 구역 배열) → 「하늘색 점무늬 구역」
const regionNamer = () => (g, region) => zoneNamer(Math.round(Math.sqrt(region.length)), region, APP.settings.pattern)(g);
const gameNamer = (g) => zoneNamer(g.n, g.region, APP.settings.pattern);
const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
function applyTheme() {
  const t = resolveTheme(APP.settings.theme, prefersDark());
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  // 주소 표시줄 색은 바탕 토큰(--canvas)을 그대로 읽어 쓴다(화면 코드에 색 값을 적지 않음)
  if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim());
}
function setSetting(k, v) { APP.settings = saveSettings(uiStorage, { ...APP.settings, [k]: v }); if (k === 'theme') applyTheme(); }

// 주소(http, https)로 열었을 때만 서비스 워커를 올린다. 파일로 열면 원래부터 인터넷이 필요 없다.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

// ── 앱으로 설치 ──
// Chrome 등은 설치할 수 있을 때 beforeinstallprompt 를 보낸다. 받아 두었다가 「홈 화면에 앱으로 설치」를 누르면 설치 창을 띄운다.
// 이벤트가 오지 않는 브라우저(아이폰 Safari 등)에는 단계 안내 시트를 보여 준다. 이미 앱으로 열렸으면 단추를 숨긴다.
// preventDefault 는 부르지 않는다(브라우저가 스스로 띄우는 설치 안내도 그대로 둔다).
const INSTALL = { evt: null, done: false };
function isStandalone() {
  const mm = (q) => Boolean(window.matchMedia && window.matchMedia(q).matches);
  return mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)') || window.navigator.standalone === true;
}
function canOfferInstall() { return /^https?:$/.test(location.protocol) && !INSTALL.done && !isStandalone(); }
function installPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'pc';
}
const rerenderInstall = () => { if (APP.route.name === 'home' || APP.route.name === 'more') render(); };
window.addEventListener('beforeinstallprompt', (e) => { INSTALL.evt = e; rerenderInstall(); });
window.addEventListener('appinstalled', () => {
  INSTALL.evt = null; INSTALL.done = true;
  if (APP.sheet && APP.sheet.label === '앱으로 설치') { APP.sheet = null; closeOverlay(); }
  toast('홈 화면에 퍼즐 놀이터를 담았어요.');
});
async function doInstall() {
  const e = INSTALL.evt;
  if (e) {
    INSTALL.evt = null; // 한 이벤트로는 설치 창을 한 번만 띄울 수 있다
    try {
      await e.prompt();
      const choice = await e.userChoice;
      if (choice && choice.outcome === 'accepted') INSTALL.done = true;
      rerenderInstall();
      return;
    } catch (err) { /* 아래 안내 시트로 */ }
  }
  openOverlay(); APP.sheet = installSheet(); render();
}
function installSheet() {
  return {
    label: '앱으로 설치',
    html: () => {
      const blocks = {
        ios: ['아이폰·아이패드 (Safari)', ['주소창 옆 공유 단추(네모에서 화살표가 나오는 모양)를 눌러요. 안 보이면 ··· 단추를 먼저 눌러요.', '「홈 화면에 추가」를 골라요. 안 보이면 목록을 아래로 내려요.', '「추가」를 누르면 홈 화면에 퍼즐 놀이터가 생겨요.']],
        android: ['안드로이드 (Chrome)', ['오른쪽 위 ⋮ 단추를 눌러요.', '「앱 설치」를 눌러요. 없으면 「홈 화면에 추가」를 눌러요.', '「설치」를 누르면 홈 화면에 퍼즐 놀이터가 생겨요.']],
        pc: ['컴퓨터 (Chrome·Edge)', ['주소창 오른쪽 끝의 설치 아이콘을 눌러요. 없으면 ⋮ 또는 ··· 메뉴에서 설치 항목을 찾아요.', '「설치」를 누르면 창 하나로 열리는 앱이 돼요.']],
      };
      const mine = installPlatform();
      const order = [mine, ...['ios', 'android', 'pc'].filter((k) => k !== mine)];
      const block = (k) => `<section class="inst-block"><div class="row-between"><span class="t-body-b">${blocks[k][0]}</span>${k === mine ? chip('이 기기', 'acc') : ''}</div><ol class="inst-steps">${blocks[k][1].map((s) => `<li class="t-small c-ink2">${uiEsc(s)}</li>`).join('')}</ol></section>`;
      return `<div class="t-head">홈 화면에 앱으로 설치</div><p class="t-small c-sub">설치하면 주소창 없이 앱처럼 열리고, 인터넷이 없어도 열려요.</p><div class="inst-list">${order.map(block).join('')}</div><p class="t-small c-sub">카카오톡 같은 앱 안에서 열었다면 먼저 Safari나 Chrome으로 열어 주세요. 삼성 인터넷 등 다른 브라우저는 메뉴에서 「홈 화면에 추가」 항목을 찾아요.</p><button class="btn secondary block" data-act="closesheet">닫기</button>`;
    },
  };
}
function installCard() {
  if (!canOfferInstall()) return '';
  return `<div class="card tight install rise"><div class="t-body-b">앱처럼 쓰기</div><p class="t-small c-ink2">홈 화면에 담으면 주소창 없이 열리고, 인터넷이 없어도 열려요.</p><button class="btn secondary block" data-act="install">${icon('download')}홈 화면에 앱으로 설치</button></div>`;
}

// ── 주소 ──
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  return { name: parts[0] || 'home', arg: decodeURIComponent(parts[1] || '') };
}
const TAB_OF = { home: 'home', path: 'home', practice: 'practice', records: 'records', more: 'more', settings: 'more', glossary: 'more', story: 'more', news: 'more' };

function route() {
  APP.route = parseHash();
  APP.sheet = null;
  const r = APP.route;
  if (!APP.store.current() && r.name !== 'welcome') { APP.route = { name: 'welcome', arg: '' }; }
  if (r.name === 'lesson' || r.name === 'mission') startLesson(r.arg);
  else if (r.name === 'daily') startDaily(r.arg);
  else if (r.name === 'free') { if (!APP.play || APP.play.ctx !== 'free') { APP.route = { name: 'practice', arg: '' }; } }
  else { stopPlay(); }
  render();
  window.scrollTo(0, 0);
}

function stopPlay() { APP.play = null; APP.lesson = null; }

// ── 공통 조각 ──
const avatarOf = (p) => `<span class="avatar c${p ? p.color % 5 : 0}">${uiEsc(p ? [...p.name][0] : '?')}</span>`;
function navHtml() {
  const tab = TAB_OF[APP.route.name] || 'home';
  const item = (id, ic, label, hash) => `<button data-act="nav" data-arg="${hash}"${tab === id ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`;
  return `<nav class="nav" aria-label="주 메뉴">${item('home', 'home', '놀이터', '#/')}${item('practice', 'sparkle', '자유 연습', '#/practice')}${item('records', 'cal', '기록', '#/records')}${item('more', 'more', '더보기', '#/more')}</nav>`;
}
function appBar(title, { back = null, right = '' } = {}) {
  if (back) return `<header class="appbar with-back"><button class="iconbtn" data-act="nav" data-arg="${back}" aria-label="뒤로">${icon('back')}</button><h1 class="ttl">${uiEsc(title)}</h1>${right}</header>`;
  return `<header class="appbar"><span class="mark" aria-hidden="true">${pieceSvg('cat', 'normal', 26)}</span><h1 class="ttl">${uiEsc(title)}</h1>${right}</header>`;
}
const profileBtn = () => `<button class="iconbtn" data-act="profiles" aria-label="프로필 바꾸기">${avatarOf(APP.store.current())}</button>`;
function chip(text, cls = '') { return `<span class="chip ${cls}">${text}</span>`; }
function sw(k, label, sub = '') {
  return `<button class="li swrow" role="switch" aria-checked="${APP.settings[k]}" data-act="toggle" data-arg="${k}"><span class="grow"><span class="t-body">${label}</span>${sub ? `<br><span class="t-small c-sub">${sub}</span>` : ''}</span><span class="switch" aria-hidden="true"></span></button>`;
}
const LEVEL_LABEL = { easy: '쉬움', normal: '보통', hard: '어려움' };
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
function dateLabel(d) { return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY_NAMES[d.getDay()]}요일`; }

// ── 그리기 ──
function render() {
  const r = APP.route;
  let body;
  switch (r.name) {
    case 'welcome': body = screenWelcome(); break;
    case 'path': body = screenPath(r.arg); break;
    case 'lesson': case 'mission': body = APP.lesson ? screenLesson() : screenMissing(); break;
    case 'daily': case 'free': body = APP.play ? screenPlay() : screenMissing(); break;
    case 'practice': body = screenPractice(); break;
    case 'records': body = screenRecords(); break;
    case 'more': body = screenMore(); break;
    case 'settings': body = screenSettings(); break;
    case 'glossary': body = screenGlossary(); break;
    case 'story': body = screenStory(); break;
    case 'news': body = screenNews(); break;
    default: body = screenHome();
  }
  const tabbed = Boolean(TAB_OF[r.name]);
  appRoot.className = 'app' + (tabbed ? ' tabbed' : ' focus');
  const railOnly = !tabbed && APP.play && (r.name === 'daily' || r.name === 'free');
  appRoot.innerHTML = ICON_SPRITE + (tabbed ? `<div class="shell"><main class="main">${body}</main>${navHtml()}</div>` : railOnly ? `<div class="shell rail-only"><main class="main solo">${body}</main>${navHtml()}</div>` : `<main class="main solo">${body}</main>`) + overlayHtml();
  afterRender();
}
function afterRender() {
  const input = appRoot.querySelector('[data-autofocus]');
  if (input) input.focus();
  const overlayFocused = focusAfterRender();
  const P = APP.play;
  if (P && P.g) {
    P.g.popCell = null;
    const svg = appRoot.querySelector('[data-board] svg.board-svg');
    if (svg) {
      const w = svg.getBoundingClientRect().width;
      const k = w ? (P.g.n * 48) / w : 1;
      const prev = APP.boardScale[P.g.n];
      APP.boardScale[P.g.n] = k;
      if ((!prev || Math.abs(prev - k) > 0.05) && !APP.rescaled) { APP.rescaled = true; render(); APP.rescaled = false; return; }
    }
    if (APP.keepCellFocus && !overlayFocused) { const b = appRoot.querySelector('.cellbtn[data-roving]'); if (b) b.focus({ preventScroll: true }); }
  }
}
function screenMissing() {
  return `${appBar('찾을 수 없어요', { back: '#/' })}<div class="pad"><div class="state"><div class="ic">${icon('info')}</div><div class="t-sub">이 화면을 찾을 수 없어요</div><button class="btn secondary" data-act="nav" data-arg="#/">놀이터로</button></div></div>`;
}

// ── 처음 시작 ──
function screenWelcome() {
  return `<div class="welcome rise">
    <span class="mark lg" aria-hidden="true">${pieceSvg('cat', 'happy', 64)}</span>
    <div><div class="eyebrow">스도쿠 · 고양이 자리</div><h1 class="t-display">퍼즐 놀이터</h1></div>
    <p class="t-body c-ink2">짧은 설명을 읽고 직접 풀어 보며, 추측 없이 끝까지 푸는 방법을 배워요.</p>
    <form class="card welcome-form" data-form="welcome">
      <label class="t-label" for="pname">이름(비워 두면 「나」로 시작해요, 8글자까지)</label>
      <input id="pname" class="field" name="name" maxlength="8" autocomplete="off" placeholder="예: 은우" aria-describedby="pname-msg"><p id="pname-msg" class="field-msg" role="status">${uiEsc(APP.formError || '')}</p>
      <button class="btn primary block" type="submit">시작하기</button>
    </form>
    <p class="t-small c-sub">기록은 이 기기 안에만 저장돼요.</p>
  </div>`;
}

// ── 홈 ──
function todayDaily() {
  const date = todayKey();
  const level = APP.store.level();
  const key = date + ':' + level;
  if (!APP.dailyCache[key]) {
    const t0 = performance.now();
    APP.dailyCache[key] = dailyPuzzles(date, level);
    APP.genMs.push({ what: 'daily-' + level, ms: performance.now() - t0 });
  }
  return APP.dailyCache[key];
}
function screenHome() {
  const st = APP.store;
  const now = new Date();
  const date = todayKey(now);
  const level = st.level();
  // 기록은 날짜 × 난이도 × 퍼즐. 카드는 지금 고른 난이도, 아래 줄은 세 난이도를 한눈에
  const dayAll = st.dailyOf(date) || {};
  const rec = dayAll[level] || {};
  const flags = dayFlags(dayAll);
  const size = DAILY_SIZES[level];
  const isDone = (id) => st.isDone(id);
  const pathTile = (p) => {
    const prog = pathProgress(p.id, isDone);
    const dots = p.lessons.map((l, i) => {
      const cls = isDone(l.id) ? 'd' : (i === prog.done ? 'n' : '');
      return `<i class="${cls}"></i>`;
    }).join('');
    const ic = p.id === 'sd' ? icon('grid') : pieceSvg(APP.settings.piece, 'normal', 28);
    return `<button class="tile rise" data-act="nav" data-arg="#/path/${p.id}"><span class="ic">${ic}</span><span class="t-body-b">${p.title}</span><span class="pathdots" aria-hidden="true">${dots}</span><span class="t-small c-sub num">${prog.done} / ${prog.total} 차시</span></button>`;
  };
  const half = (which, label, n) => {
    const key = which === 'sd' ? 'sudoku' : 'cats';
    const sec = rec[key];
    const done = sec !== undefined;
    const help = done && rec[key + 'Help'];
    return `<button class="half${done ? ' done' : ''}" data-act="nav" data-arg="#/daily/${which}"><span class="mini" aria-hidden="true">${miniBoard(which, done)}</span><span class="t-body-b">${label} ${n}×${n}</span><span class="t-small ${done ? 'c-acc' : 'c-sub'} num">${done ? (help ? '힌트와 함께 다 했어요 · 다시 풀기' : fmtTime(sec) + '에 혼자 풀었어요 · 다시 풀기') : '아직 안 풀었어요 · 풀기'}</span></button>`;
  };
  const last = st.lastLesson();
  const contPath = last && last.startsWith('C') ? 'ct' : 'sd';
  const next = nextLesson(contPath, isDone) || nextLesson(contPath === 'sd' ? 'ct' : 'sd', isDone);
  const nextInfo = next ? findLesson(next.id) : null;
  const progress = ['sd', 'ct'].map((w) => st.progressOf(`daily-${w}-${date}-${level}`)).filter(Boolean).sort((a, b) => b.at - a.at)[0] || null;
  let cont = '';
  const progWhich = progress && /^daily-/.test(progress.key) && progress.key.includes(date) ? (progress.key.startsWith('daily-sd') ? 'sudoku' : 'cats') : null;
  if (progWhich && rec[progWhich] === undefined) {
    cont = contTile('이어서 하기', progress.key.startsWith('daily-sd') ? '오늘의 스도쿠' : '오늘의 고양이 자리', fmtTime(progress.state.t || 0) + ' 진행', '#/daily/' + (progress.key.startsWith('daily-sd') ? 'sd' : 'ct'));
  } else if (!st.totalStars() && !flags.sudoku && !flags.cats) {
    cont = `<div class="tile span2 rise"><div class="cont-row"><div class="grow"><div class="t-label c-acc">처음이에요</div><div class="t-sub">스도쿠 1차시부터 해 볼까요</div><div class="t-small c-sub">규칙을 익히고 오늘의 퍼즐로 가요</div></div><button class="btn primary" data-act="nav" data-arg="#/lesson/S01">시작하기</button></div></div>`;
  } else if (next) {
    const idx = nextInfo.index + 1;
    cont = contTile(st.totalStars() ? '이어서 하기' : '처음 시작', `${nextInfo.path.id === 'sd' ? '스도쿠' : '고양이 자리'} ${idx}차시 · ${next.title}`, `${next.size}×${next.size}`, '#/lesson/' + next.id);
  }
  const name = st.current() ? st.current().name : '';
  const doneBoth = rec.sudoku !== undefined && rec.cats !== undefined;
  return `${appBar('퍼즐 놀이터', { right: profileBtn() })}
  <div class="scroll">
    <div class="hello"><div class="eyebrow num">${dateLabel(now)}</div><div class="t-title">${doneBoth ? `${uiEsc(name)}님, 오늘 퍼즐을 다 풀었어요` : '오늘의 퍼즐이 도착했어요'}</div></div>
    <div class="bento">
      <div class="tile span2 rise">
        <div class="row-between"><span class="t-sub">오늘의 퍼즐</span><button class="chip btnchip" data-act="level" aria-label="오늘의 퍼즐 난이도 바꾸기">${LEVEL_LABEL[level]}${icon('chev', 's16')}</button></div>
        <div class="today">${half('sd', '스도쿠', size.sd)}${half('ct', '고양이 자리', size.ct)}</div>
        ${levelSummary(dayAll, level)}
      </div>
      ${cont}
      ${PATHS.map(pathTile).join('')}
    </div>
    <div class="sec-h"><span class="t-sub">더 놀기</span></div>
    <div class="list">
      <button class="li" data-act="nav" data-arg="#/practice">${icon('sparkle', 'c-ink2')}<span class="grow t-body">자유 연습</span><span class="val">크기·난이도 고르기</span>${icon('chev', 's20 c-sub')}</button>
      <button class="li" data-act="nav" data-arg="#/glossary">${icon('book', 'c-ink2')}<span class="grow t-body">용어 사전</span>${icon('chev', 's20 c-sub')}</button>
      <button class="li" data-act="nav" data-arg="#/story">${icon('info', 'c-ink2')}<span class="grow t-body">퍼즐 이야기</span>${icon('chev', 's20 c-sub')}</button>
    </div>
    ${installCard()}
    ${APP.store.canSave() ? '' : `<div class="banner" role="status">${icon('cloudoff')}<span>이 기기에서는 기록을 저장할 수 없어요. 창을 닫으면 기록이 사라져요.</span></div>`}
  </div>`;
}
// 오늘 난이도별 기록 한 줄: 「쉬움 ✓ · 보통 1/2 · 어려움」(✓ 두 퍼즐 모두, 1/2 하나)
function levelSummary(dayAll, cur) {
  const said = [];
  const items = LEVELS.map((lv) => {
    const e = dayAll[lv] || {};
    const n = (e.sudoku !== undefined ? 1 : 0) + (e.cats !== undefined ? 1 : 0);
    said.push(`${LEVEL_LABEL[lv]} ${n === 2 ? '두 퍼즐 모두 풂' : n === 1 ? (e.sudoku !== undefined ? '스도쿠 풂' : '고양이 자리 풂') : '아직'}`);
    return `<span class="lv${lv === cur ? ' cur' : ''}${n ? ' on' : ''}">${LEVEL_LABEL[lv]}${n === 2 ? icon('check', 's16') : n === 1 ? '<small class="num">1/2</small>' : ''}</span>`;
  });
  return `<div class="lvsum t-small" role="note" aria-label="오늘 난이도별 기록: ${said.join(', ')}"><span class="c-sub" aria-hidden="true">오늘 푼 것</span><span class="lvs" aria-hidden="true">${items.join('<i>·</i>')}</span></div>`;
}
function contTile(label, title, sub, hash) {
  return `<div class="tile span2 rise"><div class="cont-row"><div class="grow"><div class="t-label c-acc">${label}</div><div class="t-sub">${uiEsc(title)}</div><div class="t-small c-sub">${uiEsc(sub)}</div></div><button class="btn primary" data-act="nav" data-arg="${hash}">이어서</button></div></div>`;
}
function miniBoard(which, done = false) {
  const d = todayDaily();
  if (which === 'sd') return renderSudokuBoard({ n: d.sudoku.n, puzzle: d.sudoku.puzzle, values: done ? d.sudoku.solution : d.sudoku.puzzle, label: '오늘의 스도쿠 미리보기' });
  return renderCatsBoard({ n: d.cats.n, region: d.cats.region, cats: done ? d.cats.solution : [], faces: done ? Object.fromEntries(d.cats.solution.map((c) => [c, 'happy'])) : {}, piece: APP.settings.piece, pattern: APP.settings.pattern, label: '오늘의 고양이 자리 미리보기' });
}

// ── 길(차시 목록) ──
function screenPath(id) {
  const p = PATHS.find((x) => x.id === id) || PATHS[0];
  const st = APP.store;
  const isDone = (lid) => st.isDone(lid);
  const open = (lid) => isOpen(lid, isDone, APP.settings.openAll);
  const firstOpen = p.lessons.find((l) => !isDone(l.id) && open(l.id));
  let html = '';
  for (const u of p.units) {
    const lessons = p.lessons.filter((l) => l.unit === u.unit);
    const mission = p.missions.find((m) => m.unit === u.unit);
    html += `<section class="unit rise"><div class="unit-h"><span class="eyebrow">${u.unit}단원 · ${u.size}×${u.size}</span><h2 class="t-head">${uiEsc(u.title)}</h2></div><ol class="steps-list">`;
    for (const l of lessons) {
      const i = p.lessons.indexOf(l) + 1;
      const done = isDone(l.id), ok = open(l.id), now = firstOpen && firstOpen.id === l.id;
      const stars = st.starsOf(l.id);
      const right = done ? `<span class="stars" aria-label="별 ${stars}개">${[1, 2, 3].map((k) => `<svg class="i s16 ${k <= stars ? 'on' : ''}" aria-hidden="true"><use href="#i-star"/></svg>`).join('')}</span>` : ok ? icon('chev', 's20 c-sub') : icon('lock', 's20 c-sub');
      html += `<li><button class="stepbtn${done ? ' done' : ''}${now ? ' now' : ''}" ${ok ? `data-act="nav" data-arg="#/lesson/${l.id}"` : 'disabled aria-disabled="true"'}><span class="num-dot num">${done ? icon('check', 's16') : i}</span><span class="grow"><span class="t-body-b">${uiEsc(l.title)}</span><span class="t-small c-sub">${i}차시 · ${l.size}×${l.size}</span></span>${right}</button></li>`;
    }
    if (mission) {
      const ok = open(mission.id), done = st.missionDone(mission.id);
      html += `<li><button class="stepbtn mission${done ? ' done' : ''}" ${ok ? `data-act="nav" data-arg="#/mission/${mission.id}"` : 'disabled aria-disabled="true"'}><span class="num-dot">${icon('flag', 's16')}</span><span class="grow"><span class="t-body-b">단원 미션 · ${uiEsc(mission.title)}</span><span class="t-small c-sub">${done ? '배지를 받았어요' : ok ? '이 단원을 마무리해요' : '이 단원 차시를 다 마치면 열려요'}</span></span>${done ? chip('배지', 'acc') : ok ? icon('chev', 's20 c-sub') : icon('lock', 's20 c-sub')}</button></li>`;
    }
    html += '</ol></section>';
  }
  const prog = pathProgress(p.id, isDone);
  return `${appBar(p.title, { back: '#/' })}<div class="scroll"><div class="hello"><div class="eyebrow num">${prog.done} / ${prog.total} 차시 · 별 ${p.lessons.reduce((a, l) => a + st.starsOf(l.id), 0)}개</div><div class="seg" aria-hidden="true">${p.lessons.map((l) => `<i class="${isDone(l.id) ? 'done' : ''}"></i>`).join('')}</div></div>${html}</div>`;
}

// ── 차시 진행 ──
function startLesson(id) {
  if (APP.lesson && APP.lesson.id === id) return;
  const f = findLesson(id);
  if (!f) { APP.lesson = null; return; }
  const isDone = (lid) => APP.store.isDone(lid);
  if (!isOpen(id, isDone, APP.settings.openAll)) { APP.lesson = null; return; }
  const def = f.lesson || f.mission;
  const names = regionNamer();
  const steps = [];
  if (f.lesson) for (const c of def.cards) steps.push(expandItem({ t: 'card', ...c }, names));
  for (const it of def.items) steps.push(expandItem(it, names));
  APP.lesson = { id, def, path: f.path, isMission: Boolean(f.mission), steps, i: 0, mistakes: 0, hints: 0, finished: false };
  APP.play = null;
  setupStep();
}
function setupStep() {
  const L = APP.lesson;
  const x = L.steps[L.i];
  APP.play = null;
  if (!x || x.t === 'card' || x.t === 'quiz') return;
  const src = x.kind === 'sd' ? { kind: 'sd', n: x.n, puzzle: x.puzzle, solution: x.solution || sdSolution(x.puzzle) || x.puzzle, values: x.values, notes: x.notes } : { kind: 'ct', n: x.n, region: x.region, solution: x.solution || [], cats: x.cats, marks: x.marks };
  const g = newGame(src, { mode: 'lesson' });
  if (x.kind === 'sd' && (x.t === 'step' || x.t === 'memo' || x.t === 'count')) g.sel = x.spot && x.spot.length ? x.spot[0] : (x.answer && x.answer.place ? -1 : g.sel);
  if (x.kind === 'sd' && x.t === 'step' && x.answer.place) g.sel = x.spot && x.spot.length ? x.spot[0] : -1;
  if (x.t === 'memo') { g.memo = true; g.sel = x.answer.x; }
  if (x.t === 'tap' || (x.t === 'step' && x.answer.cells)) g.sel = -1;
  if (x.t === 'guided') g.guidedLeft = x.guided;
  APP.play = { ctx: 'lesson', g, x, hint: null, feedback: null, pick: [], answered: null };
}
function lessonNext() {
  const L = APP.lesson;
  if (L.i < L.steps.length - 1) { L.i++; setupStep(); render(); return; }
  finishLesson();
}
function finishLesson() {
  const L = APP.lesson;
  L.finished = true;
  const stars = starsFor(L.mistakes, L.hints);
  L.stars = stars;
  if (L.isMission) APP.store.completeMission(L.id); else APP.store.completeLesson(L.id, stars);
  APP.play = null;
  render();
}
function lessonMistake(title, text) {
  const P = APP.play;
  APP.lesson.mistakes++;
  P.feedback = { ok: false, title, text };
}
function lessonCorrect(text) {
  const P = APP.play;
  P.feedback = { ok: true, title: '맞았어요', text: text || '' };
  P.answered = true;
  if (P.g) P.g.done = true;
}

function screenLesson() {
  const L = APP.lesson;
  if (L.finished) return screenLessonDone();
  const x = L.steps[L.i];
  const total = L.steps.length;
  const seg = L.steps.map((_, k) => `<i class="${k < L.i ? 'done' : k === L.i ? 'now' : ''}"></i>`).join('');
  const f = findLesson(L.id);
  const title = L.isMission ? `단원 미션 · ${L.def.title}` : `${f.index + 1}차시 · ${L.def.title}`;
  const top = `<div class="qbar"><button class="iconbtn" data-act="quit" aria-label="그만두기">${icon('close')}</button><div class="seg" aria-label="${total}걸음 중 ${L.i + 1}번째">${seg}</div><span class="t-label c-sub num">${L.i + 1} / ${total}</span></div>`;
  if (x.t === 'card') return top + screenCard(x, title);
  if (x.t === 'quiz') return top + screenQuiz(x, title);
  return top + screenGameBody(title, x);
}
function screenCard(x, eyebrow) {
  let demo = x.demo ? `<div class="boardwrap"><div class="boardframe">${demoBoard(x.demo)}</div></div><p class="t-small c-sub demo-cap">${uiEsc(x.demo.techName || '')} · ${uiEsc(x.demo.explain)}</p>` : '';
  if (!demo && x.board) demo = `<div class="boardwrap"><div class="boardframe">${staticBoard(x.board, x.show)}</div></div>`;
  return `<div class="lesson-body card-step rise"><div class="prompt"><div class="eyebrow">${uiEsc(eyebrow)}</div><h2 class="t-title">${uiEsc(x.title)}</h2>${x.text.map((t) => `<p class="t-body c-ink2">${uiEsc(t)}</p>`).join('')}</div>${demo}</div>
  <div class="foot"><button class="btn primary block" data-act="next">${APP.lesson.i === 0 ? '시작하기' : '다음'}</button></div>`;
}
// 설명 카드의 그림 판(글자 판). show: 'box0' 상자 강조, 'blocked' 고양이 하나가 막는 칸 미리 보기
function staticBoard(board, show) {
  const P = loadPuzzle(board);
  if (P.kind === 'sd') {
    const sh = sdShape(P.n);
    const focus = show && show.startsWith('box') ? [sh.boxes[Number(show.slice(3))]] : show && show.startsWith('row') ? [sh.rows[Number(show.slice(3))]] : [];
    return renderSudokuBoard({ n: P.n, puzzle: P.puzzle, values: P.puzzle, focus, label: '설명 그림 판' });
  }
  const preview = show === 'blocked' ? ctBlockedBy(P.n, P.region, P.cats[0]) : [];
  return renderCatsBoard({ n: P.n, region: P.region, cats: P.cats, preview, pattern: APP.settings.pattern, piece: APP.settings.piece, faces: Object.fromEntries(P.cats.map((c) => [c, 'happy'])), label: '설명 그림 판' });
}
function demoBoard(d) {
  if (d.kind === 'sd') {
    const s = d.step;
    return renderSudokuBoard({ n: d.n, puzzle: d.puzzle, values: d.values, notes: d.notes, focus: d.focus, spot: d.spot, placePreview: s.place ? s.place[0] : null, elimPreview: s.elim || [], label: '보여 주기 판' });
  }
  const s = d.step;
  return renderCatsBoard({ n: d.n, region: d.region, cats: d.cats, marks: d.marks, focus: d.focus, preview: s.elim || [], previewCat: s.place ? s.place[0] : null, pattern: APP.settings.pattern, piece: APP.settings.piece, label: '보여 주기 판' });
}
function screenQuiz(x, eyebrow) {
  const P = APP.play || (APP.play = { ctx: 'lesson', g: null, x, hint: null, feedback: null, pick: [], answered: null, chosen: null });
  const opts = x.options.map((o, k) => `<button class="option${P.chosen === k ? (k === x.answer.choice ? ' ok' : ' bad') : ''}" data-act="choose" data-arg="${k}" ${P.answered ? 'disabled' : ''}>${uiEsc(o)}</button>`).join('');
  return `<div class="lesson-body rise"><div class="prompt"><div class="eyebrow">${uiEsc(eyebrow)}</div><h2 class="t-head">${uiEsc(x.prompt)}</h2></div><div class="options">${opts}</div></div>${footFeedback(P)}`;
}

// 문제 화면(판이 있는 걸음과 한 판 풀기)
function screenGameBody(eyebrow, x) {
  const P = APP.play;
  const g = P.g;
  const prompt = x ? x.prompt : '';
  const hintCard = P.hint ? hintCardHtml(P) : '';
  const coach = P.g.guidedLeft > 0 && !P.hint ? coachHtml(P) : '';
  const isPick = x && (x.t === 'tap' || (x.t === 'step' && x.answer.cells));
  const tip = g.kind === 'ct' && !isPick ? '<div class="tip">한 번 누르면 ×, 두 번 누르면 고양이</div>' : isPick ? `<div class="tip">${x.answer.mode === 'all' ? '알맞은 칸을 모두 누른 뒤 확인을 눌러요' : '알맞은 칸을 하나 눌러요'}</div>` : '';
  const options = x && x.t === 'count' ? `<div class="options row">${x.options.map((o, k) => `<button class="option${P.chosen === k ? (k === x.answer.choice ? ' ok' : ' bad') : ''}" data-act="choose" data-arg="${k}" ${P.answered ? 'disabled' : ''}>${o}개</button>`).join('')}</div>` : '';
  const promptHtml = P.ctx === 'lesson' ? `<div class="prompt"><div class="eyebrow">${uiEsc(eyebrow)}</div><h2 class="t-head">${uiEsc(prompt)}</h2></div>` : `<div class="prompt"><p class="t-body">${uiEsc(prompt)}</p></div>`;
  return `<div class="play${g.kind === 'sd' ? ' sd' : ' ct'} n${g.n}${P.hint ? ' hinting' : ''}${P.feedback ? ' feedbacking' : ''}">
    <div class="play-board">
      ${promptHtml}
      <div class="boardwrap"><div class="boardframe" data-board>${boardHtml(P)}</div></div>
      ${conflictLine(P) || tip}
    </div>
    <div class="play-side">
      ${P.ctx !== 'lesson' ? `<div class="card tight side-card"><div class="eyebrow">${uiEsc(P.ctx === 'daily' ? '오늘의 퍼즐' : '자유 연습')}</div><div class="t-head">${uiEsc(g.kind === 'sd' ? '스도쿠' : '고양이 자리')} ${g.n}×${g.n}</div><div class="t-small c-sub num">${g.kind === 'sd' ? `남은 칸 ${g.values.filter((v) => !v).length}` : `남은 ${APP.settings.piece === 'star' ? '별' : '고양이'} ${g.n - g.cats.length}`}</div></div>` : ''}
      ${hintCard}${coach}
      ${options}
      ${x && x.t !== 'count' ? controlsHtml(P) : ''}
      ${footFeedback(P)}
    </div>
  </div>`;
}

// 규칙 어김: 면 + 아이콘 + 문장(DESIGN.md 7-1 상태 4)
function conflictLine(P) {
  const g = P.g, x = P.x;
  if (x && x.t === 'tap') return '';
  let text = '';
  if (g.kind === 'sd') {
    const c = sdConflicts(g.values);
    if (!c.length) return '';
    const sh = sdShape(g.n);
    for (const u of sh.units) { const seen = {}; for (const k of u.cells) if (g.values[k]) { if (seen[g.values[k]]) { text = `같은 ${u.kind === 'row' ? '가로줄' : u.kind === 'col' ? '세로줄' : '상자'}에 ${josa(String(g.values[k]), '이가')} 두 개예요.`; break; } seen[g.values[k]] = 1; } if (text) break; }
  } else {
    const r = ctConflicts(g.n, g.region, g.cats).reasons[0];
    if (!r) return '';
    const who = APP.settings.piece === 'star' ? '별' : '고양이';
    text = { row: `같은 가로줄에 ${who}가 둘이에요.`, col: `같은 세로줄에 ${who}가 둘이에요.`, region: `같은 구역에 ${who}가 둘이에요.`, touch: `${who}끼리 닿았어요.` }[r.why];
  }
  return `<div class="ruleline" role="status" aria-live="polite"><span class="ic">${icon('alert', 's20')}</span><span class="t-small"><b>규칙 어김</b> ${uiEsc(text)}</span></div>`;
}
function boardHtml(P) {
  const g = P.g, x = P.x;
  const h = P.hint;
  const hd = h ? h.data : null;
  const lvl = h ? h.level : 0;
  const focus = [];
  let spot = [], pick = P.pick.slice(), preview = [], previewCat = null, placePreview = null, elimPreview = [];
  if (x && x.focus) focus.push(...x.focus);
  if (x && x.spot) spot = x.spot.slice();
  if (g.guidedLeft > 0 && P.coach && P.coach.kind === 'step') { focus.push(...(P.coach.focus || [])); spot = spot.concat(P.coach.cells || []); }
  if (hd) {
    if (hd.lesson) {
      if (lvl >= 2) {
        if (x.answer.place) placePreview = x.answer.place;
        else if (x.answer.cat !== undefined) previewCat = x.answer.cat;
        else if (x.answer.cells) spot = spot.concat(x.answer.mode === 'one' ? [x.answer.cells[0]] : x.answer.cells);
      }
    } else {
      if (lvl >= 1) { focus.push(...(hd.focus || [])); if (hd.mark) spot = spot.concat(hd.mark); }
      if (lvl >= 2 && g.kind === 'sd') spot = spot.concat(hd.cells || []);
      if (lvl >= 2 && g.kind === 'ct' && hd.tech === 'blocks-all') spot = spot.concat(hd.elim || []);
      if (lvl >= 3 && hd.kind === 'step') {
        if (g.kind === 'sd') { placePreview = hd.place; elimPreview = hd.elim || []; } else { preview = hd.elim || []; previewCat = hd.place; }
      }
    }
  }
  const scale = APP.boardScale[g.n] || 1;
  const wide = window.innerWidth >= 900;
  if (g.kind === 'sd') {
    const showConflict = !(x && x.t === 'tap');
    const labels = g.values.map((v, k) => `${sdCellName(g.n, k)}, ${v ? v + (g.puzzle[k] ? ', 처음 숫자' : '') : g.notes[k] ? '메모 ' + sdDigitsOf(g.notes[k]).join(' ') : '비어 있음'}`);
    return `<div class="board-host">` + renderSudokuBoard({ scale, wide, n: g.n, puzzle: g.puzzle, values: g.values, notes: g.notes, sel: x && x.t === 'tap' ? -1 : g.sel, conflict: showConflict ? sdConflicts(g.values) : [], wrong: P.showWrong ? sdWrongCells(g) : [], focus, spot, pick, placePreview, elimPreview, popCell: g.popCell }) + boardCellsHtml(g.n, labels, g.sel) + '</div>';
  }
  const conflict = x && x.t === 'tap' ? [] : ctConflicts(g.n, g.region, g.cats).cells;
  const faces = {};
  if (g.done) for (const c of g.cats) faces[c] = 'happy';
  for (const c of conflict) faces[c] = 'sorry';
  for (const c of P.showWrong ? ctWrongCats(g) : []) faces[c] = 'sorry';
  const names = gameNamer(g);
  const labels = g.region.map((z, k) => `${ctCellName(g.n, k)}, ${names(z)}, ${g.cats.includes(k) ? (APP.settings.piece === 'star' ? '별' : '고양이') : g.marks.includes(k) ? '×' : '비어 있음'}`);
  return `<div class="board-host">` + renderCatsBoard({ n: g.n, region: g.region, cats: g.cats, marks: isPickMarks(P) ? g.marks.concat(pick) : g.marks, pick: isPickMarks(P) ? [] : pick, dots: APP.settings.autoX ? ctAutoDots(g) : [], conflict: conflict.concat(P.showWrong ? ctWrongCats(g) : []), focus, spot, preview, previewCat, sel: P.kbd ? g.sel : null, pattern: APP.settings.pattern, piece: APP.settings.piece, faces, popCell: g.popCell }) + boardCellsHtml(g.n, labels, g.sel) + '</div>';
}
const isPickMarks = (P) => P.x && P.g.kind === 'ct' && (P.x.t === 'tap' ? P.x.answer.mode === 'all' : P.x.t === 'step' && P.x.answer.cells);

function controlsHtml(P) {
  const g = P.g, x = P.x;
  const done = g.done || (P.feedback && P.feedback.ok);
  const isPick = x && (x.t === 'tap' || (x.t === 'step' && x.answer.cells));
  const hintBtn = `<button data-act="hint" aria-pressed="${Boolean(P.hint)}" ${done ? 'disabled' : ''}>${icon('bulb')}<span>힌트</span></button>`;
  if (isPick) {
    const check = x.answer.mode === 'all' ? `<button data-act="checkpick" ${done ? 'disabled' : ''}>${icon('check')}<span>확인</span></button>` : '';
    return `<div class="tools"><button data-act="clearpick" ${done ? 'disabled' : ''}>${icon('restart')}<span>다시 고르기</span></button>${check}${hintBtn}</div>`;
  }
  const more = `<button data-act="playmore" aria-haspopup="dialog" ${done ? 'disabled' : ''}>${icon('more')}<span>더보기</span></button>`;
  const isStep = x && x.t === 'step';
  if (g.kind === 'sd') {
    const keys = [];
    for (let d = 1; d <= g.n; d++) {
      const left = sdDigitLeft(g, d);
      keys.push(`<button class="key${left <= 0 ? ' used' : ''}" data-act="digit" data-arg="${d}" aria-label="${d}${left <= 0 ? ', 다 놓음' : ''}" ${done ? 'disabled' : ''}>${d}</button>`);
    }
    const memoLocked = x && x.t === 'memo';
    const tools = `<div class="tools">
      <button data-act="undo" ${done || !g.history.length ? 'disabled' : ''}>${icon('undo')}<span>되돌리기</span></button>
      <button data-act="erase" ${done ? 'disabled' : ''}>${icon('erase')}<span>지우기</span></button>
      <button data-act="memo" aria-pressed="${g.memo}" ${done || memoLocked ? 'disabled' : ''}>${icon('pencil')}<span>${g.memo ? '메모 켬' : '메모'}</span></button>
      ${x && x.t === 'memo' ? `<button data-act="checkmemo" ${done ? 'disabled' : ''}>${icon('check')}<span>확인</span></button>` : hintBtn}
      ${isStep || memoLocked || (x && x.t === 'count') ? '' : more}
    </div>`;
    const cols = g.n === 9 ? 'k5' : g.n === 6 ? 'k6' : 'k4';
    return `${tools}<div class="keys ${cols}">${keys.join('')}${g.n === 9 ? `<button class="key" data-act="erase" aria-label="지우기" ${done ? 'disabled' : ''}>${icon('erase')}</button>` : ''}</div>`;
  }
  const isStepCat = isStep && x.answer.cat !== undefined;
  return `<div class="tools">
    <button data-act="undo" ${done || !g.history.length ? 'disabled' : ''}>${icon('undo')}<span>되돌리기</span></button>
    <button data-act="erase" ${done || isStepCat ? 'disabled' : ''}>${icon('erase')}<span>지우기</span></button>
    ${hintBtn}
    ${isStepCat ? '' : more}
  </div>`;
}
function playMoreSheet() {
  return {
    label: '풀기 더보기',
    html: () => {
      const P = APP.play;
      const g = P.g;
      const fill = canAutoNotes(P) ? `<button class="li" data-act="fillnotes">${icon('pencil', 'c-ink2')}<span class="grow t-body">메모 자동 채우기</span></button>` : '';
      return `<div class="t-head">더보기</div><div class="list sheet-list">
        <button class="li" data-act="checkboard">${icon('check', 'c-ink2')}<span class="grow"><span class="t-body">지금까지 맞는지 확인</span><br><span class="t-small c-sub">${g.kind === 'sd' ? '틀린 칸을 표시해요' : '자리가 맞지 않는 고양이를 표시해요'}</span></span></button>
        ${fill}
        <button class="li" data-act="restart">${icon('restart', 'c-ink2')}<span class="grow t-body">처음부터 다시 하기</span></button>
      </div><button class="btn secondary block" data-act="closesheet">닫기</button>`;
    },
  };
}
function canAutoNotes(P) {
  if (P.g.kind !== 'sd' || P.g.n < 6) return false;
  // 기획서 6.1-6: 메모 자동 채우기는 4단원부터(3단원 마지막 차시 S11을 마치면) 열린다
  return APP.store.isDone('S11') || APP.settings.openAll;
}

function footFeedback(P) {
  const f = P.feedback;
  if (!f) return '';
  const face = pieceSvg('cat', f.ok ? 'happy' : 'sorry', 48);
  const act = f.ok
    ? (P.ctx === 'lesson' ? `<button class="btn primary" data-act="next">${APP.lesson.i < APP.lesson.steps.length - 1 ? '다음' : '마치기'}</button>` : '')
    : `<button class="btn secondary" data-act="dismiss">다시 하기</button>`;
  return `<div class="foot"><div class="feedback ${f.ok ? 'ok' : 'bad'} rise" role="status" aria-live="polite"><span class="face">${face}</span><div class="msg"><b>${uiEsc(f.title)}</b>${f.text ? `<span>${uiEsc(f.text)}</span>` : ''}</div></div>${act ? `<div class="row">${act}</div>` : ''}</div>`;
}

const HINT_STEPS = ['어디를 볼까', '왜 그럴까', '이렇게 해요'];
function hintCardHtml(P) {
  const h = P.hint, d = h.data;
  let levels = 3, title = '', body = '', eyebrow = d.lesson || h.level >= 2 ? d.name || '' : '';
  if (d.lesson) {
    levels = 2;
    if (h.level === 1) { title = '이렇게 생각해 봐요'; body = d.explain || '표시한 곳을 차근차근 살펴봐요.'; } else { title = '정답 자리를 표시했어요'; body = d.answerText; }
  } else if (h.level === 1) { title = d.where; body = d.kind === 'step' ? '한 번 더 누르면 이유를 알려 줘요.' : ''; }
  else if (h.level === 2) { title = d.where; body = d.why; }
  else { title = d.todo || d.where; body = d.why; }
  const names = d.lesson ? ['생각할 점', '정답 보기'] : HINT_STEPS;
  const steps = names.slice(0, levels).map((s, k) => `<span class="${k + 1 === h.level ? 'on' : k + 1 < h.level ? 'done' : ''}"><i></i>${k + 1} ${s}</span>`).join('');
  let primary = '';
  if (h.level < levels) primary = `<button class="btn primary" data-act="hintmore">${names[h.level]}</button>`;
  else if (!d.lesson && (d.kind === 'step' || d.kind === 'mistake' || d.kind === 'note')) primary = `<button class="btn primary" data-act="hintapply">그대로 하기</button>`;
  const g = P.g;
  const mark = d.lesson ? (h.level >= 2 ? '판에 점선으로 표시했어요' : '') : h.level === 1 ? (g.kind === 'sd' ? '판에 색칠한 곳이에요' : '판에 밝게 남긴 곳이에요') : h.level === 2 && d.cells && d.cells.length ? '관련 칸은 점선으로 표시했어요' : h.level === 3 ? '할 일을 판에 점선으로 표시했어요' : '';
  return `<div class="hintcard rise" role="region" aria-label="힌트"><div class="steps">${steps}</div>${eyebrow ? `<span class="chip acc tech">${uiEsc(eyebrow)}</span>` : ''}<div class="t-sub">${uiEsc(title)}</div>${mark ? `<div class="t-small c-sub hint-mark">${mark}</div>` : ''}${body ? `<p class="t-body c-ink2">${uiEsc(body)}</p>` : ''}<div class="acts"><button class="btn secondary" data-act="hintclose">닫기</button>${primary}</div></div>`;
}
function coachHtml(P) {
  const c = P.coach = gameHint(P.g, P.g.kind === 'ct' ? gameNamer(P.g) : null);
  if (!c || c.kind === 'done') return '';
  const canApply = c.kind === 'step' && !c.place;
  return `<div class="hintcard coach rise" role="region" aria-label="따라 풀기"><div class="eyebrow">따라 풀기 · ${uiEsc(c.name || '')}</div><div class="t-sub">${uiEsc(c.where)}</div><p class="t-body c-ink2">${uiEsc(c.why)}</p>${canApply ? `<div class="acts"><button class="btn tonal" data-act="coachapply">${P.g.kind === 'ct' ? '×를 해 줘요' : '지워 줘요'}</button></div>` : `<p class="t-small c-sub">${uiEsc(c.todo || '')}</p>`}</div>`;
}

function screenLessonDone() {
  const L = APP.lesson;
  const f = findLesson(L.id);
  const isDone = (lid) => APP.store.isDone(lid);
  const next = L.isMission ? null : f.path.lessons[f.index + 1];
  const nextMission = !L.isMission && f.path.missions.find((m) => m.unit === L.def.unit && isOpen(m.id, isDone) && !APP.store.missionDone(m.id));
  const stars = L.stars;
  const starRow = [1, 2, 3].map((k) => `<svg class="i star-big pop${k <= stars ? ' on' : ''}" style="animation-delay:${k * 60}ms" aria-hidden="true"><use href="#i-star"/></svg>`).join('');
  const nextBtn = nextMission ? `<button class="btn primary block" data-act="nav" data-arg="#/mission/${nextMission.id}">단원 미션 하기</button>`
    : next ? `<button class="btn primary block" data-act="nav" data-arg="#/lesson/${next.id}">${String(f.index + 2).padStart(2, '0')} ${uiEsc(next.title)} 시작하기</button>` : '';
  const dailyRec = APP.store.dailyOf(todayKey(), APP.store.level()) || {};
  // 첫 방문(1차시를 처음 마침)에는 「오늘의 스도쿠 풀기」가 주 단추, 다음 차시는 보조
  const firstVisit = L.id === 'S01' && dailyRec.sudoku === undefined && APP.store.totalStars() <= 3;
  const dailyBtn = dailyRec.sudoku === undefined ? `<button class="btn ${firstVisit ? 'primary' : 'secondary'} block" data-act="nav" data-arg="#/daily/sd">오늘의 스도쿠 풀기</button>` : '';
  return `<div class="qbar"><button class="iconbtn" data-act="nav" data-arg="#/path/${f.path.id}" aria-label="닫기">${icon('close')}</button></div>
  <div class="result">
    <span class="pop" aria-hidden="true">${pieceSvg('cat', 'happy', 112)}</span>
    <div><div class="eyebrow">${L.isMission ? '단원 미션' : `${f.index + 1}차시`} · ${uiEsc(L.def.title)}</div><div class="t-title">${L.isMission ? '배지를 받았어요' : '차시를 마쳤어요'}</div></div>
    ${L.isMission ? `<div class="badge-big pop">${icon('flag')}<span>${L.def.unit}단원</span></div>` : `<div class="stars-big" aria-label="별 ${stars}개">${starRow}</div>`}
    <div class="t-small c-sub">틀림 ${L.mistakes}번 · 힌트 ${L.hints}번</div>${!L.isMission && stars < 3 ? '<div class="t-small c-ink2">틀리지 않고 힌트 없이 풀면 별 세 개를 받아요</div>' : ''}
    ${L.def.summary ? `<div class="card tight summary"><div class="t-label c-sub">한 줄 정리</div><div class="t-body-b">${uiEsc(L.def.summary)}</div></div>` : ''}
  </div>
  <div class="foot">${firstVisit ? dailyBtn + nextBtn.replace('btn primary', 'btn secondary') : nextBtn + dailyBtn}<button class="btn text" data-act="nav" data-arg="#/path/${f.path.id}">길로 돌아가기</button></div>`;
}

// ── 오늘의 퍼즐·자유 연습 ──
function startDaily(which) {
  if (which !== 'sd' && which !== 'ct') { APP.play = null; return; }
  const d = todayDaily();
  // 진행 중 저장과 기록은 날짜 × 난이도 × 퍼즐마다 따로. 난이도를 바꿨다 돌아와도 하던 판이 이어진다
  const key = `daily-${which}-${d.date}-${d.level}`;
  if (APP.play && APP.play.ctx === 'daily' && APP.play.key === key) return;
  const src = which === 'sd' ? { kind: 'sd', n: d.sudoku.n, puzzle: d.sudoku.puzzle, solution: d.sudoku.solution } : { kind: 'ct', n: d.cats.n, region: d.cats.region, solution: d.cats.solution };
  const g = newGame(src, { mode: 'daily', challenge: APP.settings.challenge });
  const prog = APP.store.progressOf(key);
  if (prog) gameRestore(g, prog.state);
  const rec = APP.store.dailyOf(d.date, d.level) || {};
  const w = which === 'sd' ? 'sudoku' : 'cats';
  const solvedBefore = rec[w] !== undefined ? { sec: rec[w], help: Boolean(rec[w + 'Help']) } : null;
  APP.lesson = null;
  APP.play = { ctx: 'daily', which, key, date: d.date, level: d.level, gen: d.gen, g, x: null, hint: null, feedback: null, pick: [], title: which === 'sd' ? '오늘의 스도쿠' : '오늘의 고양이 자리', sub: `${g.n}×${g.n} · ${LEVEL_LABEL[d.level]}`, solvedBefore };
}
function startFree() {
  const pr = APP.practice;
  const t0 = performance.now();
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  let src;
  if (pr.kind === 'sd') {
    const r = practiceSudoku(pr.n, pr.level, seed);
    src = { kind: 'sd', n: pr.n, puzzle: r.puzzle, solution: r.solution };
  } else if (pr.n <= CT_DEVICE_MAX) {
    const r = practiceCats(pr.n, pr.level, seed);
    src = { kind: 'ct', n: pr.n, region: r.region, solution: r.solution };
  } else {
    const list = PACKS[pr.n === 9 ? 'c9-free' : 'c10-free'];
    const { n, region } = ctParse(list[seed % list.length]);
    src = { kind: 'ct', n, region };
  }
  const ms = performance.now() - t0;
  APP.genMs.push({ what: `free-${pr.kind}-${pr.n}-${pr.level}`, ms });
  const g = newGame(src, { mode: 'free', challenge: APP.settings.challenge });
  APP.lesson = null;
  APP.play = { ctx: 'free', g, x: null, hint: null, feedback: null, pick: [], title: pr.kind === 'sd' ? '자유 연습 · 스도쿠' : '자유 연습 · 고양이 자리', sub: `${g.n}×${g.n}${pr.kind === 'ct' && pr.n > CT_DEVICE_MAX ? '' : ' · ' + LEVEL_LABEL[pr.level]}`, genMs: ms, bestKey: `${pr.kind}-${pr.n}-${pr.kind === 'ct' && pr.n > CT_DEVICE_MAX ? 'pack' : pr.level}` };
  go('#/free');
}

function screenPlay() {
  const P = APP.play;
  if (P.result) return screenPlayDone();
  const g = P.g;
  const hearts = g.hearts !== null ? `<span class="hearts" aria-label="하트 ${g.hearts}개">${[0, 1, 2].map((k) => `<i class="${k < g.hearts ? 'on' : ''}"></i>`).join('')}</span>` : '';
  const timer = APP.settings.timer ? `<span class="status t-label c-ink2 num">${icon('timer', 's20')}<span data-timer>${fmtTime(g.elapsed)}</span></span>` : '';
  const back = P.ctx === 'free' ? '#/practice' : '#/';
  const top = `<div class="qbar"><button class="iconbtn" data-act="nav" data-arg="${back}" aria-label="뒤로">${icon('back')}</button><div class="grow"><div class="t-body-b">${uiEsc(P.title)}</div><div class="t-small c-sub">${uiEsc(P.sub)}</div></div>${hearts}${timer}</div>${P.ctx === 'daily' && P.solvedBefore ? `<div class="solved-note t-small" role="note">${icon('check', 's16')}<span>${P.solvedBefore.help ? '이 문제는 오늘 힌트와 함께 끝까지 했어요' : `이 문제는 오늘 이미 풀었어요(<span class="num">${fmtTime(P.solvedBefore.sec)}</span>)`}</span></div>` : ''}`;
  if (g.hearts === 0) {
    return top + `<div class="result"><span aria-hidden="true">${pieceSvg('cat', 'sorry', 96)}</span><div class="t-title">하트를 다 썼어요</div><p class="t-body c-ink2">도전 모드에서는 틀린 수를 세 번까지 봐줘요. 처음부터 다시 하거나, 하트 없이 이어서 풀 수 있어요.</p></div><div class="foot"><button class="btn primary block" data-act="continuenohearts">하트 없이 이어서</button><button class="btn text" data-act="restart">처음부터</button></div>`;
  }
  const rule = g.kind === 'sd' ? '가로줄, 세로줄, 굵은 선 상자마다 숫자가 한 번씩 들어가요.' : '가로줄, 세로줄, 색 구역마다 고양이가 한 마리씩. 고양이끼리는 대각선으로도 닿으면 안 돼요.';
  return top + screenGameBody(P.ctx === 'daily' ? '오늘의 퍼즐' : '자유 연습', { t: 'solve', prompt: rule, focus: [], spot: [], answer: {} });
}
function screenPlayDone() {
  const P = APP.play;
  const g = P.g;
  const isSd = g.kind === 'sd';
  const best = P.bestSec;
  let other = '';
  if (P.ctx === 'daily') {
    const rec = APP.store.dailyOf(P.date, P.level) || {};
    const otherWhich = isSd ? 'ct' : 'sd';
    const otherDone = rec[otherWhich === 'sd' ? 'sudoku' : 'cats'] !== undefined;
    other = otherDone ? '' : `<button class="btn primary block" data-act="nav" data-arg="#/daily/${otherWhich}">${otherWhich === 'sd' ? '스도쿠도 풀기' : '고양이 자리도 풀기'}</button>`;
  } else other = `<button class="btn primary block" data-act="freeagain">새 문제</button>`;
  return `<div class="qbar"><button class="iconbtn" data-act="nav" data-arg="${P.ctx === 'free' ? '#/practice' : '#/'}" aria-label="닫기">${icon('close')}</button></div>
  <div class="result">
    <span class="pop" aria-hidden="true">${pieceSvg(isSd ? 'cat' : APP.settings.piece, 'happy', 112)}</span>
    <div><div class="eyebrow">${uiEsc(P.title)} · ${g.n}×${g.n}</div><div class="t-title">${P.assisted ? '힌트와 함께 끝까지 했어요' : isSd ? '스도쿠를 혼자 다 풀었어요' : (APP.settings.piece === 'star' ? '별을 모두 놓았어요' : '고양이를 모두 앉혔어요')}</div></div>
    <div class="t-display num pop" style="animation-delay:120ms">${fmtTime(g.elapsed)}</div>
    <div class="t-small c-sub">${P.assisted ? `힌트 ${g.hints}번 · 힌트로 채운 판은 최고 기록에 넣지 않아요` : `${best !== undefined ? `내 최고 기록 ${fmtTime(best)}${P.newBest ? ' · 새 기록' : ''} · ` : ''}힌트 ${g.hints}번 · 틀림 ${g.mistakes}번`}</div>
    ${P.ctx === 'daily' ? weekStrip(P.date) : ''}
  </div>
  <div class="foot">${other}<button class="btn text" data-act="nav" data-arg="#/">놀이터로</button></div>`;
}
function weekStrip(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const all = APP.store.dailyAll();
  let cells = '';
  for (let k = 0; k < 7; k++) {
    const day = new Date(monday); day.setDate(monday.getDate() + k);
    const key = todayKey(day);
    // 혼자 푼 것만 체크(어느 난이도든), 힌트와 함께만 끝낸 날은 작은 점
    const f = dayFlags(all[key]);
    const solo = ['sudoku', 'cats'].filter((w) => f[w] === 'solo');
    const help = ['sudoku', 'cats'].some((w) => f[w] === 'help');
    const isToday = key === dateKey;
    const cls = solo.length === 2 ? 'd' : solo.length ? 'h' : help ? 'p' : isToday ? 't' : '';
    const label = solo.length ? '혼자 푼 날' : help ? '힌트 도움 받은 날' : '';
    cells += `<div><i class="${cls}"${label ? ` aria-label="${label}"` : ''}>${solo.length ? icon('check') : help ? '<b class="dot"></b>' : ''}</i><span class="t-small ${isToday ? '' : 'c-sub'}">${isToday ? `<b>${DAY_NAMES[day.getDay()]}</b>` : DAY_NAMES[day.getDay()]}</span></div>`;
  }
  return `<div class="week" aria-label="이번 주 오늘의 퍼즐">${cells}</div><div class="legend t-small c-sub"><span>${icon('check', 's16')}혼자 푼 날</span><span><b class="dot"></b>힌트 도움 받은 날</span></div>`;
}
function onGameChanged() {
  const P = APP.play;
  const g = P.g;
  if (P.ctx !== 'lesson') {
    if (gameIsDone(g)) return finishPlay();
    APP.store.saveProgress(P.ctx === 'daily' ? P.key : 'free', gameSave(g));
  } else {
    const x = P.x;
    if ((x.t === 'solve' || x.t === 'guided') && gameIsDone(g)) {
      lessonCorrect(x.t === 'guided' ? '따라 풀기를 끝까지 마쳤어요.' : '끝까지 풀었어요.');
    }
  }
  render();
}
function finishPlay() {
  const P = APP.play;
  const g = P.g;
  g.done = true;
  P.result = true;
  const sec = Math.round(g.elapsed);
  // 힌트 3단계(그대로 하기)를 쓴 판은 최고 기록과 비교하지 않는다
  const assisted = Boolean(g.assisted);
  P.assisted = assisted;
  if (P.ctx === 'daily') {
    APP.store.recordDaily(P.date, g.kind === 'sd' ? 'sudoku' : 'cats', sec, P.gen, P.level, assisted);
    const k = `daily-${g.kind}-${P.level}`;
    P.newBest = assisted ? false : APP.store.recordBest(k, sec);
    P.bestSec = APP.store.bestAll()[k];
  } else {
    P.newBest = assisted ? false : APP.store.recordBest(P.bestKey, sec);
    P.bestSec = APP.store.bestAll()[P.bestKey];
  }
  APP.store.clearProgress(P.ctx === 'daily' ? P.key : 'free');
  render();
}

// ── 판 누르기 ──
function onBoardTap(cell) {
  const P = APP.play;
  if (!P || cell < 0) return;
  const g = P.g, x = P.x;
  P.kbd = false;
  if (P.feedback && P.feedback.ok) return;
  if (P.feedback && !P.feedback.ok) P.feedback = null;
  if (x && (x.t === 'tap' || (x.t === 'step' && x.answer.cells))) {
    if (x.answer.mode === 'one') {
      P.pick = [cell];
      if (checkPick(x.answer, P.pick)) lessonCorrect(x.explain);
      else { lessonMistake('다시 해 봐요', pickWhy(x, cell)); P.pick = []; }
    } else {
      P.pick = P.pick.includes(cell) ? P.pick.filter((y) => y !== cell) : [...P.pick, cell];
    }
    return render();
  }
  if (x && x.t === 'count') { g.sel = cell; return render(); }
  if (g.kind === 'sd') {
    g.sel = cell;
    return render();
  }
  // 고양이 자리
  if (x && x.t === 'step' && x.answer.cat !== undefined) {
    if (cell === x.answer.cat) { g.cats.push(cell); g.popCell = cell; lessonCorrect(x.explain); }
    else lessonMistake('다시 해 봐요', catWhy(g, cell));
    return render();
  }
  g.sel = cell;
  const r = ctCycle(g, cell);
  if (r === 'wrong-challenge') { toast('여기에는 고양이가 앉을 수 없어요. 하트가 하나 줄었어요.'); return render(); }
  afterMove();
}
function afterMove() {
  const P = APP.play;
  if (P.g.kind === 'ct' && APP.settings.autoX && !APP.settings.tipDots && P.g.cats.length && ctAutoDots(P.g).length) {
    setSetting('tipDots', true);
    setTimeout(() => toast('흐린 점은 놓은 고양이 때문에 더 둘 수 없는 칸이에요. 설정에서 끌 수 있어요.'), 0);
  }
  P.showWrong = false;
  if (P.hint && P.hint.data && !P.hint.data.lesson) P.hint = null;
  if (P.g.guidedLeft > 0 && P.coach && P.coach.place !== null && P.coach.place !== undefined) {
    const placed = P.g.kind === 'sd' ? P.g.values[P.coach.place.x] === P.coach.place.d : P.g.cats.includes(P.coach.place);
    if (placed) P.g.guidedLeft--;
  }
  onGameChanged();
}
function pickWhy(x, cell) {
  if (x.kind === 'ct') {
    const blocked = x.cats && x.cats.length ? ctBlockedBy(x.n, x.region, x.cats[0]) : [];
    if (x.t === 'tap' && x.answer.mode === 'one') return '규칙(같은 줄, 같은 구역, 닿기)을 하나씩 확인해 봐요.';
    void blocked;
    return '표시한 곳의 남은 자리를 다시 세어 봐요.';
  }
  return x.explain || '표시한 곳을 다시 살펴봐요.';
}
function catWhy(g, cell) {
  const test = ctConflicts(g.n, g.region, [...g.cats, cell]);
  if (test.cells.includes(cell)) {
    const r = test.reasons.find((q) => q.a === cell || q.b === cell);
    return { row: '같은 가로줄에 이미 고양이가 있어요.', col: '같은 세로줄에 이미 고양이가 있어요.', region: '같은 구역에 이미 고양이가 있어요.', touch: '다른 고양이와 닿아요. 대각선도 닿은 거예요.' }[r.why];
  }
  return '표시한 줄이나 구역에서 남은 자리를 다시 세어 봐요.';
}

function onDigit(d) {
  APP.keepCellFocus = true;
  const P = APP.play;
  if (!P || !P.g || P.g.kind !== 'sd') return;
  const g = P.g, x = P.x;
  if (P.feedback && P.feedback.ok) return;
  if (P.feedback) P.feedback = null;
  if (x && x.t === 'memo') { if (g.sel !== x.answer.x) g.sel = x.answer.x; g.memo = true; sdInput(g, d, APP.settings); return render(); }
  if (x && x.t === 'step' && x.answer.place) {
    if (g.sel < 0) { toast('먼저 칸을 골라요.'); return; }
    if (g.puzzle[g.sel] || g.values[g.sel]) { toast('빈칸을 골라요.'); return; }
    const want = x.answer.place;
    if (g.sel === want.x && d === want.d) { g.values[g.sel] = d; g.popCell = g.sel; lessonCorrect(x.explain); }
    else if (d === g.solution[g.sel]) { P.feedback = { ok: false, title: '다시 해 봐요', text: '맞는 숫자지만, 이번에는 표시한 곳에서 답을 찾아봐요.' }; }
    else lessonMistake('다시 해 봐요', `${sdCellName(g.n, g.sel)}에는 ${josa(String(d), '이가')} 들어갈 수 없어요. 같은 줄과 상자를 확인해 봐요.`);
    return render();
  }
  if (g.sel < 0) { toast('먼저 칸을 골라요.'); return; }
  const r = sdInput(g, d, APP.settings);
  if (r === 'given') { toast('처음부터 있던 숫자는 바꿀 수 없어요.'); return; }
  if (r === 'wrong-challenge') { toast(`${d}는 여기에 맞지 않아요. 하트가 하나 줄었어요.`); return render(); }
  if (r === 'none' || r === 'same') return render();
  afterMove();
}

// ── 키보드 ──
function onKey(e) {
  if (APP.dialog || APP.sheet) {
    if (e.key === 'Escape') { if (APP.dialog) { APP.dialog = null; if (APP.sheet) APP.restoreFocus = APP.dialogOpener; } else APP.sheet = null; if (!APP.dialog && !APP.sheet) closeOverlay(); render(); return; }
    if (e.key === 'Tab') trapTab(e);
    return;
  }
  if (e.target && e.target.classList && e.target.classList.contains('cellbtn')) APP.keepCellFocus = true;
  const P = APP.play;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (!P || !P.g || P.result) { if (APP.lesson && APP.lesson.steps[APP.lesson.i] && APP.lesson.steps[APP.lesson.i].t === 'card' && e.key === 'Enter' && t === document.body) lessonNext(); return; }
  const g = P.g, n = g.n;
  if (e.key === 'Escape' && P.hint) { P.hint = null; render(); return; }
  // 판 조작 키는 초점이 판 칸(또는 아무 곳에도 초점이 없을 때)만. 단추·입력칸에서는 브라우저 기본 동작(Enter·Space로 단추 누르기)
  const onCell = Boolean(t && t.classList && t.classList.contains('cellbtn'));
  const noFocus = !t || t === document.body || t === document.documentElement;
  if (!onCell && !noFocus) return;
  const move = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (move !== undefined) {
    e.preventDefault();
    APP.keepCellFocus = Boolean(t && t.classList && t.classList.contains('cellbtn'));
    let s = g.sel < 0 ? 0 : g.sel;
    if (e.key === 'ArrowLeft' && s % n === 0) return; if (e.key === 'ArrowRight' && s % n === n - 1) return;
    s += move; if (s < 0 || s >= n * n) return;
    g.sel = s; P.kbd = true; render(); return;
  }
  if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey || !e.shiftKey)) { if (gameUndo(g)) onGameChanged(); return; }
  if (e.key === 'h' || e.key === 'H') { openHint(); return; }
  const isPick = P.x && (P.x.t === 'tap' || (P.x.t === 'step' && P.x.answer.cells));
  if (onCell && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); APP.keepCellFocus = true; const cell = Number(t.dataset.arg); if (g.kind === 'sd' && !isPick && e.key === ' ') { g.sel = cell; if (!(P.x && P.x.t === 'memo')) g.memo = !g.memo; render(); return; } g.sel = cell; P.kbd = true; onBoardTap(cell); return; }
  // Enter·Space 는 판 칸에서만 판을 조작한다(위에서 처리). 초점이 없을 때는 아무 일도 하지 않는다.
  if (e.key === ' ' || e.key === 'Enter') return;
  if (g.kind === 'sd') {
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) { onDigit(Number(e.key)); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); if (sdErase(g)) onGameChanged(); return; }
    if (e.key === 'm' || e.key === 'M' || e.key === 'n' || e.key === 'N') { e.preventDefault(); if (!(P.x && P.x.t === 'memo')) { g.memo = !g.memo; render(); } return; }
    return;
  }
  if (g.sel < 0) return;
  if (e.key === 'x' || e.key === 'X') { if (ctToggleMark(g, g.sel) !== 'none') afterMove(); return; }
  if (e.key === 'c' || e.key === 'C') { if (P.x && P.x.t === 'step') { onBoardTap(g.sel); return; } const r = ctPutCat(g, g.sel); if (r === 'wrong-challenge') { toast('하트가 하나 줄었어요.'); render(); } else if (r !== 'none') afterMove(); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); if (ctClearCell(g, g.sel)) afterMove(); }
}

// ── 힌트 ──
function openHint() {
  const P = APP.play;
  if (!P || !P.g || P.g.done) return;
  if (P.hint) return;
  const x = P.x;
  const lessonish = x && x.t !== 'solve' && x.t !== 'guided' && P.ctx === 'lesson';
  let data;
  if (lessonish) {
    let answerText = '';
    if (x.answer.place) answerText = `${sdCellName(x.n, x.answer.place.x)}에 ${josa(String(x.answer.place.d), '을를')} 놓아요.`;
    else if (x.answer.cat !== undefined) answerText = `${ctCellName(x.n, x.answer.cat)}에 고양이를 놓아요.`;
    else if (x.answer.cells) answerText = x.answer.mode === 'one' ? '표시한 칸을 눌러요.' : `표시한 칸 ${x.answer.cells.length}개를 모두 골라요.`;
    else if (x.answer.mask !== undefined) answerText = x.explain;
    else if (x.answer.choice !== undefined) answerText = `정답은 ${x.options[x.answer.choice]}개예요.`;
    data = { lesson: true, name: x.techName || '', explain: x.t === 'step' ? x.explain : (x.t === 'count' || x.t === 'memo' ? '가로줄, 세로줄, 상자에 이미 있는 숫자를 하나씩 지워 봐요.' : x.explain), answerText };
  } else data = gameHint(P.g, P.g.kind === 'ct' ? gameNamer(P.g) : null);
  if (data.kind === 'done') return;
  P.g.hints++;
  if (P.ctx === 'lesson') APP.lesson.hints++;
  P.hint = { level: 1, data };
  render();
}

// ── 연습 고르기 ──
function screenPractice() {
  const pr = APP.practice;
  const sizes = pr.kind === 'sd' ? [4, 6, 9] : [4, 5, 6, 7, 8, 9, 10];
  if (!sizes.includes(pr.n)) pr.n = pr.kind === 'sd' ? 9 : 6;
  const packOnly = pr.kind === 'ct' && pr.n > CT_DEVICE_MAX;
  const seg = (name, list, cur, label) => `<div class="segctl" role="group" aria-label="${label}">${list.map(([v, t]) => `<button aria-pressed="${String(v) === String(cur)}" data-act="pr-${name}" data-arg="${v}">${t}</button>`).join('')}</div>`;
  const best = APP.store.bestAll();
  const bestKey = `${pr.kind}-${pr.n}-${packOnly ? 'pack' : pr.level}`;
  return `${appBar('자유 연습', { right: profileBtn() })}<div class="scroll">
    <div class="hello"><div class="eyebrow">새 문제를 이 기기에서 바로 만들어요</div><div class="t-title">무엇을 풀까요</div></div>
    <div class="card form-card rise">
      <div class="field-row"><span class="t-label c-sub">퍼즐</span>${seg('kind', [['sd', '스도쿠'], ['ct', '고양이 자리']], pr.kind, '퍼즐')}</div>
      <div class="field-row"><span class="t-label c-sub">판 크기</span><div class="sizes">${sizes.map((s) => `<button class="sizechip" aria-pressed="${s === pr.n}" data-act="pr-n" data-arg="${s}">${s}×${s}</button>`).join('')}</div></div>
      <div class="field-row"><span class="t-label c-sub">난이도</span>${packOnly ? '<span class="t-small c-sub">9×9 이상은 미리 만든 문제 묶음에서 골라요</span>' : seg('level', [['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']], pr.level, '난이도')}</div>
      <p class="t-small c-sub">${practiceHint(pr)}</p>
    </div>
    <div class="row-between best-row"><span class="t-small c-sub">이 조건 내 최고 기록</span><span class="t-body-b num">${best[bestKey] !== undefined ? fmtTime(best[bestKey]) : '아직 없어요'}</span></div>
    <button class="btn primary block" data-act="freestart">새 문제 만들기</button>
    ${APP.making ? `<div class="state loading" aria-busy="true" role="status"><div class="skel" style="width:80%"></div><div class="t-small c-sub">문제를 만드는 중이에요</div></div>` : ''}
  </div>`;
}
function practiceHint(pr) {
  if (pr.kind === 'sd') return { easy: '마지막 빈칸, 숨은 한 자리, 하나뿐인 숫자로 풀려요.', normal: '9×9는 가리키기·차지하기나 짝이 한 번은 필요해요.', hard: '9×9는 짝, 셋 묶음, X-윙까지 쓸 수 있어요.' }[pr.level];
  if (pr.n > CT_DEVICE_MAX) return '큰 판은 만드는 데 오래 걸려서, 미리 만들어 검산한 문제를 써요.';
  return { easy: '마지막 자리, 한 줄에 갇힌 구역, 모두가 닿는 칸으로 풀려요.', normal: '묶어서 보기가 필요할 수 있어요.', hard: '가정해 보기까지 쓸 수 있어요.' }[pr.level];
}

// ── 기록 ──
function screenRecords() {
  const st = APP.store;
  const now = new Date();
  const m = APP.month || { y: now.getFullYear(), m: now.getMonth() };
  const first = new Date(m.y, m.m, 1);
  const days = new Date(m.y, m.m + 1, 0).getDate();
  const lead = first.getDay();
  const all = st.dailyAll();
  let solvedDays = 0;
  let grid = DAY_NAMES.map((d) => `<span class="dow t-small c-sub">${d}</span>`).join('');
  for (let k = 0; k < lead; k++) grid += '<span></span>';
  const today = todayKey(now);
  for (let d = 1; d <= days; d++) {
    const key = todayKey(new Date(m.y, m.m, d));
    const f = dayFlags(all[key]);
    const sd = Boolean(f.sudoku), ct = Boolean(f.cats);
    if (sd || ct) solvedDays++;
    const label = `${m.m + 1}월 ${d}일${sd && ct ? ', 두 퍼즐 모두 풂' : sd ? ', 스도쿠 풂' : ct ? ', 고양이 자리 풂' : ''}`;
    grid += `<span class="day${sd && ct ? ' both' : sd || ct ? ' half' : ''}${key === today ? ' today' : ''}" aria-label="${label}"><b class="num">${d}</b>${sd || ct ? `<i class="dots">${sd ? '<i class="a"></i>' : ''}${ct ? '<i class="b"></i>' : ''}</i>` : ''}</span>`;
  }
  const badges = PATHS.flatMap((p) => p.units.map((u) => {
    const ms = p.missions.find((x) => x.unit === u.unit);
    const done = ms && st.missionDone(ms.id);
    return `<div class="badge${done ? ' on' : ''}" aria-label="${p.id === 'sd' ? '스도쿠' : '고양이 자리'} ${u.unit}단원 배지${done ? ', 받음' : ', 아직'}"><span class="bi">${done ? (p.id === 'sd' ? icon('grid') : pieceSvg(APP.settings.piece, 'happy', 28)) : icon('lock', 's20')}</span><span class="t-small">${p.id === 'sd' ? '스도쿠' : '고양이'} ${u.unit}</span></div>`;
  })).join('');
  const bestEntries = Object.entries(st.bestAll()).sort();
  const bestLabel = (k) => {
    const [a, b, c] = k.split('-');
    if (a === 'daily') return `오늘의 ${b === 'sd' ? '스도쿠' : '고양이 자리'} · ${LEVEL_LABEL[c] || c}`;
    return `${a === 'sd' ? '스도쿠' : '고양이 자리'} ${b}×${b} · ${c === 'pack' ? '묶음' : LEVEL_LABEL[c] || c}`;
  };
  const bests = bestEntries.length
    ? `<div class="list">${bestEntries.map(([k, v]) => `<div class="li"><span class="grow t-body">${bestLabel(k)}</span><span class="t-body-b num">${fmtTime(v)}</span></div>`).join('')}</div>`
    : `<div class="state empty"><div class="ic">${icon('timer')}</div><div class="t-small c-ink2">아직 기록이 없어요. 오늘의 퍼즐이나 자유 연습을 끝까지 풀면 남아요.</div></div>`;
  const doneLessons = PATHS.reduce((a, p) => a + p.lessons.filter((l) => st.isDone(l.id)).length, 0);
  return `${appBar('기록', { right: profileBtn() })}<div class="scroll">
    <div class="stats rise"><div class="stat"><span class="t-small c-sub">마친 차시</span><b class="t-head num">${doneLessons}<small> / 32</small></b></div><div class="stat"><span class="t-small c-sub">모은 별</span><b class="t-head num">${st.totalStars()}</b></div><div class="stat"><span class="t-small c-sub">이번 달 푼 날</span><b class="t-head num">${solvedDays}</b></div></div>
    <div class="card cal rise"><div class="row-between"><button class="iconbtn" data-act="month" data-arg="-1" aria-label="이전 달">${icon('back')}</button><span class="t-sub num">${m.y}년 ${m.m + 1}월</span><button class="iconbtn flip" data-act="month" data-arg="1" aria-label="다음 달">${icon('chev')}</button></div>
      <div class="calgrid">${grid}</div>
      <div class="legend t-small c-sub"><span><i class="a"></i>스도쿠</span><span><i class="b"></i>고양이 자리</span></div>
      ${solvedDays ? '' : '<p class="t-small c-sub">아직 이 달에 푼 날이 없어요. 오늘의 퍼즐부터 해 볼까요.</p>'}
    </div>
    <div class="sec-h"><span class="t-sub">단원 배지</span><span class="t-small c-sub">단원 미션을 마치면 받아요</span></div>
    <div class="badges">${badges}</div>
    <div class="sec-h"><span class="t-sub">내 최고 기록</span></div>
    ${bests}
    <div class="sec-h"><span class="t-sub">기록 옮기기</span></div>
    <div class="list">
      <button class="li" data-act="export">${icon('flip', 'c-ink2')}<span class="grow t-body">기록 파일로 내보내기</span>${icon('chev', 's20 c-sub')}</button>
      <label class="li" for="importfile">${icon('flip', 'c-ink2')}<span class="grow t-body">기록 파일 가져오기</span>${icon('chev', 's20 c-sub')}<input id="importfile" type="file" accept="application/json,.json" class="visually-hidden" data-act="import"></label>
    </div>
    <p class="t-small c-sub foot-note">가져오면 이 기기의 기록이 파일의 기록으로 바뀌어요.</p>
  </div>`;
}

// ── 더보기·설정·사전 ──
function screenMore() {
  const li = (hash, ic, label, val = '') => `<button class="li" data-act="nav" data-arg="${hash}">${icon(ic, 'c-ink2')}<span class="grow t-body">${label}</span>${val ? `<span class="val">${val}</span>` : ''}${icon('chev', 's20 c-sub')}</button>`;
  return `${appBar('더보기', { right: profileBtn() })}<div class="scroll">
    <div class="list rise">${li('#/settings', 'gear', '설정')}<button class="li" data-act="profiles">${icon('home', 'c-ink2')}<span class="grow t-body">프로필</span><span class="val">${APP.store.profiles().length} / 5</span>${icon('chev', 's20 c-sub')}</button>${li('#/glossary', 'book', '용어 사전')}${li('#/story', 'info', '퍼즐 이야기')}${li('#/news', 'sparkle', '새로 생긴 것', 'v' + APP_VERSION)}${canOfferInstall() ? `<button class="li" data-act="install">${icon('download', 'c-ink2')}<span class="grow t-body">홈 화면에 앱으로 설치</span>${icon('chev', 's20 c-sub')}</button>` : ''}</div>
    <div class="card tight about"><div class="t-label c-sub">퍼즐 놀이터 v${APP_VERSION}</div><p class="t-small c-ink2">인터넷 없이 열리는 한 파일 앱이에요. 기록은 이 기기 안에만 저장되고 밖으로 보내지 않아요.</p><p class="t-small c-sub">퍼즐과 그림, 문제는 직접 만들었어요. 앱 코드는 MIT 라이선스예요.</p></div>
    <div class="card tight about"><div class="t-label c-sub">글꼴</div><p class="t-small c-ink2">이 앱의 글꼴은 Pretendard에서 앱에 쓰인 글자만 잘라 이름을 바꾼 것이에요(PG Sans).</p><p class="t-small c-sub legal">Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name 'Pretendard'.<br>Copyright 2014-2021 Adobe, with Reserved Font Name 'Source'.<br>Copyright (c) 2016 The Inter Project Authors, with Reserved Font Name 'Inter'.<br>Copyright 2021 The M+ FONTS Project Authors, with Reserved Font Name 'M PLUS 1'.</p><p class="t-small c-sub">SIL Open Font License 1.1에 따라 써요. 라이선스 전문은 앱 저장소의 THIRD-PARTY-LICENSES.md와 openfontlicense.org에 있어요.</p></div>
  </div>`;
}
function screenSettings() {
  const t = APP.settings.theme;
  const seg = (k, list, cur, label) => `<div class="segctl" role="group" aria-label="${label}">${list.map(([v, txt]) => `<button aria-pressed="${v === cur}" data-act="set" data-arg="${k}:${v}">${txt}</button>`).join('')}</div>`;
  return `${appBar('설정', { back: '#/more' })}<div class="scroll">
    <div class="sec-h first"><span class="t-sub">화면</span></div>
    <div class="list"><div class="li"><span class="grow t-body">밝기</span>${seg('theme', [['auto', '기기 설정'], ['light', '밝게'], ['dark', '어둡게']], t, '화면 밝기')}</div>
    ${sw('pattern', '구역 무늬 보기', '색이 비슷해 보일 때 무늬로 구역을 가려요')}
    <div class="li"><span class="grow t-body">고양이 자리의 말</span>${seg('piece', [['cat', '고양이'], ['star', '별']], APP.settings.piece, '말 모양')}</div>
    ${sw('autoX', '둘 수 없는 칸에 점 찍기', '고양이를 놓으면 같은 줄, 구역, 둘레 칸에 흐린 점을 보여 줘요')}</div>
    <div class="sec-h"><span class="t-sub">풀기</span></div>
    <div class="list">${sw('autoClean', '메모 저절로 지우기', '숫자를 놓으면 같은 줄과 상자의 메모에서 지워요')}
    ${sw('timer', '시간 보기', '끄면 기록만 남고 화면에 안 보여요')}
    ${sw('challenge', '도전 모드', '오늘의 퍼즐과 자유 연습에서 틀린 수를 바로 알리고 하트 3개로 풀어요')}
    ${sw('openAll', '모든 차시 열기', '이미 아는 사람은 차시를 건너뛰고 아무 곳이나 풀 수 있어요')}</div>
    <div class="sec-h"><span class="t-sub">키보드</span></div>
    <div class="card tight kbd"><p class="t-small c-ink2">화살표로 칸 옮기기 · 숫자로 놓기 · 스페이스나 M으로 메모 켜고 끄기 · 백스페이스로 지우기 · Z로 되돌리기 · H로 힌트</p><p class="t-small c-ink2">고양이 자리: 스페이스로 ×와 고양이 차례로 · X로 × · C로 고양이</p></div>
  </div>`;
}
function screenGlossary() {
  const card = (e) => {
    let demo = '';
    if (e.demo) { const d = expandItem({ t: 'step', ...e.demo }, regionNamer()); demo = `<div class="mini-board">${demoBoard(d)}</div>`; }
    return `<article class="gcard rise">${demo}<div class="gtext"><div class="eyebrow">${e.kind === 'sd' ? '스도쿠' : '고양이 자리'}</div><h3 class="t-sub">${uiEsc(e.name)}</h3><p class="t-small c-ink2">${uiEsc(e.text)}</p><p class="t-small c-sub">${uiEsc(e.en)}</p></div></article>`;
  };
  if (!APP.glossaryHtml) APP.glossaryHtml = GLOSSARY.map(card).join('');
  return `${appBar('용어 사전', { back: '#/more' })}<div class="scroll"><div class="glossary">${APP.glossaryHtml}</div></div>`;
}
function screenStory() {
  return `${appBar('퍼즐 이야기', { back: '#/more' })}<div class="scroll">${STORIES.map((s) => `<article class="card story rise"><span class="ic">${s.kind === 'sd' ? icon('grid') : pieceSvg(APP.settings.piece, 'normal', 28)}</span><h2 class="t-head">${uiEsc(s.title)}</h2>${s.text.map((t) => `<p class="t-body c-ink2">${uiEsc(t)}</p>`).join('')}</article>`).join('')}</div>`;
}
function screenNews() {
  return `${appBar('새로 생긴 것', { back: '#/more' })}<div class="scroll">${newsList(WHATS_NEW)}</div>`;
}
function newsList(list) {
  return `<div class="list news">${list.map((n) => `<div class="li tall"><span class="grow"><span class="t-body-b">${uiEsc(n.title)}</span><br><span class="t-small c-ink2">${uiEsc(n.text)}</span></span>${chip('v' + n.v)}</div>`).join('')}</div>`;
}

// ── 시트·대화상자·토스트 ──
// 연 단추를 기억했다가 닫을 때 그 단추로 초점을 돌려준다. 열려 있는 동안 Tab 은 안에서만 돈다.
function openOverlay() {
  const a = document.activeElement && document.activeElement.closest ? document.activeElement.closest('[data-act]') : null;
  // 풀기 더보기 시트 안 단추에서 연 창은, 닫으면 「더보기」 단추로 돌아간다(시트는 이미 닫힘)
  const viaMore = a && ['restart', 'checkboard', 'fillnotes'].includes(a.dataset.act);
  APP.opener = viaMore ? { act: 'playmore' } : a ? { act: a.dataset.act, arg: a.dataset.arg } : null;
  APP.overlayFresh = true;
}
function closeOverlay() { APP.restoreFocus = APP.opener; APP.opener = null; }
const FOCUSABLE = 'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"]):not(use)';
function overlayEl() { return appRoot.querySelector('.dialog') || appRoot.querySelector('.sheet'); }
function trapTab(e) {
  const box = overlayEl();
  if (!box) return;
  const list = [...box.querySelectorAll(FOCUSABLE)];
  if (!list.length) return;
  const i = list.indexOf(document.activeElement);
  e.preventDefault();
  const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i < 0 || i === list.length - 1 ? 0 : i + 1);
  list[next].focus();
}
function focusAfterRender() {
  if (APP.restoreFocus && (APP.dialog || APP.sheet)) {
    const r = APP.restoreFocus;
    const el = appRoot.querySelector(`[data-act="${r.act}"]${r.arg !== undefined ? `[data-arg="${r.arg}"]` : ''}`);
    if (el && overlayEl() && overlayEl().contains(el)) { APP.restoreFocus = null; el.focus({ preventScroll: true }); return true; }
  }
  const box = overlayEl();
  if (box) {
    if (APP.overlayFresh || !box.contains(document.activeElement)) {
      const first = box.querySelector('.field[name="name"]') && APP.formError ? box.querySelector('.field[name="name"]') : box.querySelector(FOCUSABLE);
      if (first) first.focus({ preventScroll: true });
    }
    APP.overlayFresh = false;
    return true;
  }
  if (APP.restoreFocus) {
    const r = APP.restoreFocus;
    APP.restoreFocus = null;
    const sel = `[data-act="${r.act}"]${r.arg !== undefined ? `[data-arg="${r.arg}"]` : ''}`;
    const el = appRoot.querySelector(sel) || appRoot.querySelector(`[data-act="${r.act}"]`);
    if (el) { el.focus({ preventScroll: true }); return true; }
  }
  return false;
}
function overlayHtml() {
  let h = '';
  if (APP.sheet) h += `<div class="scrim" data-act="closesheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${uiEsc(APP.sheet.label)}"><div class="handle"></div>${APP.sheet.html()}</div>`;
  if (APP.dialog) h += `<div class="scrim" data-act="closedialog"></div><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">${APP.dialog.html}</div>`;
  if (APP.toast) h += `<div class="toast-wrap"><div class="toast" role="status">${icon('check', 's20')}${uiEsc(APP.toast)}</div></div>`;
  return h;
}
let toastTimer = 0;
function toast(msg) {
  APP.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { APP.toast = null; const el = appRoot.querySelector('.toast-wrap'); if (el) el.remove(); }, 3000);
  render();
}
function profileSheet() {
  return {
    label: '프로필',
    html: () => {
      const st = APP.store, cur = st.current();
      const rows = st.profiles().map((p) => `<div class="li"><button class="grow pbtn" data-act="selectprofile" data-arg="${p.id}">${avatarOf(p)}<span class="t-body">${uiEsc(p.name)}</span>${cur && cur.id === p.id ? chip('지금', 'acc') : ''}</button><button class="btn text small del" data-act="removeprofile" data-arg="${p.id}" aria-label="${uiEsc(p.name)} 프로필 지우기">${icon('trash', 's20')}지우기</button></div>`).join('');
      const add = st.profiles().length < MAX_PROFILES ? `<form class="addp" data-form="addprofile"><input class="field" name="name" maxlength="8" placeholder="새 이름" aria-label="새 프로필 이름" aria-describedby="addp-msg" autocomplete="off"><button class="btn secondary" type="submit">더하기</button></form><p id="addp-msg" class="field-msg" role="status">${uiEsc(APP.formError || '')}</p>` : '<p class="t-small c-sub">프로필은 5명까지 만들 수 있어요.</p>';
      return `<div class="t-head">누가 풀까요</div><div class="list sheet-list">${rows}</div>${add}`;
    },
  };
}
function levelSheet() {
  return {
    label: '오늘의 퍼즐 난이도',
    html: () => {
      const cur = APP.store.level();
      const day = APP.store.dailyOf(todayKey()) || {};
      // 난이도마다 오늘 두 퍼즐을 풀었는지
      const status = (lv) => {
        const e = day[lv] || {};
        return [['sudoku', '스도쿠'], ['cats', '고양이 자리']].map(([w, name]) => e[w] === undefined ? `<span class="st">${name} 아직</span>` : `<span class="st on">${icon('check', 's16')}${name} ${e[w + 'Help'] ? '힌트와 함께' : `<span class="num">${fmtTime(e[w])}</span>`}</span>`).join('');
      };
      const row = (lv, desc) => `<button class="li choice" data-act="setlevel" data-arg="${lv}" aria-pressed="${cur === lv}"><span class="grow"><span class="t-body-b">${LEVEL_LABEL[lv]}</span><br><span class="t-small c-sub">${desc}</span><span class="lvstat t-small">${status(lv)}</span></span>${cur === lv ? icon('check', 'c-acc') : ''}</button>`;
      return `<div class="t-head">오늘의 퍼즐 난이도</div><p class="t-small c-sub">같은 난이도를 고른 가족은 같은 문제를 받아요.</p><div class="list sheet-list">${row('easy', '스도쿠 6×6 · 고양이 자리 6×6')}${row('normal', '스도쿠 9×9 · 고양이 자리 7×7')}${row('hard', '스도쿠 9×9 · 고양이 자리 8×8')}</div>`;
    },
  };
}
// 되돌릴 수 없는 일만 묻는다. 취소 단추 이름은 부르는 곳마다("계속 풀기" 등), 위험한 확인은 위험색.
function confirmDialog(title, text, okLabel, onOk, danger = false, cancelLabel = '그대로 두기') {
  const a = document.activeElement && document.activeElement.closest ? document.activeElement.closest('[data-act]') : null;
  APP.dialogOpener = a ? { act: a.dataset.act, arg: a.dataset.arg } : null;
  if (!APP.dialog && !APP.sheet) openOverlay(); else APP.overlayFresh = true;
  APP.dialog = { html: `<div class="t-head" id="dlg-t">${uiEsc(title)}</div><p class="t-body c-ink2">${uiEsc(text)}</p><div class="acts"><button class="btn secondary" data-act="closedialog">${uiEsc(cancelLabel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="dialogok">${uiEsc(okLabel)}</button></div>`, onOk };
  render();
}

// ── 누르기 처리 ──
appRoot.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act, arg = el.dataset.arg;
  if (act === 'import') return;
  const P = APP.play;
  switch (act) {
    case 'nav': APP.sheet = null; go(arg); return;
    case 'cell': APP.keepCellFocus = e.detail === 0; onBoardTap(Number(arg)); return;
    case 'profiles': openOverlay(); APP.formError = ''; APP.sheet = profileSheet(); render(); return;
    case 'level': openOverlay(); APP.sheet = levelSheet(); render(); return;
    case 'playmore': openOverlay(); APP.sheet = playMoreSheet(); render(); return;
    case 'closesheet': closeOverlay(); APP.sheet = null; render(); return;
    case 'install': doInstall(); return;
    case 'closedialog': APP.dialog = null; if (!APP.sheet) closeOverlay(); else APP.restoreFocus = APP.dialogOpener; render(); return;
    case 'dialogok': { const fn = APP.dialog && APP.dialog.onOk; APP.dialog = null; if (fn) fn(); if (!APP.sheet && !APP.dialog) closeOverlay(); render(); return; }
    case 'setlevel': APP.store.setLevel(arg); APP.sheet = null; closeOverlay(); render(); return;
    case 'selectprofile': APP.store.selectProfile(arg); APP.sheet = null; stopPlay(); go('#/'); render(); return;
    case 'removeprofile': {
      const p = APP.store.profiles().find((q) => q.id === arg);
      confirmDialog(`${p.name} 프로필을 지울까요`, '이 프로필의 차시 기록과 오늘의 퍼즐 기록이 모두 지워져요. 되돌릴 수 없어요.', '지우기', () => { APP.store.removeProfile(arg); APP.sheet = APP.store.profiles().length ? profileSheet() : null; if (!APP.store.current()) go('#/welcome'); }, true, '그대로 두기');
      return;
    }
    case 'toggle': setSetting(arg, !APP.settings[arg]); APP.glossaryHtml = null; render(); return;
    case 'set': { const [k, v] = arg.split(':'); setSetting(k, v); APP.glossaryHtml = null; render(); return; }
    case 'month': { const now = new Date(); const m = APP.month || { y: now.getFullYear(), m: now.getMonth() }; const d = new Date(m.y, m.m + Number(arg), 1); APP.month = { y: d.getFullYear(), m: d.getMonth() }; render(); return; }
    case 'export': doExport(); return;
    case 'pr-kind': APP.practice.kind = arg; APP.practice.n = arg === 'sd' ? 9 : 6; render(); return;
    case 'pr-n': APP.practice.n = Number(arg); render(); return;
    case 'pr-level': APP.practice.level = arg; render(); return;
    case 'freestart': case 'freeagain': {
      APP.making = true; render();
      setTimeout(() => { APP.making = false; startFree(); }, 30);
      return;
    }
    case 'quit': confirmDialog('차시를 그만둘까요', '지금까지 푼 걸음은 저장되지 않아요. 다음에 처음부터 다시 해요.', '그만두기', () => { const id = APP.lesson.path.id; stopPlay(); go('#/path/' + id); }, true, '계속 풀기'); return;
    case 'next': if (APP.lesson) lessonNext(); return;
    default: break;
  }
  if (!P) return;
  const g = P.g;
  switch (act) {
    case 'choose': {
      const k = Number(arg), x = P.x;
      P.chosen = k;
      if (k === x.answer.choice) lessonCorrect(x.explain); else lessonMistake('다시 해 봐요', x.t === 'count' ? '가로줄, 세로줄, 상자에 이미 있는 숫자를 지우고 남은 것을 세어 봐요.' : x.explain);
      render(); return;
    }
    case 'dismiss': P.feedback = null; P.chosen = null; render(); return;
    case 'digit': onDigit(Number(arg)); return;
    case 'erase': if (g.kind === 'sd' ? sdErase(g) : ctClearCell(g, g.sel)) afterMove(); else render(); return;
    case 'memo': g.memo = !g.memo; render(); return;
    case 'undo': if (gameUndo(g)) onGameChanged(); return;
    case 'fillnotes': APP.sheet = null; closeOverlay(); sdFillNotes(g); P.hint = null; onGameChanged(); return;
    case 'restart': APP.sheet = null; confirmDialog('처음부터 다시 할까요', '놓은 수와 표시가 모두 지워져요.', '처음부터', () => {
      const fresh = newGame(g.kind === 'sd' ? { kind: 'sd', n: g.n, puzzle: g.puzzle, solution: g.solution, values: P.x && P.x.values ? P.x.values : g.puzzle, notes: P.x && P.x.notes } : { kind: 'ct', n: g.n, region: g.region, solution: g.solution, cats: g.given }, { mode: g.mode, challenge: g.hearts !== null });
      fresh.elapsed = g.elapsed; fresh.hints = g.hints; fresh.mistakes = g.mistakes; fresh.guidedLeft = g.guidedLeft;
      P.g = fresh; P.hint = null; P.feedback = null; P.showWrong = false;
      if (P.ctx !== 'lesson') APP.store.saveProgress(P.ctx === 'daily' ? P.key : 'free', gameSave(fresh));
    }, true, '계속 풀기'); return;
    case 'continuenohearts': g.hearts = null; render(); return;
    case 'checkboard': {
      if (APP.sheet) { APP.sheet = null; closeOverlay(); }
      const wrong = g.kind === 'sd' ? sdWrongCells(g) : ctWrongCats(g);
      if (wrong.length) { P.showWrong = true; g.mistakes++; if (P.ctx === 'lesson') APP.lesson.mistakes++; toast(g.kind === 'sd' ? `다시 볼 칸이 ${wrong.length}개 있어요.` : `자리가 맞지 않는 고양이가 ${wrong.length}마리 있어요.`); }
      else toast('지금까지 놓은 것은 모두 맞아요.');
      render(); return;
    }
    case 'checkpick': {
      const x = P.x;
      if (!P.pick.length) { toast('칸을 골라요.'); return; }
      if (checkPick(x.answer, P.pick)) lessonCorrect(x.explain);
      else { const want = new Set(x.answer.cells); const miss = x.answer.cells.filter((c) => !P.pick.includes(c)).length; const extra = P.pick.filter((c) => !want.has(c)).length; lessonMistake('다시 해 봐요', `${extra ? `고르면 안 되는 칸이 ${extra}개, ` : ''}${miss ? `빠진 칸이 ${miss}개 있어요.` : '나머지는 맞아요.'}`); }
      render(); return;
    }
    case 'clearpick': P.pick = []; P.feedback = null; render(); return;
    case 'checkmemo': {
      const x = P.x;
      if (g.notes[x.answer.x] === x.answer.mask) lessonCorrect(x.explain);
      else lessonMistake('다시 해 봐요', '같은 가로줄, 세로줄, 상자에 이미 있는 숫자는 빼고, 나머지는 모두 적어요.');
      render(); return;
    }
    case 'hint': openHint(); return;
    case 'hintmore': P.hint.level++; render(); return;
    case 'hintclose': P.hint = null; render(); return;
    case 'hintapply': { const h = P.hint.data; gameApplyHint(g, h, APP.settings); if (h.kind === 'step') g.assisted = true; P.hint = null; if (g.guidedLeft > 0 && h.place) g.guidedLeft--; onGameChanged(); return; }
    case 'coachapply': { const c = P.coach; if (c) { gameApplyHint(g, c, APP.settings); } onGameChanged(); return; }
    default: break;
  }
});
appRoot.addEventListener('change', (e) => {
  if (e.target.dataset.act !== 'import') return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    confirmDialog('기록을 바꿀까요', '이 기기의 기록이 파일의 기록으로 바뀌어요. 지금 기록은 되돌릴 수 없어요.', '바꾸기', () => {
      const r = APP.store.importBackup(String(reader.result));
      const msg = { format: '기록 파일이 아니에요.', app: '퍼즐 놀이터의 기록 파일이 아니에요.', profiles: '파일 안의 프로필 자료가 망가져 있어요.', 'too-many': '프로필이 5명보다 많아요.' };
      toast(r.ok ? `프로필 ${r.count}명의 기록을 가져왔어요.` : msg[r.error] || '가져오지 못했어요.');
    });
  };
  reader.readAsText(file);
  e.target.value = '';
});
appRoot.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  let name = form.querySelector('input[name="name"]').value;
  // 첫 시작은 이름을 비워도 된다(「나」 프로필)
  if (form.dataset.form === 'welcome' && !cleanName(name)) name = '나';
  const r = APP.store.addProfile(name);
  if (r.error) { APP.formError = { empty: '이름을 적어 주세요.', full: '프로필은 5명까지예요.', duplicate: '같은 이름이 이미 있어요. 다른 이름을 적어 주세요.' }[r.error]; render(); return; }
  APP.formError = '';
  if (form.dataset.form === 'welcome') { APP.settings = saveSettings(uiStorage, { ...APP.settings, seen: APP_VERSION }); go('#/'); return; }
  APP.sheet = null; stopPlay(); go('#/'); render();
});
document.addEventListener('keydown', onKey);
window.addEventListener('hashchange', route);
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (APP.settings.theme === 'auto') applyTheme(); });

function doExport() {
  const data = JSON.stringify(APP.store.exportBackup(), null, 1);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `퍼즐놀이터_기록_${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('기록 파일을 내려받았어요.');
}

// 시간: 화면이 보일 때만 센다
setInterval(() => {
  const P = APP.play;
  if (!P || !P.g || P.g.done || P.result || document.visibilityState !== 'visible' || APP.dialog) return;
  if (P.ctx === 'lesson') return;
  P.g.elapsed++;
  const el = appRoot.querySelector('[data-timer]');
  if (el) el.textContent = fmtTime(P.g.elapsed);
  if (P.g.elapsed % 10 === 0) APP.store.saveProgress(P.ctx === 'daily' ? P.key : 'free', gameSave(P.g));
}, 1000);

// 시작
applyTheme();
APP.store.pruneProgress(todayKey());
if (shouldShowNews(APP.settings, APP.store.profiles().length > 0)) {
  APP.dialog = { html: `<div class="t-head">새로 생긴 것</div>${newsList(newsSince(APP.settings.seen))}<div class="acts"><button class="btn primary" data-act="dialogok">좋아요</button></div>`, onOk: () => setSetting('seen', APP_VERSION) };
} else if (!APP.store.profiles().length) APP.settings = saveSettings(uiStorage, { ...APP.settings, seen: APP_VERSION });
// 화면 점검·생성 시간 측정용(앱 동작에는 쓰지 않음)
window.__puzzleGuide = { APP, INSTALL, version: APP_VERSION, gen: { practiceCats, practiceSudoku, dailyPuzzles } };
route();
