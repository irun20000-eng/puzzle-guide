// 고양이 자리 엔진 (장르: 스타 배틀 1개형). N×N 판, N개 색 구역.
// 규칙: 가로줄·세로줄·구역마다 고양이 정확히 1마리, 고양이끼리 8방향(대각선 포함)으로 닿지 않는다.
// 판은 region 배열(길이 n*n, 0..n-1). 글자로는 'A'..'J'. 해는 칸 번호 배열(가로줄마다 하나, cols[r] 대신 칸 번호로 다룸).
import { makeRng, shuffleWith, combosOf, josa } from './rng.mjs';

export const CT_LETTERS = 'ABCDEFGHIJ';
export const CT_TECH = [
  { id: 'last-spot', name: '마지막 자리', en: 'Last cell' },
  { id: 'one-line', name: '한 줄에 갇힌 구역', en: 'Region confined to a line' },
  { id: 'blocks-all', name: '모두가 닿는 칸', en: 'Nosy neighbors' },
  { id: 'k-lines', name: '묶어서 보기', en: 'N regions in N lines' },
  { id: 'what-if', name: '가정해 보기', en: 'Contradiction' },
];
export const CT_TECH_INDEX = Object.fromEntries(CT_TECH.map((t, i) => [t.id, i]));
export const ctTechIndex = (id) => {
  if (!(id in CT_TECH_INDEX)) throw new Error('모르는 고양이 자리 기법: ' + id);
  return CT_TECH_INDEX[id];
};

export const ctNear = (n, a, b) => Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1 && Math.abs((a % n) - (b % n)) <= 1;

export function ctParse(text) {
  const rows = Array.isArray(text) ? text : String(text).trim().split(/\s+/);
  let s = rows.join('');
  const n = Math.round(Math.sqrt(s.length));
  if (n * n !== s.length || n < 4 || n > 10) throw new Error('고양이 자리 판 글자가 잘못됨: ' + s);
  const region = [...s].map((ch) => CT_LETTERS.indexOf(ch.toUpperCase()));
  const cats = [...s].map((ch, x) => (ch !== ch.toUpperCase() ? x : -1)).filter((x) => x >= 0);
  if (region.some((g) => g < 0 || g >= n)) throw new Error('구역 글자가 잘못됨: ' + s);
  for (let g = 0; g < n; g++) if (!region.includes(g)) throw new Error('빈 구역: ' + CT_LETTERS[g]);
  return { n, region, cats };
}
export const ctFormat = (region) => region.map((g) => CT_LETTERS[g]).join('');
export const ctSizeOf = (region) => Math.round(Math.sqrt(region.length));

