// 스도쿠 실현 가능성 검증 (0단계, 앱 코드 아님)
// 1) 유일해 퍼즐 생성 시간  2) 사람 기법 기반 난이도 분포  3) 원하는 난이도를 얻기까지 몇 번 만들어야 하는지
// 실행: node tools/feasibility/sudoku.mjs [시행 수]
import os from 'node:os';
import { makeRng, shuffle, stats } from './rng.mjs';

export function makeShape(n) {
  const [br, bc] = n === 4 ? [2, 2] : n === 6 ? [2, 3] : n === 9 ? [3, 3] : null;
  const units = [];
  for (let r = 0; r < n; r++) units.push({ kind: 'row', i: r, cells: [...Array(n)].map((_, c) => r * n + c) });
  for (let c = 0; c < n; c++) units.push({ kind: 'col', i: c, cells: [...Array(n)].map((_, r) => r * n + c) });
  for (let b = 0; b < n; b++) {
    const r0 = Math.floor(b / (n / bc)) * br;
    const c0 = (b % (n / bc)) * bc;
    const cells = [];
    for (let r = 0; r < br; r++) for (let c = 0; c < bc; c++) cells.push((r0 + r) * n + c0 + c);
    units.push({ kind: 'box', i: b, cells });
  }
  const boxOf = new Array(n * n);
  units.filter((u) => u.kind === 'box').forEach((u) => u.cells.forEach((x) => (boxOf[x] = u.i)));
  const peers = [...Array(n * n)].map(() => new Set());
  for (const u of units) for (const a of u.cells) for (const b of u.cells) if (a !== b) peers[a].add(b);
  return { n, br, bc, units, boxOf, peers: peers.map((s) => [...s]), all: (1 << n) - 1 };
}

const popcount = (m) => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
const bitDigit = (m) => 31 - Math.clz32(m) + 1; // 한 비트만 있을 때 숫자(1부터)

// 해의 개수를 limit까지 센다 (비트마스크 + 후보가 가장 적은 칸부터)
export function countSolutions(shape, grid, limit = 2, rand = null, out = null) {
  const { n, boxOf, all } = shape;
  const rowM = new Array(n).fill(0), colM = new Array(n).fill(0), boxM = new Array(n).fill(0);
  const g = grid.slice();
  for (let x = 0; x < n * n; x++) if (g[x]) {
    const b = 1 << (g[x] - 1), r = Math.floor(x / n), c = x % n;
    if ((rowM[r] | colM[c] | boxM[boxOf[x]]) & b) return 0;
    rowM[r] |= b; colM[c] |= b; boxM[boxOf[x]] |= b;
  }
  let count = 0;
  function rec() {
    let best = -1, bestMask = 0, bestK = 99;
    for (let x = 0; x < n * n; x++) if (!g[x]) {
      const m = all & ~(rowM[Math.floor(x / n)] | colM[x % n] | boxM[boxOf[x]]);
      const k = popcount(m);
      if (k < bestK) { bestK = k; best = x; bestMask = m; if (k <= 1) break; }
    }
    if (best < 0) { count++; if (out && !out.length) out.push(g.slice()); return count >= limit; }
    if (bestK === 0) return false;
    const digits = [];
    for (let d = 1; d <= n; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
    if (rand) shuffle(digits, rand);
    const r = Math.floor(best / n), c = best % n, bx = boxOf[best];
    for (const d of digits) {
      const b = 1 << (d - 1);
      g[best] = d; rowM[r] |= b; colM[c] |= b; boxM[bx] |= b;
      if (rec()) return true;
      g[best] = 0; rowM[r] &= ~b; colM[c] &= ~b; boxM[bx] &= ~b;
    }
    return false;
  }
  rec();
  return count;
}

export function generate(shape, rand) {
  const n = shape.n;
  const out = [];
  countSolutions(shape, new Array(n * n).fill(0), 1, rand, out);
  const solution = out[0];
  const puzzle = solution.slice();
  const order = shuffle([...Array(n * n).keys()], rand);
  for (const x of order) {
    const keep = puzzle[x];
    puzzle[x] = 0;
    if (countSolutions(shape, puzzle, 2) !== 1) puzzle[x] = keep;
  }
  return { puzzle, solution };
}

// ── 사람 기법 풀이기: 쉬운 기법부터 시도하고, 쓴 기법 중 가장 어려운 것을 난이도로 본다 ──
export const TECHNIQUES = [
  'full-house',     // 1 줄·상자에 빈칸이 하나만 남음
  'hidden-single',  // 2 이 숫자가 들어갈 곳이 줄·상자 안에 한 곳뿐
  'naked-single',   // 3 이 칸에 들어갈 숫자가 하나뿐
  'locked',         // 4 상자 안에서 한 줄에 몰림(가리키기·차지하기)
  'naked-pair',     // 5 두 칸이 같은 두 숫자만 가짐
  'hidden-pair',    // 6 두 숫자가 같은 두 칸에만 들어감
  'naked-triple',   // 7
  'hidden-triple',  // 8
  'x-wing',         // 9
];

function combos(arr, k, start = 0, acc = [], res = []) {
  if (acc.length === k) { res.push(acc.slice()); return res; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, k, i + 1, acc, res); acc.pop(); }
  return res;
}

