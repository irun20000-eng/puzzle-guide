// 미리 만든 문제 묶음의 조건. tools/make-packs.mjs 가 이 조건으로 만들고, tests/packs.test.mjs 가 다시 확인한다.
// 앱에는 들어가지 않는다(build.mjs 목록에 없음).
// mode: 'logic' = 지울 때마다 "기법 상한까지만으로 풀림"을 확인 / 'scan' = 유일해만 확인하며 지운 뒤 기법으로 골라냄(드문 기법용)
// needs: 풀이 길 위에서 이 기법을 쓸 수 있는 상태가 있어야 함(차시 '걸음' 문제용)
export const RECIPES = [
  // 스도쿠
  { id: 's4-fh', kind: 'sd', n: 4, count: 6, seed: 401, mode: 'logic', maxTech: 'full-house', needs: [{ tech: 'full-house', match: { unitKind: 'box' } }] },
  { id: 's4-hb', kind: 'sd', n: 4, count: 6, seed: 402, mode: 'logic', maxTech: 'hidden-single-box', minTech: 'hidden-single-box' },
  { id: 's4-hl', kind: 'sd', n: 4, count: 10, seed: 403, mode: 'logic', maxTech: 'hidden-single-line', needs: [{ tech: 'hidden-single-line' }] },
  { id: 's6-hs', kind: 'sd', n: 6, count: 7, seed: 601, mode: 'logic', maxTech: 'hidden-single-line', minTech: 'hidden-single-line', needs: [{ tech: 'hidden-single-box' }] },
  { id: 's6-ns', kind: 'sd', n: 6, count: 10, seed: 602, mode: 'logic', maxTech: 'naked-single', minTech: 'naked-single' },
  { id: 's9-hs', kind: 'sd', n: 9, count: 5, seed: 901, mode: 'logic', maxTech: 'hidden-single-line', minTech: 'hidden-single-line', needs: [{ tech: 'hidden-single-box', nth: 3 }] },
  { id: 's9-ns', kind: 'sd', n: 9, count: 7, seed: 902, mode: 'logic', maxTech: 'naked-single', minTech: 'naked-single' },
  { id: 's9-pt', kind: 'sd', n: 9, count: 5, seed: 903, mode: 'logic', maxTech: 'pointing', minTech: 'pointing' },
  { id: 's9-cl', kind: 'sd', n: 9, count: 6, seed: 904, mode: 'logic', maxTech: 'claiming', minTech: 'claiming' },
  { id: 's9-np', kind: 'sd', n: 9, count: 6, seed: 905, mode: 'logic', maxTech: 'naked-pair', minTech: 'naked-pair' },
  { id: 's9-hp', kind: 'sd', n: 9, count: 6, seed: 906, mode: 'logic', maxTech: 'hidden-pair', minTech: 'hidden-pair' },
  { id: 's9-tr', kind: 'sd', n: 9, count: 6, seed: 907, mode: 'scan', maxTech: 'hidden-triple', minTech: 'naked-triple', needs: [{ tech: 'naked-triple' }] },
  { id: 's9-xw', kind: 'sd', n: 9, count: 6, seed: 908, mode: 'scan', maxTech: 'x-wing', minTech: 'x-wing' },
  { id: 's9-mix', kind: 'sd', n: 9, count: 4, seed: 909, mode: 'scan', maxTech: 'x-wing', minTech: 'naked-pair' },
  // 고양이 자리 (balance 0 = 그냥 키우기, 3 = 작은 구역부터 키우기)
  { id: 'c4-ls', kind: 'ct', n: 4, count: 4, seed: 1401, balance: 0, maxTech: 'last-spot', needs: [{ tech: 'last-spot', nth: 1 }] },
  { id: 'c5-ls', kind: 'ct', n: 5, count: 4, seed: 1501, balance: 0, maxTech: 'last-spot' },
  { id: 'c5-ol', kind: 'ct', n: 5, count: 5, seed: 1502, balance: 0, maxTech: 'one-line', minTech: 'one-line', minRegion: 2, needs: [{ tech: 'one-line', match: { variant: 'reg-in-line' } }] },
  { id: 'c6-ol', kind: 'ct', n: 6, count: 10, seed: 1601, balance: 1, maxTech: 'one-line', minTech: 'one-line', minRegion: 2, needs: [{ tech: 'one-line', match: { variant: 'line-in-reg' } }] },
  { id: 'c6-ba', kind: 'ct', n: 6, count: 5, seed: 1602, balance: 3, maxTech: 'blocks-all', minTech: 'blocks-all', needs: [{ tech: 'blocks-all', match: { unitKind: 'reg' } }] },
  { id: 'c7-ba', kind: 'ct', n: 7, count: 10, seed: 1701, balance: 3, maxTech: 'blocks-all', minTech: 'blocks-all', needs: [{ tech: 'blocks-all', match: { unitKind: 'reg' } }, { tech: 'blocks-all', match: { unitKind: ['row', 'col'] } }] },
  { id: 'c7-kl', kind: 'ct', n: 7, count: 5, seed: 1702, balance: 3, maxTech: 'k-lines', minTech: 'k-lines', needs: [{ tech: 'k-lines', match: { k: 2 } }] },
  { id: 'c8-k3', kind: 'ct', n: 8, count: 5, seed: 1801, balance: 3, maxTech: 'k-lines', minTech: 'k-lines', needs: [{ tech: 'k-lines', match: { k: 3 } }] },
  { id: 'c8-kl', kind: 'ct', n: 8, count: 6, seed: 1802, balance: 3, maxTech: 'k-lines', minTech: 'k-lines' },
  { id: 'c8-wi', kind: 'ct', n: 8, count: 5, seed: 1803, balance: 3, maxTech: 'what-if', minTech: 'what-if', needs: [{ tech: 'what-if', easiest: true }] },
  { id: 'c9-mix', kind: 'ct', n: 9, count: 4, seed: 1901, balance: 3, maxTech: 'what-if', minTech: 'k-lines' },
  { id: 'c9-wi', kind: 'ct', n: 9, count: 2, seed: 1902, balance: 3, maxTech: 'what-if', minTech: 'what-if' },
  // 자유 연습용 큰 판 (기기에서 만들기엔 오래 걸림)
  { id: 'c9-free', kind: 'ct', n: 9, count: 10, seed: 1903, balance: 3, minRegion: 3 },
  { id: 'c10-free', kind: 'ct', n: 10, count: 6, seed: 2001, balance: 3, minRegion: 3 },
];
