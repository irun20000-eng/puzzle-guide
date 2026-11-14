// 오늘의 퍼즐과 자유 연습: 기기에서 씨앗으로 만든다. 같은 날짜·난이도면 어느 기기에서나 같은 판.
// GEN_VERSION: 생성기 판 번호. 생성기를 고쳐 같은 씨앗의 판이 달라지면 올리고, 기록(daily[날짜].gen)에 남긴다.
import { sdGenerate, sdTechIndex } from './sudoku.mjs';
import { ctGenerate, ctTechIndex } from './cats.mjs';
import { seedFromText } from './rng.mjs';

export const GEN_VERSION = 1;

export const SD_LEVELS = {
  easy: { label: '쉬움', max: sdTechIndex('naked-single'), maxTech: 'naked-single', minTech9: null },
  normal: { label: '보통', max: sdTechIndex('claiming'), maxTech: 'claiming', minTech9: 'pointing' },
  hard: { label: '어려움', max: sdTechIndex('x-wing'), maxTech: 'x-wing', minTech9: 'naked-pair' },
};
export const CT_LEVELS = {
  easy: { label: '쉬움', max: ctTechIndex('blocks-all'), maxTech: 'blocks-all', minTech: null },
  normal: { label: '보통', max: ctTechIndex('k-lines'), maxTech: 'k-lines', minTech: 'k-lines' },
  hard: { label: '어려움', max: ctTechIndex('what-if'), maxTech: 'what-if', minTech: 'what-if' },
};
// 오늘의 퍼즐 크기: 쉬움은 아이도 끝낼 수 있게 작게
export const DAILY_SIZES = { easy: { sd: 6, ct: 6 }, normal: { sd: 9, ct: 7 }, hard: { sd: 9, ct: 8 } };
export const CT_DEVICE_MAX = 8; // 기기에서 만드는 고양이 자리는 8×8까지(9×9 이상은 묶음)

export function practiceSudoku(n, level, seed) {
  const L = SD_LEVELS[level] || SD_LEVELS.easy;
  const minTech = n === 9 ? L.minTech9 : null;
  return sdGenerate(n, seed, { maxTech: L.maxTech, minTech, attempts: minTech ? 60 : 1 });
}

export function practiceCats(n, level, seed) {
  if (n > CT_DEVICE_MAX) throw new Error('9×9 이상 고양이 자리는 묶음에서 고른다');
  const L = CT_LEVELS[level] || CT_LEVELS.easy;
  // 4×4는 작은 구역부터 키우면 모두 같은 기법이 되어, 쉬움은 그냥 키우기를 섞는다
  const balance = n <= 5 && level === 'easy' ? 0 : 3;
  const min = n <= 5 ? null : L.minTech;
  return ctGenerate(n, seed, { maxTech: L.maxTech, minTech: min, balance, attempts: 80, minRegion: n >= 6 ? 2 : 0 })
    || ctGenerate(n, seed + 1, { balance: 0, attempts: 30 });
}

export function dailyPuzzles(date, level = 'easy') {
  const lv = SD_LEVELS[level] ? level : 'easy';
  const k = Object.keys(SD_LEVELS).indexOf(lv);
  const size = DAILY_SIZES[lv];
  const sudoku = practiceSudoku(size.sd, lv, seedFromText(date, 100 + k));
  const cats = practiceCats(size.ct, lv, seedFromText(date, 200 + k));
  return { date, level: lv, gen: GEN_VERSION, sudoku: { n: size.sd, ...sudoku }, cats };
}

// 기기 시간대 기준 오늘 날짜 "YYYY-MM-DD"
export function todayKey(now = new Date()) {
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
