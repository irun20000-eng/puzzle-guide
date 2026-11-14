// 씨앗(seed)이 같으면 같은 수열이 나오는 작은 난수기 (mulberry32).
// "오늘의 퍼즐"을 날짜 씨앗으로 기기마다 똑같이 만들 수 있는지 보려고 쓴다.
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

export function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function seedFromDate(yyyyMmDd, salt = 0) {
  // "2026-11-14" → 정수. 같은 날짜면 어느 기기에서나 같은 씨앗.
  let h = 2166136261 ^ salt;
  for (const ch of yyyyMmDd) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function stats(nums) {
  const s = [...nums].sort((x, y) => x - y);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, min: s[0], median: q(0.5), p95: q(0.95), max: s[s.length - 1], mean };
}
