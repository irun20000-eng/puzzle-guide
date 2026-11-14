// 씨앗(seed)이 같으면 같은 수열이 나오는 작은 난수기 (mulberry32).
// 오늘의 퍼즐은 날짜를 씨앗으로 써서 어느 기기에서나 같은 판이 나온다.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// 글자(날짜 "2026-11-14" 등) → 정수 씨앗 (FNV-1a). salt 로 같은 날 다른 퍼즐을 나눈다.
export function seedFromText(text, salt = 0) {
  let h = (2166136261 ^ salt) >>> 0;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function combosOf(arr, k, start = 0, acc = [], res = []) {
  if (acc.length === k) { res.push(acc.slice()); return res; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combosOf(arr, k, i + 1, acc, res); acc.pop(); }
  return res;
}

// 한국어 조사: 앞말의 받침에 따라 고른다. pair 는 '을를', '이가', '은는', '과와', '으로' 등.
const DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };
export function hasBatchim(word) {
  const s = String(word).trim();
  const ch = s[s.length - 1];
  if (ch === undefined) return false;
  if (/[0-9]/.test(ch)) return DIGIT_BATCHIM[ch];
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  return false;
}
export function josa(word, pair) {
  const b = hasBatchim(word);
  if (pair === '으로') {
    const s = String(word).trim();
    const code = s.charCodeAt(s.length - 1);
    const rieul = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
    return word + (b && !rieul ? '으로' : '로');
  }
  if (pair === '이에요') return word + (b ? '이에요' : '예요');
  return word + (b ? pair[0] : pair[1]);
}
