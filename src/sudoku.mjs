// 스도쿠 엔진: 판 모양, 규칙 검사, 해 세기, 사람 기법 풀이기, 난이도, 생성기. 화면과 무관한 순수 함수.
// 판은 길이 n*n 배열(0 = 빈칸, 1..n = 숫자). 글자로는 '.'(빈칸)과 숫자.
import { makeRng, shuffleWith, combosOf, josa } from './rng.mjs';

export const SD_SIZES = [4, 6, 9];

// 기법 목록(쉬운 것부터). 풀이기는 이 순서로 시도하고, 쓴 기법 중 가장 어려운 것이 난이도다.
export const SD_TECH = [
  { id: 'full-house', name: '마지막 빈칸', en: 'Full house' },
  { id: 'hidden-single-box', name: '숨은 한 자리', en: 'Hidden single (box)' },
  { id: 'hidden-single-line', name: '숨은 한 자리', en: 'Hidden single (row/column)' },
  { id: 'naked-single', name: '하나뿐인 숫자', en: 'Naked single' },
  { id: 'pointing', name: '가리키기', en: 'Pointing' },
  { id: 'claiming', name: '차지하기', en: 'Claiming' },
  { id: 'naked-pair', name: '드러난 짝', en: 'Naked pair' },
  { id: 'hidden-pair', name: '숨은 짝', en: 'Hidden pair' },
  { id: 'naked-triple', name: '셋 묶음', en: 'Naked triple' },
  { id: 'hidden-triple', name: '숨은 셋 묶음', en: 'Hidden triple' },
  { id: 'x-wing', name: 'X-윙', en: 'X-Wing' },
];
export const SD_TECH_INDEX = Object.fromEntries(SD_TECH.map((t, i) => [t.id, i]));
export const sdTechIndex = (id) => {
  if (!(id in SD_TECH_INDEX)) throw new Error('모르는 스도쿠 기법: ' + id);
  return SD_TECH_INDEX[id];
};

const SD_SHAPES = {};
export function sdShape(n) {
  if (SD_SHAPES[n]) return SD_SHAPES[n];
  const dims = n === 4 ? [2, 2] : n === 6 ? [2, 3] : n === 9 ? [3, 3] : null;
  if (!dims) throw new Error('스도쿠 판 크기는 4, 6, 9: ' + n);
  const [br, bc] = dims;
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
  const peerSets = [...Array(n * n)].map(() => new Set());
  for (const u of units) for (const a of u.cells) for (const b of u.cells) if (a !== b) peerSets[a].add(b);
  const shape = {
    n, br, bc, units, boxOf, all: (1 << n) - 1,
    peers: peerSets.map((s) => [...s].sort((a, b) => a - b)),
    rows: units.filter((u) => u.kind === 'row'),
    cols: units.filter((u) => u.kind === 'col'),
    boxes: units.filter((u) => u.kind === 'box'),
  };
  SD_SHAPES[n] = shape;
  return shape;
}

export function sdParse(text) {
  const s = Array.isArray(text) ? text.join('') : String(text);
  const cells = [...s.replace(/\s+/g, '')].map((ch) => (ch === '.' || ch === '0' ? 0 : Number(ch)));
  const n = Math.round(Math.sqrt(cells.length));
  if (n * n !== cells.length || !SD_SIZES.includes(n) || cells.some((v) => !Number.isInteger(v) || v < 0 || v > n)) throw new Error('스도쿠 판 글자가 잘못됨: ' + s);
  return cells;
}
export const sdFormat = (grid) => grid.map((v) => (v ? String(v) : '.')).join('');
export const sdSizeOf = (grid) => Math.round(Math.sqrt(grid.length));

export const sdPopcount = (m) => { let k = 0; while (m) { m &= m - 1; k++; } return k; };
export const sdBitDigit = (m) => 32 - Math.clz32(m);
export const sdDigitsOf = (m) => { const out = []; for (let d = 1; m >> (d - 1); d++) if (m & (1 << (d - 1))) out.push(d); return out; };

