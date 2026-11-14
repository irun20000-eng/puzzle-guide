// 기기 설정과 "새로 생긴 것" 안내. 프로필과 상관없이 기기마다 하나(바둑 첫걸음 settings 를 고쳐 씀).
export const APP_VERSION = '1.0.0';
export const SETTINGS_KEY = 'puzzle-guide:settings';
export const THEMES = ['auto', 'light', 'dark'];
export const PIECES = ['cat', 'star'];

export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'auto',       // 기기 설정을 따른다
  challenge: false,    // 도전 모드: 틀린 수를 바로 알리고 하트 3개
  timer: true,         // 시간 기록 보이기
  autoClean: true,     // 숫자를 놓으면 같은 줄·상자 메모에서 지우기
  autoX: true,         // 고양이를 놓으면 둘 수 없는 칸에 흐린 점
  pattern: true,       // 구역 무늬(색약 대비)
  piece: 'cat',        // 고양이 또는 별
  openAll: false,      // 어른용: 모든 차시 열기
  tipDots: false,      // 자동 점 안내를 한 번 보여 줬는지
  seen: '',            // "새로 생긴 것"을 마지막으로 보여 준 판
});

export const WHATS_NEW = [
  { v: '1.0.0', title: '퍼즐 놀이터를 열었어요', text: '스도쿠 18차시와 고양이 자리 14차시, 단원 미션 10개를 차례로 풀어 볼 수 있어요.' },
  { v: '1.0.0', title: '다음 한 수를 알려 주는 힌트', text: '막히면 힌트를 눌러요. 어디를 볼지, 왜 그런지, 어떻게 하는지 세 번에 나눠 알려 줘요.' },
  { v: '1.0.0', title: '오늘의 퍼즐', text: '날마다 스도쿠 하나와 고양이 자리 하나. 같은 날에는 가족 모두 같은 문제를 받아요.' },
  { v: '1.0.0', title: '기록과 달력', text: '푼 날은 달력에 표시되고, 퍼즐마다 내 최고 기록이 남아요. 기록은 파일로 옮길 수 있어요.' },
];

export function cleanSettings(s) {
  const out = { ...DEFAULT_SETTINGS };
  if (!s || typeof s !== 'object') return out;
  for (const k of ['challenge', 'timer', 'autoClean', 'autoX', 'pattern', 'openAll', 'tipDots']) if (typeof s[k] === 'boolean') out[k] = s[k];
  if (THEMES.includes(s.theme)) out.theme = s.theme;
  if (PIECES.includes(s.piece)) out.piece = s.piece;
  if (typeof s.seen === 'string' && s.seen.length <= 20) out.seen = s.seen;
  return out;
}

export function loadSettings(storage) {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return cleanSettings(raw ? JSON.parse(raw) : null);
  } catch (err) {
    return cleanSettings(null);
  }
}

export function saveSettings(storage, s) {
  const clean = cleanSettings(s);
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(clean)); } catch (err) { /* 이번 실행 동안만 */ }
  return clean;
}

export function resolveTheme(theme, prefersDark) {
  if (theme === 'light' || theme === 'dark') return theme;
  return prefersDark ? 'dark' : 'light';
}

export function compareVersion(a, b) {
  const pa = String(a || '0').split('.').map((n) => Number(n) || 0);
  const pb = String(b || '0').split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

export function newsSince(seen) {
  return WHATS_NEW.filter((n) => !seen || compareVersion(n.v, seen) > 0);
}

// 처음 쓰는 사람(프로필 없음)에게는 보여 주지 않고 본 것으로 친다.
export function shouldShowNews(settings, hasProfiles) {
  return Boolean(hasProfiles) && newsSince(settings.seen).length > 0;
}
