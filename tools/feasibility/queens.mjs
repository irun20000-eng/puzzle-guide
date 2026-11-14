// 고양이 자리 퍼즐(퀸즈/스타 배틀 1개형) 실현 가능성 검증 (0단계, 앱 코드 아님)
// 규칙: N×N 판, N개 구역. 줄(가로)·칸(세로)·구역마다 정확히 하나, 서로 8방향으로 닿지 않음.
// 1) 구역 나누기 + 유일해 생성 시간·성공률  2) 사람 기법 기반 난이도 분포  3) 힌트 설명 문장 예시
// 실행: node tools/feasibility/queens.mjs [시행 수]
import os from 'node:os';
import { makeRng, shuffle, stats, seedFromDate } from './rng.mjs';

const near = (n, a, b) => Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1 && Math.abs((a % n) - (b % n)) <= 1;

// 해의 개수를 limit까지 센다. region[x] < 0 인 칸(아직 구역 없음)에는 놓을 수 없다.
export function countSolutions(n, region, limit = 2) {
  const usedCol = new Array(n).fill(false), usedReg = new Array(n).fill(false);
  let count = 0, prev = -9;
  function rec(r) {
    if (r === n) { count++; return count >= limit; }
    for (let c = 0; c < n; c++) {
      if (usedCol[c] || Math.abs(c - prev) <= 1) continue;
      const g = region[r * n + c];
      if (g < 0 || usedReg[g]) continue;
      usedCol[c] = usedReg[g] = true; const keep = prev; prev = c;
      if (rec(r + 1)) return true;
      usedCol[c] = usedReg[g] = false; prev = keep;
    }
    return false;
  }
  rec(0);
  return count;
}

function randomPlacement(n, rand) {
  const cols = []; const used = new Array(n).fill(false);
  function rec(r) {
    if (r === n) return true;
    for (const c of shuffle([...Array(n).keys()], rand)) {
      if (used[c] || (r && Math.abs(c - cols[r - 1]) <= 1)) continue;
      used[c] = true; cols.push(c);
      if (rec(r + 1)) return true;
      used[c] = false; cols.pop();
    }
    return false;
  }
  return rec(0) ? cols : null;
}

// 생성: 고양이 자리를 먼저 정하고, 각 고양이 칸에서 구역을 키운다.
// 한 칸을 구역에 붙일 때마다 "아직 해가 하나뿐인가"를 확인한다.
// 칸을 붙이면 놓을 수 있는 자리가 늘기만 하므로, 중간에 해가 둘이 되면 끝까지 둘 이상이다(그래서 그 붙이기는 버린다).
export function generate(n, rand, opts = {}) {
  const maxRestarts = opts.maxRestarts ?? 200;
  for (let restart = 0; restart < maxRestarts; restart++) {
    const cols = randomPlacement(n, rand);
    const region = new Array(n * n).fill(-1);
    cols.forEach((c, r) => (region[r * n + c] = r));
    let left = n * n - n;
    let stuck = false;
    while (left > 0 && !stuck) {
      const frontier = [];
      for (let x = 0; x < n * n; x++) if (region[x] < 0) {
        const r = Math.floor(x / n), c = x % n;
        const regs = new Set();
        if (r > 0 && region[x - n] >= 0) regs.add(region[x - n]);
        if (r < n - 1 && region[x + n] >= 0) regs.add(region[x + n]);
        if (c > 0 && region[x - 1] >= 0) regs.add(region[x - 1]);
        if (c < n - 1 && region[x + 1] >= 0) regs.add(region[x + 1]);
        if (regs.size) frontier.push([x, [...regs]]);
      }
      shuffle(frontier, rand);
      let placed = false;
      if (opts.balance) {
        // 작은 구역부터 키운다(조금 흔들어서). 한 칸짜리 구역이 덜 남는다.
        const size = new Array(n).fill(0); region.forEach((g) => g >= 0 && size[g]++);
        const pairs = frontier.flatMap(([x, regs]) => regs.map((g) => [x, g, size[g] + rand() * opts.balance]));
        pairs.sort((p, q) => p[2] - q[2]);
        for (const [x, g] of pairs) {
          region[x] = g;
          if (countSolutions(n, region, 2) === 1) { placed = true; break; }
          region[x] = -1;
        }
      } else for (const [x, regs] of frontier) {
        for (const g of shuffle(regs, rand)) {
          region[x] = g;
          if (countSolutions(n, region, 2) === 1) { placed = true; break; }
          region[x] = -1;
        }
        if (placed) break;
      }
      if (placed) left--; else stuck = true;
    }
    if (!stuck) return { region, solution: cols, restarts: restart };
  }
  return null;
}