// 규칙 검사: 같은 줄·상자에 같은 숫자가 겹친 칸들
export function sdConflicts(grid) {
  const shape = sdShape(sdSizeOf(grid));
  const bad = new Set();
  for (const u of shape.units) {
    const seen = new Map();
    for (const x of u.cells) if (grid[x]) {
      if (seen.has(grid[x])) { bad.add(x); bad.add(seen.get(grid[x])); } else seen.set(grid[x], x);
    }
  }
  return [...bad].sort((a, b) => a - b);
}
export const sdIsSolved = (grid) => grid.every(Boolean) && sdConflicts(grid).length === 0;

// 해 세기: limit 개에서 멈춘다. rand 를 주면 숫자 순서를 섞는다(무작위 완성판). out 에 첫 해를 담는다.
export function sdCount(grid, limit = 2, rand = null, out = null) {
  const n = sdSizeOf(grid);
  const { boxOf, all } = sdShape(n);
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
      const k = sdPopcount(m);
      if (k < bestK) { bestK = k; best = x; bestMask = m; if (k <= 1) break; }
    }
    if (best < 0) { count++; if (out && !out.length) out.push(g.slice()); return count >= limit; }
    if (bestK === 0) return false;
    const digits = sdDigitsOf(bestMask);
    if (rand) shuffleWith(digits, rand);
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

export function sdSolution(grid) {
  const out = [];
  return sdCount(grid, 2, null, out) === 1 ? out[0] : null;
}

// ── 사람 기법 풀이기 ──
// 상태: val(놓인 숫자), cand(칸마다 후보 비트). notes 를 주면 사용자의 메모를 후보로 쓴다(빈 메모 칸은 전체 후보).
export function sdState(grid, notes = null) {
  const n = sdSizeOf(grid);
  const shape = sdShape(n);
  const st = { n, shape, val: grid.slice(), cand: new Array(n * n).fill(shape.all) };
  for (let x = 0; x < n * n; x++) if (st.val[x]) st.cand[x] = 0;
  for (let x = 0; x < n * n; x++) if (st.val[x]) for (const p of shape.peers[x]) st.cand[p] &= ~(1 << (st.val[x] - 1));
  if (notes) for (let x = 0; x < n * n; x++) if (!st.val[x] && notes[x]) st.cand[x] &= notes[x];
  return st;
}
export const sdCloneState = (st) => ({ ...st, val: st.val.slice(), cand: st.cand.slice() });

export function sdApply(st, step) {
  for (const { x, d } of step.place || []) {
    st.val[x] = d; st.cand[x] = 0;
    for (const p of st.shape.peers[x]) st.cand[p] &= ~(1 << (d - 1));
  }
  for (const { x, mask } of step.elim || []) st.cand[x] &= ~mask;
  return st;
}

const sdEmpties = (st, u) => u.cells.filter((x) => !st.val[x]);
const sdUnitHas = (st, u, d) => u.cells.some((x) => st.val[x] === d);