export function gradeLogically(shape, puzzle) {
  const { n, units, peers, all } = shape;
  const val = puzzle.slice();
  const cand = new Array(n * n).fill(all);
  const used = [];
  const place = (x, d) => {
    val[x] = d; cand[x] = 0;
    for (const p of peers[x]) cand[p] &= ~(1 << (d - 1));
  };
  for (let x = 0; x < n * n; x++) if (val[x]) { const d = val[x]; val[x] = 0; place(x, d); }
  const empties = (u) => u.cells.filter((x) => !val[x]);

  const steps = [
    // full house
    () => { for (const u of units) { const e = empties(u); if (e.length === 1 && cand[e[0]]) { place(e[0], bitDigit(cand[e[0]])); return true; } } return false; },
    // hidden single
    () => { for (const u of units) for (let d = 1; d <= n; d++) {
      const b = 1 << (d - 1); if (u.cells.some((x) => val[x] === d)) continue;
      const where = u.cells.filter((x) => cand[x] & b);
      if (where.length === 1) { place(where[0], d); return true; }
    } return false; },
    // naked single
    () => { for (let x = 0; x < n * n; x++) if (!val[x] && popcount(cand[x]) === 1) { place(x, bitDigit(cand[x])); return true; } return false; },
    // locked candidates (pointing + claiming)
    () => { let prog = false;
      const boxes = units.filter((u) => u.kind === 'box'), lines = units.filter((u) => u.kind !== 'box');
      for (const bx of boxes) for (const ln of lines) {
        const inter = bx.cells.filter((x) => ln.cells.includes(x)); if (!inter.length) continue;
        for (let d = 1; d <= n; d++) { const b = 1 << (d - 1);
          const inBox = bx.cells.filter((x) => cand[x] & b), inLine = ln.cells.filter((x) => cand[x] & b);
          if (inBox.length && inBox.every((x) => inter.includes(x))) for (const x of inLine) if (!inter.includes(x)) { cand[x] &= ~b; prog = true; }
          if (inLine.length && inLine.every((x) => inter.includes(x))) for (const x of inBox) if (!inter.includes(x)) { cand[x] &= ~b; prog = true; }
          if (prog) return true;
        } }
      return false; },
    ...[2, 3].flatMap((k) => [
      // naked subset k
      () => { for (const u of units) { const e = empties(u).filter((x) => popcount(cand[x]) <= k);
        for (const cs of combos(e, k)) { const m = cs.reduce((a, x) => a | cand[x], 0); if (popcount(m) !== k) continue;
          let prog = false; for (const x of empties(u)) if (!cs.includes(x) && (cand[x] & m)) { cand[x] &= ~m; prog = true; }
          if (prog) return true; } } return false; },
      // hidden subset k
      () => { for (const u of units) { const e = empties(u);
        const digits = []; for (let d = 1; d <= n; d++) if (!u.cells.some((x) => val[x] === d)) digits.push(d);
        for (const ds of combos(digits, k)) { const m = ds.reduce((a, d) => a | (1 << (d - 1)), 0);
          const where = e.filter((x) => cand[x] & m); if (where.length !== k) continue;
          if (!ds.every((d) => where.some((x) => cand[x] & (1 << (d - 1))))) continue;
          let prog = false; for (const x of where) if (cand[x] & ~m) { cand[x] &= m; prog = true; }
          if (prog) return true; } } return false; },
    ]),
    // x-wing
    () => { for (const [a, bKind] of [['row', 'col'], ['col', 'row']]) {
      const lines = units.filter((u) => u.kind === a), cross = units.filter((u) => u.kind === bKind);
      for (let d = 1; d <= n; d++) { const b = 1 << (d - 1);
        const pos = lines.map((u) => u.cells.map((x, j) => (cand[x] & b ? j : -1)).filter((j) => j >= 0));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          if (pos[i].length !== 2 || pos[j].length !== 2 || pos[i][0] !== pos[j][0] || pos[i][1] !== pos[j][1]) continue;
          let prog = false;
          for (const cj of pos[i]) for (const x of cross[cj].cells) if (!lines[i].cells.includes(x) && !lines[j].cells.includes(x) && (cand[x] & b)) { cand[x] &= ~b; prog = true; }
          if (prog) return true;
        } } }
      return false; },
  ];
  // 순서: full-house, hidden-single, naked-single, locked, naked-pair, hidden-pair, naked-triple, hidden-triple, x-wing
  let hardest = -1, stepCount = 0;
  const counts = new Array(TECHNIQUES.length).fill(0);
  while (val.some((v) => !v)) {
    let done = false;
    for (let t = 0; t < steps.length; t++) if (steps[t]()) { counts[t]++; stepCount++; hardest = Math.max(hardest, t); done = true; break; }
    if (!done) return { solved: false, hardest: TECHNIQUES.length, counts, stepCount };
  }
  return { solved: true, hardest, counts, stepCount };
}