// ── 사람 기법 풀이기 ──
export const TECHNIQUES = [
  'last-spot',     // 1 줄·칸·구역에 놓을 수 있는 자리가 하나뿐 → 놓는다 (놓으면 줄·칸·구역·이웃 8칸을 지운다)
  'one-line',      // 2 구역이 한 줄(또는 한 칸)에 갇힘 → 그 줄의 다른 구역 자리를 지운다. 거꾸로, 한 줄의 자리가 한 구역에만 있으면 그 구역의 나머지를 지운다
  'blocks-all',    // 3 여기 두면 어떤 줄·칸·구역의 자리가 모두 막힘 → 이 칸은 안 된다 (이웃 모두가 닿는 칸, 두 칸 짝 지우기)
  'k-lines',       // 4 구역 k개가 줄 k개 안에 모두 있음 → 그 줄들의 다른 구역 자리를 지운다 (k = 2, 3, …)
  'what-if',       // 5 가정해 보기: 여기 두면 몇 단계 뒤 어떤 구역에 자리가 없어짐 → 이 칸은 안 된다
];

export function makeState(n, region) {
  const units = [];
  for (let r = 0; r < n; r++) units.push({ kind: 'row', i: r, cells: [...Array(n)].map((_, c) => r * n + c) });
  for (let c = 0; c < n; c++) units.push({ kind: 'col', i: c, cells: [...Array(n)].map((_, r) => r * n + c) });
  for (let g = 0; g < n; g++) units.push({ kind: 'reg', i: g, cells: region.map((v, x) => (v === g ? x : -1)).filter((x) => x >= 0) });
  return { n, region, units, cand: new Array(n * n).fill(true), cat: new Array(n * n).fill(false) };
}

function cloneState(s) { return { ...s, cand: s.cand.slice(), cat: s.cat.slice() }; }
const name = (n, x) => `${Math.floor(x / n) + 1}줄 ${(x % n) + 1}칸`;
const unitName = (u) => (u.kind === 'row' ? `${u.i + 1}번째 가로줄` : u.kind === 'col' ? `${u.i + 1}번째 세로줄` : `${u.i + 1}번 구역`);

function placeCat(s, x) {
  const { n } = s; s.cat[x] = true; s.cand[x] = false;
  for (let y = 0; y < n * n; y++) {
    if (y === x) continue;
    if (Math.floor(y / n) === Math.floor(x / n) || y % n === x % n || s.region[y] === s.region[x] || near(n, x, y)) s.cand[y] = false;
  }
}
const hasCat = (s, u) => u.cells.some((x) => s.cat[x]);
const candsOf = (s, u) => u.cells.filter((x) => s.cand[x]);
const contradiction = (s) => s.units.some((u) => !hasCat(s, u) && candsOf(s, u).length === 0);
const solved = (s) => s.units.every((u) => hasCat(s, u));

function combos(arr, k, start = 0, acc = [], res = []) {
  if (acc.length === k) { res.push(acc.slice()); return res; }
  for (let i = start; i < arr.length; i++) { acc.push(arr[i]); combos(arr, k, i + 1, acc, res); acc.pop(); }
  return res;
}