// 각 기법은 상태를 바꾸지 않고 찾은 단계(또는 null)를 돌려준다. all=true 면 찾은 단계를 모두 돌려준다.
const SD_FINDERS = {
  'full-house'(st, all) {
    const res = [];
    for (const u of st.shape.units) {
      const e = sdEmpties(st, u);
      if (e.length !== 1) continue;
      let missing = 0;
      for (let d = 1; d <= st.n; d++) if (!sdUnitHas(st, u, d)) missing = d;
      if (!missing || !(st.cand[e[0]] & (1 << (missing - 1)))) continue;
      res.push({ tech: 'full-house', unit: u, focus: [u], place: [{ x: e[0], d: missing }], cells: [e[0]], digit: missing });
      if (!all) return res;
    }
    return res;
  },
  'hidden-single-box'(st, all) { return sdHidden(st, st.shape.boxes, 'hidden-single-box', all); },
  'hidden-single-line'(st, all) { return sdHidden(st, [...st.shape.rows, ...st.shape.cols], 'hidden-single-line', all); },
  'naked-single'(st, all) {
    const res = [];
    for (let x = 0; x < st.n * st.n; x++) if (!st.val[x] && sdPopcount(st.cand[x]) === 1) {
      const d = sdBitDigit(st.cand[x]);
      res.push({ tech: 'naked-single', cell: x, focus: [], place: [{ x, d }], cells: [x], digit: d });
      if (!all) return res;
    }
    return res;
  },
  pointing(st, all) { return sdLocked(st, true, all); },
  claiming(st, all) { return sdLocked(st, false, all); },
  'naked-pair'(st, all) { return sdNaked(st, 2, 'naked-pair', all); },
  'hidden-pair'(st, all) { return sdHiddenSubset(st, 2, 'hidden-pair', all); },
  'naked-triple'(st, all) { return sdNaked(st, 3, 'naked-triple', all); },
  'hidden-triple'(st, all) { return sdHiddenSubset(st, 3, 'hidden-triple', all); },
  'x-wing'(st, all) {
    const res = [];
    const { n, shape } = st;
    for (const [lines, cross, kind] of [[shape.rows, shape.cols, 'row'], [shape.cols, shape.rows, 'col']]) {
      for (let d = 1; d <= n; d++) {
        const b = 1 << (d - 1);
        const pos = lines.map((u) => u.cells.map((x, j) => (st.cand[x] & b ? j : -1)).filter((j) => j >= 0));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          if (pos[i].length !== 2 || pos[j].length !== 2 || pos[i][0] !== pos[j][0] || pos[i][1] !== pos[j][1]) continue;
          const corners = [lines[i].cells[pos[i][0]], lines[i].cells[pos[i][1]], lines[j].cells[pos[j][0]], lines[j].cells[pos[j][1]]];
          const elim = [];
          for (const cj of pos[i]) for (const x of cross[cj].cells) if (!corners.includes(x) && (st.cand[x] & b)) elim.push({ x, mask: b });
          if (!elim.length) continue;
          res.push({ tech: 'x-wing', kind, lines: [lines[i], lines[j]], cross: [cross[pos[i][0]], cross[pos[i][1]]], focus: [lines[i], lines[j]], cells: corners, digit: d, elim });
          if (!all) return res;
        }
      }
    }
    return res;
  },
};

function sdHidden(st, units, tech, all) {
  const res = [];
  for (const u of units) for (let d = 1; d <= st.n; d++) {
    if (sdUnitHas(st, u, d)) continue;
    const b = 1 << (d - 1);
    const where = u.cells.filter((x) => st.cand[x] & b);
    if (where.length !== 1) continue;
    if (sdEmpties(st, u).length === 1) continue; // 마지막 빈칸이 먼저
    res.push({ tech, unit: u, focus: [u], place: [{ x: where[0], d }], cells: [where[0]], digit: d });
    if (!all) return res;
  }
  return res;
}

function sdLocked(st, pointing, all) {
  const res = [];
  const { shape, n } = st;
  for (const bx of shape.boxes) for (const ln of [...shape.rows, ...shape.cols]) {
    const inter = bx.cells.filter((x) => ln.cells.includes(x));
    if (inter.length < 2) continue;
    for (let d = 1; d <= n; d++) {
      const b = 1 << (d - 1);
      const inBox = bx.cells.filter((x) => st.cand[x] & b);
      const inLine = ln.cells.filter((x) => st.cand[x] & b);
      const [from, to, src] = pointing ? [inBox, inLine, bx] : [inLine, inBox, ln];
      if (from.length < 2 || !from.every((x) => inter.includes(x))) continue;
      const elim = to.filter((x) => !inter.includes(x)).map((x) => ({ x, mask: b }));
      if (!elim.length) continue;
      res.push({ tech: pointing ? 'pointing' : 'claiming', box: bx, line: ln, unit: src, focus: [bx, ln], cells: from, digit: d, elim });
      if (!all) return res;
    }
  }
  return res;
}

function sdNaked(st, k, tech, all) {
  const res = [];
  for (const u of st.shape.units) {
    const e = sdEmpties(st, u);
    const small = e.filter((x) => { const c = sdPopcount(st.cand[x]); return c >= 2 && c <= k; });
    for (const cs of combosOf(small, k)) {
      const m = cs.reduce((a, x) => a | st.cand[x], 0);
      if (sdPopcount(m) !== k) continue;
      const elim = [];
      for (const x of e) if (!cs.includes(x) && (st.cand[x] & m)) elim.push({ x, mask: st.cand[x] & m });
      if (!elim.length) continue;
      res.push({ tech, unit: u, focus: [u], cells: cs, digits: sdDigitsOf(m), elim });
      if (!all) return res;
    }
  }
  return res;
}