// 단계 맞춤 생성: 지우기 전에 "유일해 + 이 기법까지만으로 풀림"을 둘 다 확인한다.
// maxTech 이하로만 풀리는 퍼즐이 나온다(입문 단원은 그 단원에서 배운 기법까지만 쓰게).
export function generateUpTo(shape, rand, maxTech, minGivens = 0) {
  const n = shape.n;
  const out = [];
  countSolutions(shape, new Array(n * n).fill(0), 1, rand, out);
  const solution = out[0];
  const puzzle = solution.slice();
  const order = shuffle([...Array(n * n).keys()], rand);
  let givens = n * n;
  for (const x of order) {
    if (givens <= minGivens) break;
    const keep = puzzle[x];
    puzzle[x] = 0;
    const ok = countSolutions(shape, puzzle, 2) === 1 && gradeLogically(shape, puzzle).hardest <= maxTech;
    if (ok) givens--; else puzzle[x] = keep;
  }
  return { puzzle, solution, grade: gradeLogically(shape, puzzle) };
}

// ── 실행 ──
if (process.argv[1] && process.argv[1].endsWith('sudoku.mjs')) {
  const trials = Number(process.argv[2] || 200);
  const rand = makeRng(20261114);
  console.log(`Node ${process.version}, CPU ${os.cpus()[0]?.model || '알 수 없음'}, 시행 ${trials}회(크기마다), 씨앗 20261114`);
  for (const n of [4, 6, 9]) {
    const shape = makeShape(n);
    const genMs = [], clues = [], gradeMs = [];
    const hist = new Array(TECHNIQUES.length + 1).fill(0);
    let uniqueOk = 0;
    for (let i = 0; i < trials; i++) {
      const t0 = performance.now();
      const { puzzle, solution } = generate(shape, rand);
      const t1 = performance.now();
      genMs.push(t1 - t0);
      clues.push(puzzle.filter(Boolean).length);
      if (countSolutions(shape, puzzle, 3) === 1) uniqueOk++;
      const g0 = performance.now();
      const gr = gradeLogically(shape, puzzle);
      gradeMs.push(performance.now() - g0);
      hist[gr.hardest]++;
      void solution;
    }
    const f = (o) => `중앙 ${o.median.toFixed(2)} / 95% ${o.p95.toFixed(2)} / 최대 ${o.max.toFixed(2)}`;
    console.log(`\n[${n}x${n}] 유일해 확인 ${uniqueOk}/${trials}`);
    console.log(`  생성 시간(ms): ${f(stats(genMs))}`);
    console.log(`  난이도 판정 시간(ms): ${f(stats(gradeMs))}`);
    const cs = stats(clues);
    console.log(`  주어진 수 개수: 최소 ${cs.min}, 중앙 ${cs.median}, 최대 ${cs.max}`);
    console.log('  가장 어려운 기법 분포: ' + hist.map((k, t) => (k ? `${TECHNIQUES[t] || '기법 밖(막힘)'} ${k}` : '')).filter(Boolean).join(', '));
  }

  console.log('\n[단계 맞춤 생성] 지울 때마다 유일해 + 기법 상한을 확인');
  const plans = [
    [4, 0, 0], [4, 1, 0], [6, 0, 0], [6, 1, 0], [6, 2, 0],
    [9, 1, 0], [9, 2, 0], [9, 3, 0], [9, 4, 0], [9, 5, 0], [9, 8, 0],
  ];
  for (const [n, maxTech, minGivens] of plans) {
    const shape = makeShape(n);
    const ms = [], givens = [], exact = [];
    const k = Math.max(20, Math.floor(trials / 4));
    for (let i = 0; i < k; i++) {
      const t0 = performance.now();
      const r = generateUpTo(shape, rand, maxTech, minGivens);
      ms.push(performance.now() - t0);
      givens.push(r.puzzle.filter(Boolean).length);
      exact.push(r.grade.hardest === maxTech ? 1 : 0);
    }
    const s = stats(ms), g = stats(givens);
    console.log(`  ${n}x${n} 상한 ${TECHNIQUES[maxTech]}: ${k}개, 시간(ms) 중앙 ${s.median.toFixed(1)} / 95% ${s.p95.toFixed(1)} / 최대 ${s.max.toFixed(1)}, 주어진 수 중앙 ${g.median}(${g.min}~${g.max}), 상한 기법이 실제로 필요한 것 ${exact.reduce((a, b) => a + b, 0)}/${k}`);
  }
}