// 각 기법: 진행이 있으면 { text } 를 돌려주고 상태를 바꾼다. 없으면 null.
const STEPS = [
  (s) => { for (const u of s.units) { if (hasCat(s, u)) continue; const c = candsOf(s, u);
    if (c.length === 1) { placeCat(s, c[0]); return { cell: c[0], text: `${unitName(u)}에 놓을 수 있는 곳이 ${name(s.n, c[0])} 하나뿐이에요.` }; } } return null; },
  (s) => { const { n } = s;
    for (const u of s.units) { if (hasCat(s, u)) continue; const c = candsOf(s, u); if (!c.length) continue;
      if (u.kind === 'reg') {
        for (const [kind, key] of [['row', (x) => Math.floor(x / n)], ['col', (x) => x % n]]) {
          const k0 = key(c[0]); if (!c.every((x) => key(x) === k0)) continue;
          const line = s.units.find((v) => v.kind === kind && v.i === k0);
          const kill = candsOf(s, line).filter((x) => s.region[x] !== u.i);
          if (kill.length) { kill.forEach((x) => (s.cand[x] = false)); return { cells: kill, text: `${unitName(u)}의 자리가 모두 ${unitName(line)}에 있어요. 그래서 그 줄의 다른 칸은 비워 둬요.` }; }
        }
      } else {
        const g0 = s.region[c[0]]; if (!c.every((x) => s.region[x] === g0)) continue;
        const reg = s.units.find((v) => v.kind === 'reg' && v.i === g0);
        const kill = candsOf(s, reg).filter((x) => !u.cells.includes(x));
        if (kill.length) { kill.forEach((x) => (s.cand[x] = false)); return { cells: kill, text: `${unitName(u)}에 남은 자리가 모두 ${unitName(reg)}이에요. 그래서 그 구역의 다른 칸은 비워 둬요.` }; }
      } }
    return null; },
  (s) => { for (let x = 0; x < s.n * s.n; x++) { if (!s.cand[x]) continue;
    const t = cloneState(s); placeCat(t, x);
    const u = t.units.find((v) => !hasCat(t, v) && candsOf(t, v).length === 0);
    if (u) { s.cand[x] = false; return { cells: [x], text: `${name(s.n, x)}에 두면 ${unitName(u)}에 놓을 곳이 하나도 안 남아요.` }; } }
    return null; },
  (s) => { const { n } = s;
    const open = s.units.filter((u) => u.kind === 'reg' && !hasCat(s, u));
    for (let k = 2; k < open.length; k++) for (const set of combos(open, k)) {
      for (const [kind, key] of [['row', (x) => Math.floor(x / n)], ['col', (x) => x % n]]) {
        const lines = new Set(set.flatMap((u) => candsOf(s, u).map(key)));
        if (lines.size !== k) continue;
        const regs = new Set(set.map((u) => u.i));
        const kill = [];
        for (let x = 0; x < n * n; x++) if (s.cand[x] && lines.has(key(x)) && !regs.has(s.region[x])) kill.push(x);
        if (kill.length) { kill.forEach((x) => (s.cand[x] = false));
          return { cells: kill, text: `구역 ${k}개(${[...regs].map((g) => g + 1).join(', ')}번)가 ${kind === 'row' ? '가로줄' : '세로줄'} ${k}개 안에만 있어요. 그 줄들은 이 구역들 몫이에요.` }; }
      } }
    return null; },
  (s) => { for (let x = 0; x < s.n * s.n; x++) { if (!s.cand[x]) continue;
    const t = cloneState(s); placeCat(t, x);
    let depth = 0;
    while (!contradiction(t) && !solved(t) && depth < 50) { let p = null; for (let i = 0; i < 4 && !p; i++) p = STEPS[i](t); if (!p) break; depth++; }
    if (contradiction(t)) { s.cand[x] = false; return { cells: [x], text: `${name(s.n, x)}에 두었다고 해 보면 ${depth + 1}걸음 뒤에 고양이를 둘 곳이 없는 구역이 생겨요. 그래서 여기는 아니에요.` }; } }
    return null; },
];