function sdHiddenSubset(st, k, tech, all) {
  const res = [];
  for (const u of st.shape.units) {
    const e = sdEmpties(st, u);
    const digits = [];
    for (let d = 1; d <= st.n; d++) if (!sdUnitHas(st, u, d)) digits.push(d);
    for (const ds of combosOf(digits, k)) {
      const m = ds.reduce((a, d) => a | (1 << (d - 1)), 0);
      const where = e.filter((x) => st.cand[x] & m);
      if (where.length !== k) continue;
      if (!ds.every((d) => where.some((x) => st.cand[x] & (1 << (d - 1))))) continue;
      const elim = [];
      for (const x of where) if (st.cand[x] & ~m) elim.push({ x, mask: st.cand[x] & ~m });
      if (!elim.length) continue;
      res.push({ tech, unit: u, focus: [u], cells: where, digits: ds, elim });
      if (!all) return res;
    }
  }
  return res;
}

// 지금 상태에서 쓸 수 있는 가장 쉬운 단계. maxTech(번호) 까지만 본다.
export function sdNextStep(st, maxTech = SD_TECH.length - 1) {
  for (let t = 0; t <= maxTech; t++) {
    const found = SD_FINDERS[SD_TECH[t].id](st, false);
    if (found.length) return found[0];
  }
  return null;
}
// 특정 기법으로 찾을 수 있는 단계 모두 (차시 문제 고르기용)
export function sdFindAll(st, techId) {
  if (!SD_FINDERS[techId]) throw new Error('모르는 스도쿠 기법: ' + techId);
  return SD_FINDERS[techId](st, true);
}

// 후보가 하나도 없는 빈칸이 있으면 모순(사용자 메모가 틀렸을 때 등)
export const sdStuck = (st) => st.val.some((v, x) => !v && !st.cand[x]);

// 끝까지 풀어 본다. 기록(steps)과 가장 어려운 기법 번호(hardest)
export function sdGrade(grid, { maxTech = SD_TECH.length - 1, keepSteps = false, notes = null } = {}) {
  const st = sdState(grid, notes);
  let hardest = -1;
  const counts = new Array(SD_TECH.length).fill(0);
  const steps = [];
  while (st.val.some((v) => !v)) {
    if (sdStuck(st)) return { solved: false, hardest: SD_TECH.length, counts, steps, state: st };
    const step = sdNextStep(st, maxTech);
    if (!step) return { solved: false, hardest: SD_TECH.length, counts, steps, state: st };
    const t = SD_TECH_INDEX[step.tech];
    counts[t]++;
    if (t > hardest) hardest = t;
    if (keepSteps) steps.push(step);
    sdApply(st, step);
  }
  return { solved: true, hardest, counts, steps, state: st, stepCount: counts.reduce((a, b) => a + b, 0) };
}

// 난이도 이름: 기법 번호 → 쉬움·보통·어려움
// 쉬움: 하나뿐인 숫자까지 / 보통: 가리키기·차지하기 / 어려움: 짝·셋 묶음·X-윙
export function sdLevelOf(hardest) {
  if (hardest <= SD_TECH_INDEX['naked-single']) return 'easy';
  if (hardest <= SD_TECH_INDEX['claiming']) return 'normal';
  return 'hard';
}

// ── 생성기 ──
// 무작위 완성판 → 칸을 무작위 순서로 지우며 "해가 하나 + maxTech 까지만으로 풀림"을 확인.
function sdGenerateOnce(n, rand, maxTech, minGivens, logic = true) {
  const out = [];
  sdCount(new Array(n * n).fill(0), 1, rand, out);
  const solution = out[0];
  const puzzle = solution.slice();
  const order = shuffleWith([...Array(n * n).keys()], rand);
  let givens = n * n;
  for (const x of order) {
    if (givens <= minGivens) break;
    const keep = puzzle[x];
    puzzle[x] = 0;
    const ok = sdCount(puzzle, 2) === 1 && (!logic || sdGrade(puzzle, { maxTech }).solved);
    if (ok) givens--; else puzzle[x] = keep;
  }
  return { puzzle, solution, grade: sdGrade(puzzle) };
}