// 구역이 한 덩어리(위아래·양옆으로 이어짐)인지
export function ctRegionsConnected(n, region) {
  for (let g = 0; g < n; g++) {
    const cells = region.map((v, x) => (v === g ? x : -1)).filter((x) => x >= 0);
    if (!cells.length) return false;
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const x = stack.pop();
      const r = Math.floor(x / n), c = x % n;
      for (const [y, ok] of [[x - n, r > 0], [x + n, r < n - 1], [x - 1, c > 0], [x + 1, c < n - 1]]) if (ok && region[y] === g && !seen.has(y)) { seen.add(y); stack.push(y); }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

// 규칙 검사: 놓인 고양이(칸 번호 배열) 중 규칙을 어긴 것들과 이유
export function ctConflicts(n, region, cats) {
  const bad = new Set();
  const reasons = [];
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
    const a = cats[i], b = cats[j];
    let why = null;
    if (Math.floor(a / n) === Math.floor(b / n)) why = 'row';
    else if (a % n === b % n) why = 'col';
    else if (region[a] === region[b]) why = 'region';
    else if (ctNear(n, a, b)) why = 'touch';
    if (why) { bad.add(a); bad.add(b); reasons.push({ a, b, why }); }
  }
  return { cells: [...bad].sort((x, y) => x - y), reasons };
}
export function ctIsSolved(n, region, cats) {
  if (cats.length !== n || ctConflicts(n, region, cats).cells.length) return false;
  return true;
}

// 해 세기: limit 개에서 멈춘다. region[x] < 0 인 칸(아직 구역 없음)에는 놓을 수 없다. out 에 첫 해(칸 번호 배열).
export function ctCount(n, region, limit = 2, out = null) {
  const usedCol = new Array(n).fill(false), usedReg = new Array(n).fill(false);
  const cols = [];
  let count = 0;
  function rec(r) {
    if (r === n) { count++; if (out && !out.length) out.push(cols.map((c, i) => i * n + c)); return count >= limit; }
    const prev = r ? cols[r - 1] : -9;
    for (let c = 0; c < n; c++) {
      if (usedCol[c] || Math.abs(c - prev) <= 1) continue;
      const g = region[r * n + c];
      if (g < 0 || usedReg[g]) continue;
      usedCol[c] = usedReg[g] = true; cols.push(c);
      if (rec(r + 1)) return true;
      usedCol[c] = usedReg[g] = false; cols.pop();
    }
    return false;
  }
  rec(0);
  return count;
}
export function ctSolution(n, region) {
  const out = [];
  return ctCount(n, region, 2, out) === 1 ? out[0] : null;
}

// ── 사람 기법 풀이기 ──
function ctUnits(n, region) {
  const units = [];
  for (let r = 0; r < n; r++) units.push({ kind: 'row', i: r, cells: [...Array(n)].map((_, c) => r * n + c) });
  for (let c = 0; c < n; c++) units.push({ kind: 'col', i: c, cells: [...Array(n)].map((_, r) => r * n + c) });
  for (let g = 0; g < n; g++) units.push({ kind: 'reg', i: g, cells: region.map((v, x) => (v === g ? x : -1)).filter((x) => x >= 0) });
  return units;
}

// cats: 놓인 고양이 칸, marks: 사용자가 × 한 칸(비워 둘 칸)
export function ctState(n, region, cats = [], marks = []) {
  const s = { n, region, units: ctUnits(n, region), cand: new Array(n * n).fill(true), cat: new Array(n * n).fill(false) };
  for (const x of cats) ctPlace(s, x);
  for (const x of marks) if (!s.cat[x]) s.cand[x] = false;
  return s;
}
export const ctClone = (s) => ({ ...s, cand: s.cand.slice(), cat: s.cat.slice() });

export function ctPlace(s, x) {
  const { n } = s;
  s.cat[x] = true; s.cand[x] = false;
  for (let y = 0; y < n * n; y++) {
    if (y === x) continue;
    if (Math.floor(y / n) === Math.floor(x / n) || y % n === x % n || s.region[y] === s.region[x] || ctNear(n, x, y)) s.cand[y] = false;
  }
}
// 고양이 하나를 두면 비워 둘 칸들(지우기 표시 차시용)
export function ctBlockedBy(n, region, x) {
  const out = [];
  for (let y = 0; y < n * n; y++) if (y !== x && (Math.floor(y / n) === Math.floor(x / n) || y % n === x % n || region[y] === region[x] || ctNear(n, x, y))) out.push(y);
  return out;
}

export function ctApply(s, step) {
  for (const x of step.place || []) ctPlace(s, x);
  for (const x of step.elim || []) s.cand[x] = false;
  return s;
}

const ctHasCat = (s, u) => u.cells.some((x) => s.cat[x]);
const ctCands = (s, u) => u.cells.filter((x) => s.cand[x]);
export const ctEmptyUnit = (s) => s.units.find((u) => !ctHasCat(s, u) && ctCands(s, u).length === 0) || null;
export const ctDone = (s) => s.units.every((u) => ctHasCat(s, u));
const ctRow = (s, i) => s.units[i];
const ctCol = (s, i) => s.units[s.n + i];
const ctReg = (s, g) => s.units[2 * s.n + g];

const CT_FINDERS = {
  'last-spot'(s, all) {
    const res = [];
    for (const u of s.units) {
      if (ctHasCat(s, u)) continue;
      const c = ctCands(s, u);
      if (c.length !== 1) continue;
      res.push({ tech: 'last-spot', unit: u, focus: [u], place: [c[0]], cells: [c[0]] });
      if (!all) return res;
    }
    return res;
  },
  'one-line'(s, all) {
    const res = [];
    const { n } = s;
    for (const u of s.units) {
      if (ctHasCat(s, u)) continue;
      const c = ctCands(s, u);
      if (!c.length) continue;
      if (u.kind === 'reg') {
        for (const [kind, key] of [['row', (x) => Math.floor(x / n)], ['col', (x) => x % n]]) {
          const k0 = key(c[0]);
          if (!c.every((x) => key(x) === k0)) continue;
          const line = kind === 'row' ? ctRow(s, k0) : ctCol(s, k0);
          const elim = ctCands(s, line).filter((x) => s.region[x] !== u.i);
          if (!elim.length) continue;
          res.push({ tech: 'one-line', variant: 'reg-in-line', reg: u, line, focus: [u, line], cells: c, elim });
          if (!all) return res;
        }
      } else {
        const g0 = s.region[c[0]];
        if (!c.every((x) => s.region[x] === g0)) continue;
        const reg = ctReg(s, g0);
        const elim = ctCands(s, reg).filter((x) => !u.cells.includes(x));
        if (!elim.length) continue;
        res.push({ tech: 'one-line', variant: 'line-in-reg', reg, line: u, focus: [u, reg], cells: c, elim });
        if (!all) return res;
      }
    }
    return res;
  },
  'blocks-all'(s, all) {
    const res = [];
    for (let x = 0; x < s.n * s.n; x++) {
      if (!s.cand[x]) continue;
      const t = ctClone(s);
      ctPlace(t, x);
      const u = ctEmptyUnit(t);
      if (!u) continue;
      res.push({ tech: 'blocks-all', cell: x, unit: u, focus: [u], cells: ctCands(s, u), elim: [x] });
      if (!all) return res;
    }
    return res;
  },
  'k-lines'(s, all) {
    const res = [];
    const { n } = s;
    const open = s.units.filter((u) => u.kind === 'reg' && !ctHasCat(s, u));
    for (let k = 2; k < open.length; k++) for (const set of combosOf(open, k)) {
      for (const [kind, key] of [['row', (x) => Math.floor(x / n)], ['col', (x) => x % n]]) {
        const lines = new Set(set.flatMap((u) => ctCands(s, u).map(key)));
        if (lines.size !== k) continue;
        const regs = new Set(set.map((u) => u.i));
        const elim = [];
        for (let x = 0; x < n * n; x++) if (s.cand[x] && lines.has(key(x)) && !regs.has(s.region[x])) elim.push(x);
        if (!elim.length) continue;
        const lineUnits = [...lines].sort((a, b) => a - b).map((i) => (kind === 'row' ? ctRow(s, i) : ctCol(s, i)));
        res.push({ tech: 'k-lines', k, kind, regs: set, lines: lineUnits, focus: [...set, ...lineUnits], cells: set.flatMap((u) => ctCands(s, u)), elim });
        if (!all) return res;
      }
    }
    return res;
  },
  'what-if'(s, all) {
    const res = [];
    for (let x = 0; x < s.n * s.n; x++) {
      if (!s.cand[x]) continue;
      const t = ctClone(s);
      ctPlace(t, x);
      let depth = 0;
      const chain = [];
      while (!ctEmptyUnit(t) && !ctDone(t) && depth < 60) {
        const p = ctNextStep(t, CT_TECH_INDEX['k-lines']);
        if (!p) break;
        ctApply(t, p);
        chain.push(p);
        depth++;
      }
      const u = ctEmptyUnit(t);
      if (!u) continue;
      res.push({ tech: 'what-if', cell: x, unit: u, depth: depth + 1, chain, focus: [], cells: [x], elim: [x] });
      if (!all) return res;
    }
    return res;
  },
};

export function ctNextStep(s, maxTech = CT_TECH.length - 1) {
  for (let t = 0; t <= maxTech; t++) {
    const found = CT_FINDERS[CT_TECH[t].id](s, false);
    if (found.length) return found[0];
  }
  return null;
}
export function ctFindAll(s, techId) {
  if (!CT_FINDERS[techId]) throw new Error('모르는 고양이 자리 기법: ' + techId);
  return CT_FINDERS[techId](s, true);
}

export function ctGrade(n, region, { maxTech = CT_TECH.length - 1, keepSteps = false, cats = [], marks = [] } = {}) {
  const s = ctState(n, region, cats, marks);
  let hardest = -1;
  const counts = new Array(CT_TECH.length).fill(0);
  const steps = [];
  while (!ctDone(s)) {
    if (ctEmptyUnit(s)) return { solved: false, hardest: CT_TECH.length, counts, steps, state: s };
    const step = ctNextStep(s, maxTech);
    if (!step) return { solved: false, hardest: CT_TECH.length, counts, steps, state: s };
    const t = CT_TECH_INDEX[step.tech];
    counts[t]++;
    if (t > hardest) hardest = t;
    if (keepSteps) steps.push(step);
    ctApply(s, step);
  }
  return { solved: true, hardest, counts, steps, state: s, stepCount: counts.reduce((a, b) => a + b, 0) };
}

export function ctLevelOf(hardest) {
  if (hardest <= CT_TECH_INDEX['blocks-all']) return 'easy';
  if (hardest <= CT_TECH_INDEX['k-lines']) return 'normal';
  return 'hard';
}

// ── 생성기 ──
function ctRandomPlacement(n, rand) {
  const cols = [];
  const used = new Array(n).fill(false);
  function rec(r) {
    if (r === n) return true;
    for (const c of shuffleWith([...Array(n).keys()], rand)) {
      if (used[c] || (r && Math.abs(c - cols[r - 1]) <= 1)) continue;
      used[c] = true; cols.push(c);
      if (rec(r + 1)) return true;
      used[c] = false; cols.pop();
    }
    return false;
  }
  return rec(0) ? cols : null;
}

// 고양이 자리를 먼저 정하고, 고양이 칸마다 구역 씨앗을 두고 이웃 칸을 붙여 키운다.
// 붙일 때마다 해를 2개까지 세어, 해가 둘이 되는 붙이기는 버린다(칸을 붙이면 자리가 늘기만 하므로).
function ctGrowOnce(n, rand, balance, maxRestarts) {
  for (let restart = 0; restart < maxRestarts; restart++) {
    const cols = ctRandomPlacement(n, rand);
    const region = new Array(n * n).fill(-1);
    cols.forEach((c, r) => (region[r * n + c] = r));
    let left = n * n - n;
    let stuck = false;
    while (left > 0 && !stuck) {
      const frontier = [];
      for (let x = 0; x < n * n; x++) if (region[x] < 0) {
        const r = Math.floor(x / n), c = x % n;
        const regs = [];
        if (r > 0 && region[x - n] >= 0 && !regs.includes(region[x - n])) regs.push(region[x - n]);
        if (r < n - 1 && region[x + n] >= 0 && !regs.includes(region[x + n])) regs.push(region[x + n]);
        if (c > 0 && region[x - 1] >= 0 && !regs.includes(region[x - 1])) regs.push(region[x - 1]);
        if (c < n - 1 && region[x + 1] >= 0 && !regs.includes(region[x + 1])) regs.push(region[x + 1]);
        if (regs.length) frontier.push([x, regs]);
      }
      shuffleWith(frontier, rand);
      let placed = false;
      if (balance) {
        const size = new Array(n).fill(0);
        region.forEach((g) => g >= 0 && size[g]++);
        const pairs = frontier.flatMap(([x, regs]) => regs.map((g) => [x, g, size[g] + rand() * balance]));
        pairs.sort((p, q) => p[2] - q[2]);
        for (const [x, g] of pairs) {
          region[x] = g;
          if (ctCount(n, region, 2) === 1) { placed = true; break; }
          region[x] = -1;
        }
      } else {
        for (const [x, regs] of frontier) {
          for (const g of shuffleWith(regs, rand)) {
            region[x] = g;
            if (ctCount(n, region, 2) === 1) { placed = true; break; }
            region[x] = -1;
          }
          if (placed) break;
        }
      }
      if (placed) left--; else stuck = true;
    }
    if (!stuck) return { region: ctRelabel(n, region), restarts: restart };
  }
  return null;
}

// 구역 번호를 왼쪽 위부터 처음 나오는 순서로 다시 매긴다(같은 판은 같은 글자)
export function ctRelabel(n, region) {
  const map = new Map();
  return region.map((g) => { if (!map.has(g)) map.set(g, map.size); return map.get(g); });
}

export const ctMinRegion = (n, region) => Math.min(...[...Array(n).keys()].map((g) => region.filter((v) => v === g).length));

// opts: balance(작은 구역부터 키우기 흔들기 값, 0이면 그냥 키우기), maxTech, minTech, minRegion, attempts
export function ctGenerate(n, seed, opts = {}) {
  const rand = typeof seed === 'function' ? seed : makeRng(seed);
  const maxTech = opts.maxTech ? ctTechIndex(opts.maxTech) : CT_TECH.length - 1;
  const minTech = opts.minTech ? ctTechIndex(opts.minTech) : -1;
  const balance = opts.balance ?? 3;
  const attempts = opts.attempts ?? 30;
  const minRegion = opts.minRegion || 0;
  let best = null;
  for (let i = 0; i < attempts; i++) {
    const p = ctGrowOnce(n, rand, balance, opts.maxRestarts ?? 300);
    if (!p) continue;
    const grade = ctGrade(n, p.region);
    const sol = ctSolution(n, p.region);
    const r = { n, region: p.region, solution: sol, grade, attempt: i };
    const okRegion = ctMinRegion(n, p.region) >= minRegion;
    if (grade.solved && grade.hardest <= maxTech && grade.hardest >= minTech && okRegion) return { ...r, met: true };
    if (grade.solved && grade.hardest <= maxTech && (!best || grade.hardest > best.grade.hardest)) best = r;
  }
  return best ? { ...best, met: false } : null;
}

export function ctCanonical(region) {
  const n = ctSizeOf(region);
  const at = (r, c) => r * n + c;
  const tf = [
    (r, c) => at(r, c), (r, c) => at(r, n - 1 - c), (r, c) => at(n - 1 - r, c), (r, c) => at(n - 1 - r, n - 1 - c),
    (r, c) => at(c, r), (r, c) => at(c, n - 1 - r), (r, c) => at(n - 1 - c, r), (r, c) => at(n - 1 - c, n - 1 - r),
  ];
  const forms = tf.map((f) => {
    const g = new Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[at(r, c)] = region[f(r, c)];
    return ctFormat(ctRelabel(n, g));
  });
  return forms.sort()[0];
}

// ── 이름과 문장 ──
export const ctCellName = (n, x) => `${Math.floor(x / n) + 1}줄 ${(x % n) + 1}칸`;
export const ctDefaultRegionName = (g) => `${g + 1}번 구역`;
export function ctUnitName(u, regionName = ctDefaultRegionName) {
  return u.kind === 'row' ? `${u.i + 1}번째 가로줄` : u.kind === 'col' ? `${u.i + 1}번째 세로줄` : regionName(u.i);
}

export function ctStepText(n, step, regionName = ctDefaultRegionName) {
  const C = (x) => ctCellName(n, x);
  const U = (u) => ctUnitName(u, regionName);
  const name = CT_TECH[CT_TECH_INDEX[step.tech]].name;
  switch (step.tech) {
    case 'last-spot': {
      const u = U(step.unit), c = C(step.place[0]);
      return { name, where: `${josa(u, '을를')} 보세요.`, why: `${u}에 고양이를 둘 수 있는 곳이 ${c} 하나만 남았어요.`, todo: `${c}에 고양이를 놓아요.` };
    }
    case 'one-line': {
      const r = U(step.reg), l = U(step.line);
      if (step.variant === 'reg-in-line') {
        return { name, where: `${josa(r, '을를')} 보세요.`, why: `${r}의 남은 자리가 모두 ${l}에 있어요. 그래서 ${l}의 다른 칸은 비워 둬요.`, todo: `${step.elim.map(C).join(', ')}에 ×를 해요.` };
      }
      return { name, where: `${josa(l, '을를')} 보세요.`, why: `${l}에 남은 자리가 모두 ${r} 안에 있어요. 그래서 ${r}의 다른 칸은 비워 둬요.`, todo: `${step.elim.map(C).join(', ')}에 ×를 해요.` };
    }
    case 'blocks-all': {
      const c = C(step.cell), u = U(step.unit);
      return { name, where: `${josa(u, '과와')} ${josa(c, '을를')} 함께 보세요.`, why: `${c}에 고양이를 두면 ${u}의 남은 자리가 모두 막혀요. 그러면 ${u}에 둘 곳이 없으니 ${josa(c, '은는')} 비워 둬요.`, todo: `${c}에 ×를 해요.` };
    }
    case 'k-lines': {
      const regs = step.regs.map((u) => U(u)).join(', ');
      const lineWord = step.kind === 'row' ? '가로줄' : '세로줄';
      const lines = step.lines.map((u) => u.i + 1).join('·') + '번째 ' + lineWord;
      return { name, where: `${josa(regs, '을를')} 함께 보세요.`, why: `구역 ${step.k}개(${regs})의 남은 자리가 모두 ${lines} 안에 있어요. 이 ${lineWord} ${step.k}개는 이 구역들 몫이니, 다른 구역의 칸은 비워 둬요.`, todo: `${step.elim.map(C).join(', ')}에 ×를 해요.` };
    }
    case 'what-if': {
      const c = C(step.cell), u = U(step.unit);
      return { name, where: `${josa(c, '을를')} 보세요.`, why: `${c}에 고양이를 두었다고 해 보면, ${step.depth}걸음 뒤에 ${u}에 둘 곳이 없어져요. 그래서 ${josa(c, '은는')} 비워 둬요.`, todo: `${c}에 ×를 해요.` };
    }
    default:
      throw new Error('문장 틀이 없는 기법: ' + step.tech);
  }
}