export function gradeLogically(n, region, { keepLog = false } = {}) {
  const s = makeState(n, region);
  let hardest = -1; const counts = new Array(STEPS.length).fill(0); const log = [];
  while (!solved(s)) {
    let step = null, t = 0;
    for (; t < STEPS.length; t++) { step = STEPS[t](s); if (step) break; }
    if (!step) return { solved: false, hardest: STEPS.length, counts, log };
    counts[t]++; hardest = Math.max(hardest, t); if (keepLog) log.push(`[${TECHNIQUES[t]}] ${step.text}`);
  }
  return { solved: true, hardest, counts, log };
}

export function show(n, region, cols) {
  const letters = 'ABCDEFGHIJKLMNOP';
  const lines = [];
  for (let r = 0; r < n; r++) lines.push([...Array(n)].map((_, c) => (cols && cols[r] === c ? '*' : letters[region[r * n + c]])).join(''));
  return lines;
}

// ── 실행 ──
if (process.argv[1] && process.argv[1].endsWith('queens.mjs')) {
  const trials = Number(process.argv[2] || 100);
  const rand = makeRng(20261114);
  console.log(`Node ${process.version}, CPU ${os.cpus()[0]?.model || '알 수 없음'}, 시행 ${trials}회(크기마다), 씨앗 20261114`);
  for (const [mode, opts] of [['그냥 키우기', {}], ['작은 구역부터 키우기', { balance: 3 }]]) {
  console.log(`\n===== 구역 키우는 방식: ${mode} =====`);
  for (const n of [4, 5, 6, 7, 8, 9, 10]) {
    const ms = [], restarts = [], sizes = [];
    const hist = new Array(TECHNIQUES.length + 1).fill(0);
    let fail = 0, uniq = 0;
    const k = n >= 10 ? Math.max(20, Math.floor(trials / 2)) : trials;
    for (let i = 0; i < k; i++) {
      const t0 = performance.now();
      const p = generate(n, rand, opts);
      ms.push(performance.now() - t0);
      if (!p) { fail++; continue; }
      restarts.push(p.restarts);
      if (countSolutions(n, p.region, 3) === 1) uniq++;
      const g = gradeLogically(n, p.region);
      hist[g.hardest]++;
      const counts = new Array(n).fill(0); p.region.forEach((g2) => counts[g2]++); sizes.push(Math.min(...counts));
    }
    const s = stats(ms), rs = stats(restarts), mins = stats(sizes);
    console.log(`\n[${n}x${n}] ${k}개 중 실패 ${fail}, 유일해 확인 ${uniq}/${k - fail}`);
    console.log(`  생성 시간(ms): 중앙 ${s.median.toFixed(2)} / 95% ${s.p95.toFixed(2)} / 최대 ${s.max.toFixed(2)}, 다시 시작 중앙 ${rs.median} 최대 ${rs.max}`);
    console.log(`  가장 작은 구역 칸 수: 중앙 ${mins.median} (${mins.min}~${mins.max})`);
    console.log('  가장 어려운 기법 분포: ' + hist.map((c, t) => (c ? `${TECHNIQUES[t] || '기법 밖(막힘)'} ${c}` : '')).filter(Boolean).join(', '));
  }
  }
  // 날짜 씨앗으로 같은 퍼즐이 나오는지, 힌트 설명 예시
  const a = generate(7, makeRng(seedFromDate('2026-11-14', 7)), { balance: 3 }), b = generate(7, makeRng(seedFromDate('2026-11-14', 7)), { balance: 3 });
  console.log(`\n날짜 씨앗 2026-11-14로 두 번 만든 7x7이 같은가: ${JSON.stringify(a.region) === JSON.stringify(b.region)}`);
  console.log('판(글자 = 구역, * = 정답 고양이 자리):\n  ' + show(7, a.region, a.solution).join('\n  '));
  const g = gradeLogically(7, a.region, { keepLog: true });
  console.log(`풀이 단계 ${g.log.length}개, 가장 어려운 기법 ${TECHNIQUES[g.hardest]}. 힌트 문장 앞 8개:`);
  g.log.slice(0, 8).forEach((l) => console.log('  ' + l));
}