// opts: maxTech(id), minTech(id, 이 기법 이상이 꼭 필요), minGivens, attempts(최대 시도)
// 같은 씨앗이면 같은 판. minTech 를 못 맞추면 가장 어려운 판을 돌려주고 met=false.
export function sdGenerate(n, seed, opts = {}) {
  const rand = typeof seed === 'function' ? seed : makeRng(seed);
  const maxTech = opts.maxTech ? sdTechIndex(opts.maxTech) : SD_TECH.length - 1;
  const minTech = opts.minTech ? sdTechIndex(opts.minTech) : -1;
  const attempts = opts.attempts ?? 40;
  let best = null;
  for (let i = 0; i < attempts; i++) {
    const r = sdGenerateOnce(n, rand, maxTech, opts.minGivens || 0, opts.logic !== false);
    r.attempt = i;
    if (!r.grade.solved || r.grade.hardest > maxTech) continue;
    if (r.grade.hardest >= minTech) return { ...r, met: true };
    if (!best || r.grade.hardest > best.grade.hardest) best = r;
  }
  return best ? { ...best, met: false } : null;
}

// ── 같은 판 찾기: 돌리기·뒤집기·숫자 바꾸기로 같아지는 판을 하나의 글자로 ──
export function sdCanonical(grid) {
  const n = sdSizeOf(grid);
  const sq = n !== 6; // 6×6 은 상자가 2×3 이라 돌리면 상자 모양이 바뀐다
  const maps = [];
  const at = (r, c) => r * n + c;
  const tf = [
    (r, c) => at(r, c), (r, c) => at(r, n - 1 - c), (r, c) => at(n - 1 - r, c), (r, c) => at(n - 1 - r, n - 1 - c),
  ];
  if (sq) tf.push((r, c) => at(c, r), (r, c) => at(c, n - 1 - r), (r, c) => at(n - 1 - c, r), (r, c) => at(n - 1 - c, n - 1 - r));
  for (const f of tf) {
    const g = new Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[at(r, c)] = grid[f(r, c)];
    const relabel = new Map();
    maps.push(g.map((v) => { if (!v) return '.'; if (!relabel.has(v)) relabel.set(v, relabel.size + 1); return String(relabel.get(v)); }).join(''));
  }
  return maps.sort()[0];
}

// ── 이름과 문장 ──
export function sdCellName(n, x) { return `${Math.floor(x / n) + 1}줄 ${(x % n) + 1}칸`; }
export function sdUnitName(u) {
  return u.kind === 'row' ? `${u.i + 1}번째 가로줄` : u.kind === 'col' ? `${u.i + 1}번째 세로줄` : `${u.i + 1}번 상자`;
}
const sdList = (arr) => arr.join(', ');

// 힌트 문장: where(어디를 볼까), why(기법 이름과 이유), todo(이렇게 해요)
// opts.memo: 이 단계가 메모(후보 표시)를 근거로 찾은 것이면 "메모를 보면"으로 말한다(주변 숫자만으로는 성립하지 않을 수 있어서).
export function sdStepText(n, step, opts = {}) {
  const t = sdStepTextBase(n, step);
  if (!opts.memo) return t;
  const C = (x) => sdCellName(n, x);
  const d = step.digit;
  if (step.tech === 'hidden-single-box' || step.tech === 'hidden-single-line') return { ...t, why: `메모를 보면 ${sdUnitName(step.unit)}에서 ${josa(String(d), '이가')} 들어갈 수 있는 칸은 ${C(step.cells[0])} 하나뿐이에요.` };
  if (step.tech === 'naked-single') return { ...t, why: `메모를 보면 ${C(step.cell)}에 남은 숫자가 ${d} 하나뿐이에요.` };
  if (step.tech === 'full-house') return t;
  return { ...t, why: '메모를 보면, ' + t.why };
}
function sdStepTextBase(n, step) {
  const C = (x) => sdCellName(n, x);
  const U = sdUnitName;
  const d = step.digit;
  const name = SD_TECH[SD_TECH_INDEX[step.tech]].name;
  switch (step.tech) {
    case 'full-house': {
      const u = U(step.unit);
      return { name, where: `${josa(u, '을를')} 보세요.`, why: `${u}에 빈칸이 하나만 남았어요. 빠진 숫자는 ${d}뿐이에요.`, todo: `${C(step.cells[0])}에 ${josa(String(d), '을를')} 놓아요.` };
    }
    case 'hidden-single-box':
    case 'hidden-single-line': {
      const u = U(step.unit);
      return { name, where: `${u}에서 ${josa(String(d), '이가')} 들어갈 곳을 찾아보세요.`, why: `${u}에서 ${josa(String(d), '이가')} 들어갈 수 있는 칸은 ${C(step.cells[0])} 하나뿐이에요. 다른 칸은 같은 줄이나 상자에 이미 ${josa(String(d), '이가')} 있어요.`, todo: `${C(step.cells[0])}에 ${josa(String(d), '을를')} 놓아요.` };
    }
    case 'naked-single': {
      const c = C(step.cell);
      return { name, where: `${josa(c, '을를')} 보세요.`, why: `${c}의 가로줄, 세로줄, 상자를 보면 들어갈 수 있는 숫자가 ${d} 하나뿐이에요.`, todo: `${c}에 ${josa(String(d), '을를')} 놓아요.` };
    }
    case 'pointing': {
      const b = U(step.box), l = U(step.line);
      return { name, where: `${b}의 ${josa(String(d), '을를')} 보세요.`, why: `${b}에서 ${josa(String(d), '이가')} 들어갈 수 있는 칸이 모두 ${l}에 있어요. 그래서 ${l}의 상자 밖 칸에서는 ${josa(String(d), '을를')} 지워요.`, todo: `${sdList(step.elim.map((e) => C(e.x)))}에서 ${josa(String(d), '을를')} 지워요.` };
    }
    case 'claiming': {
      const b = U(step.box), l = U(step.line);
      return { name, where: `${l}의 ${josa(String(d), '을를')} 보세요.`, why: `${l}에서 ${josa(String(d), '이가')} 들어갈 수 있는 칸이 모두 ${b} 안에 있어요. 그래서 ${b}의 다른 칸에서는 ${josa(String(d), '을를')} 지워요.`, todo: `${sdList(step.elim.map((e) => C(e.x)))}에서 ${josa(String(d), '을를')} 지워요.` };
    }
    case 'naked-pair':
    case 'naked-triple': {
      const u = U(step.unit), ds = sdList(step.digits), cs = sdList(step.cells.map(C));
      const k = step.cells.length === 2 ? '두' : '세';
      return { name, where: `${u}의 ${josa(cs, '을를')} 보세요.`, why: `${cs}에는 ${ds}만 들어갈 수 있어요. ${k} 칸이 이 숫자들을 나눠 가지니, ${u}의 다른 칸에서는 ${josa(ds, '을를')} 지워요.`, todo: `${sdList(step.elim.map((e) => C(e.x)))}에서 ${josa(ds, '을를')} 지워요.` };
    }
    case 'hidden-pair':
    case 'hidden-triple': {
      const u = U(step.unit), ds = sdList(step.digits), cs = sdList(step.cells.map(C));
      const k = step.cells.length === 2 ? '두' : '세';
      return { name, where: `${u}에서 ${josa(ds, '이가')} 들어갈 곳을 보세요.`, why: `${u}에서 ${josa(ds, '이가')} 들어갈 수 있는 칸은 ${cs} ${k} 칸뿐이에요. 그래서 이 칸들의 다른 후보는 지워요.`, todo: `${cs}에 ${ds}만 남겨요.` };
    }
    case 'x-wing': {
      const [a, b] = step.lines.map(U), [p, q] = step.cross.map(U);
      const crossKind = step.kind === 'row' ? '세로줄' : '가로줄';
      return { name, where: `${josa(a, '과와')} ${b}의 ${josa(String(d), '을를')} 보세요.`, why: `${josa(a, '과와')} ${b}에서 ${josa(String(d), '이가')} 들어갈 칸이 똑같이 ${josa(p, '과와')} ${q}에만 있어요. 네모 꼭짓점 네 칸 중 마주 보는 두 칸에 ${josa(String(d), '이가')} 들어가니, 두 ${crossKind}의 다른 칸에서는 ${josa(String(d), '을를')} 지워요.`, todo: `${sdList(step.elim.map((e) => C(e.x)))}에서 ${josa(String(d), '을를')} 지워요.` };
    }
    default:
      throw new Error('문장 틀이 없는 기법: ' + step.tech);
  }
}
