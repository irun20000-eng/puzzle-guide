// 힌트 문장이 그 판 상태에서 사실인지(검수 PZ-B1·PZ-R3·PZ-B2 재발 방지).
// 모든 스도쿠 묶음 문제를 힌트만 따라 끝까지 풀며, 힌트를 부를 때마다 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PACKS } from '../src/packs/packs.mjs';
import { sdParse, sdSolution, sdShape, sdUnitName } from '../src/sudoku.mjs';
import { ctParse, ctSolution, ctState, ctFindAll, ctNextStep } from '../src/cats.mjs';
import { sdHint, ctHint, sdAutoNotes } from '../src/hint.mjs';
import { CT_LESSONS } from '../src/lessons/cats.mjs';
import { expandItem } from '../src/lesson-engine.mjs';

// 단계 비교: 놓을 칸·지울 후보·칸에 더해 줄 종류·번호와 숫자까지(검수 2라운드)
const sameStep = (a, b) => JSON.stringify({ p: a.place, e: a.elim, c: a.cells, u: a.unit && a.unit.kind + a.unit.i, r: a.reg && a.reg.i, l: a.line && a.line.kind + a.line.i, k: a.k, cell: a.cell }) === JSON.stringify({ p: b.place, e: b.elim, c: b.cells, u: b.unit && b.unit.kind + b.unit.i, r: b.reg && b.reg.i, l: b.line && b.line.kind + b.line.i, k: b.k, cell: b.cell });

// ── 문장 독립 검산: 힌트 문장이 말하는 줄·칸·상자·숫자 주장을 엔진 풀이기를 쓰지 않고 직접 계산해 확인한다 ──
const boxDims = (n) => (n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3]);
function unitCells(n, u) {
  const [br, bc] = boxDims(n);
  if (u.kind === 'row') return [...Array(n)].map((_, c) => u.i * n + c);
  if (u.kind === 'col') return [...Array(n)].map((_, r) => r * n + u.i);
  const r0 = Math.floor(u.i / (n / bc)) * br, c0 = (u.i % (n / bc)) * bc;
  const out = [];
  for (let r = 0; r < br; r++) for (let c = 0; c < bc; c++) out.push((r0 + r) * n + c0 + c);
  return out;
}
// 주변 숫자만으로 들어갈 수 있는 숫자(메모가 있으면 메모와 겹치는 것)
function candidatesOf(n, values, notes, x) {
  if (values[x]) return new Set();
  const [br, bc] = boxDims(n);
  const r = Math.floor(x / n), c = x % n;
  const seen = new Set();
  for (let k = 0; k < n; k++) { seen.add(values[r * n + k]); seen.add(values[k * n + c]); }
  const r0 = r - (r % br), c0 = c - (c % bc);
  for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) seen.add(values[(r0 + i) * n + c0 + j]);
  const out = new Set();
  for (let d = 1; d <= n; d++) if (!seen.has(d) && (!notes || !notes[x] || notes[x] & (1 << (d - 1)))) out.add(d);
  return out;
}
const has = (n, values, notes, x, d) => candidatesOf(n, values, notes, x).has(d);
const eqSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));

// 참이면 null, 거짓이면 이유
export function claimFalse(n, values, notes, step, text) {
  const U = (u) => unitCells(n, u);
  const d = step.digit;
  // 문장에 주장의 이름이 실제로 들어 있는가
  const names = [];
  if (step.unit) names.push(sdUnitName(step.unit));
  if (step.box) names.push(sdUnitName(step.box));
  if (step.line) names.push(sdUnitName(step.line));
  for (const l of step.lines || []) names.push(sdUnitName(l));
  for (const l of step.cross || []) names.push(sdUnitName(l));
  for (const nm of names) if (!text.includes(nm)) return '문장에 ' + nm + ' 없음';
  switch (step.tech) {
    case 'full-house': return U(step.unit).filter((x) => !values[x]).length === 1 ? null : '빈칸이 하나가 아님';
    case 'hidden-single-box': case 'hidden-single-line': {
      const where = U(step.unit).filter((x) => has(n, values, notes, x, d));
      return eqSet(where, [step.place[0].x]) ? null : `${d}의 자리 ${where}`;
    }
    case 'naked-single': { const c = [...candidatesOf(n, values, notes, step.cell)]; return eqSet(c, [d]) ? null : '후보 ' + c; }
    case 'pointing': { const inBox = U(step.box).filter((x) => has(n, values, notes, x, d)); const line = U(step.line); return inBox.length && inBox.every((x) => line.includes(x)) ? null : '상자 후보가 줄 밖에도'; }
    case 'claiming': { const inLine = U(step.line).filter((x) => has(n, values, notes, x, d)); const box = U(step.box); return inLine.length && inLine.every((x) => box.includes(x)) ? null : '줄 후보가 상자 밖에도'; }
    case 'naked-pair': case 'naked-triple': {
      const uni = new Set(step.cells.flatMap((x) => [...candidatesOf(n, values, notes, x)]));
      return eqSet([...uni], step.digits) ? null : '칸들의 후보 ' + [...uni];
    }
    case 'hidden-pair': case 'hidden-triple': {
      const where = U(step.unit).filter((x) => step.digits.some((dd) => has(n, values, notes, x, dd)));
      return eqSet(where, step.cells) ? null : '숫자들의 자리 ' + where;
    }
    case 'x-wing': {
      const cols = step.cross.map((u) => u.i);
      for (const l of step.lines) {
        const pos = U(l).filter((x) => has(n, values, notes, x, d)).map((x) => (step.kind === 'row' ? x % n : Math.floor(x / n)));
        if (!eqSet(pos, cols)) return '줄의 자리 ' + pos;
      }
      return null;
    }
    default: return '모르는 기법';
  }
}

for (const autoClean of [true, false]) {
  test(`스도쿠 힌트 문장 독립 검산: 묶음 90문제 × 「그대로 하기」로 끝까지(메모 저절로 지우기 ${autoClean ? '켬' : '끔'}) 거짓 0, 체인 0`, () => {
    let hints = 0, chains = 0, memoHints = 0, falseCount = 0, noteHints = 0;
    const falses = [];
    for (const [id, list] of Object.entries(PACKS)) {
      if (!id.startsWith('s')) continue;
      list.forEach((text, pi) => {
        const puzzle = sdParse(text);
        const n = Math.round(Math.sqrt(puzzle.length));
        const solution = sdSolution(puzzle);
        const values = puzzle.slice();
        const notes = new Array(n * n).fill(0);
        for (let guard = 0; guard < 900 && values.some((v) => !v); guard++) {
          const useNotes = notes.some(Boolean) ? notes : null;
          const h = sdHint({ puzzle, values, notes: useNotes, solution });
          hints++;
          if (h.kind === 'note') { noteHints++; for (const e of h.elimNotes || []) notes[e.x] &= ~e.mask; continue; }
          assert.equal(h.kind, 'step', `${id}#${pi} ${h.kind} ${h.where}`);
          if (h.steps.length !== 1) chains++;
          const step = h.steps[0];
          // 문장의 근거: "메모를 보면"이 없으면 주변 숫자만, 있으면 메모
          const memo = h.why.startsWith('메모를 보면');
          if (memo) memoHints++;
          const why = claimFalse(n, values, memo ? useNotes : null, step, h.where + ' ' + h.why + ' ' + h.todo);
          if (why) { falseCount++; falses.push(`${id}#${pi} ${hints}: ${h.why} → ${why}`); }
          if (h.elim.length) {
            if (!h.memo) { const auto = sdAutoNotes(values); for (let k = 0; k < auto.length; k++) if (!values[k] && !notes[k]) notes[k] = auto[k]; }
            for (const e of h.elim) { assert.equal(e.mask & (1 << (solution[e.x] - 1)), 0, '정답 후보를 지움'); notes[e.x] &= ~e.mask; }
          }
          if (h.place) {
            assert.equal(h.place.d, solution[h.place.x]);
            values[h.place.x] = h.place.d; notes[h.place.x] = 0;
            if (autoClean) for (const p of sdShape(n).peers[h.place.x]) notes[p] &= ~(1 << (h.place.d - 1));
          }
        }
        assert.deepEqual(values, solution, id + ' 힌트만으로 끝까지');
      });
    }
    assert.deepEqual(falses.slice(0, 5), [], '거짓 문장');
    assert.equal(falseCount, 0);
    assert.equal(chains, 0, '후보 지우기 체인 힌트 0');
    assert.ok(hints > 3000 && memoHints > 0, `${hints} ${memoHints}`);
    if (!autoClean) assert.ok(noteHints > 0, '지우지 않은 메모를 먼저 짚음');
    console.log(`힌트 ${hints}회(메모 근거 ${memoHints}, 메모 짚기 ${noteHints}), 거짓 ${falseCount}, 체인 ${chains}`);
  });
}

test('고양이 자리 힌트: 모든 묶음 문제에서 힌트마다 한 단계, 그 판(놓인 고양이와 ×)에서 같은 단계가 찾아짐', () => {
  let hints = 0;
  for (const [id, list] of Object.entries(PACKS)) {
    if (!id.startsWith('c') || id.endsWith('free')) continue;
    for (const text of list) {
      const { n, region } = ctParse(text);
      const solution = ctSolution(n, region);
      const cats = [], marks = [];
      for (let guard = 0; guard < 400 && cats.length < n; guard++) {
        const h = ctHint({ n, region, cats, marks, solution });
        assert.equal(h.kind, 'step', id);
        hints++;
        const st = ctState(n, region, cats, marks);
        assert.ok(ctFindAll(st, h.tech).some((s) => sameStep(s, h.steps[0])), id + ' ' + h.why);
        assert.equal(ctNextStep(st).tech, h.tech, '가장 쉬운 기법부터');
        if (h.place !== null) cats.push(h.place);
        for (const x of h.elim) if (!marks.includes(x)) marks.push(x);
      }
      assert.equal(cats.length, n, id);
    }
  }
  assert.ok(hints > 500);
});

test('두었다고 해 보기(C13): 더 쉬운 기법이 없는 상태에서 시작하고, 정답 칸은 가장 짧게 막히는 칸만(빈칸의 30% 이하)', () => {
  const c13 = CT_LESSONS.find((l) => l.id === 'C13');
  let k = 0;
  for (const it of c13.items.filter((i) => i.t === 'step')) {
    const x = expandItem(it);
    k++;
    const st = ctState(x.n, x.region, x.cats, x.marks);
    assert.equal(ctNextStep(st).tech, 'what-if', '가장 쉬운 기법이 가정해 보기');
    const open = st.cand.filter(Boolean).length;
    assert.ok(x.answer.cells.length / open <= 0.3, `정답 칸 ${x.answer.cells.length}/${open}`);
    for (const c of x.answer.cells) assert.ok(!x.solution.includes(c));
    assert.match(x.prompt, /걸음 만에 막히는 칸/);
  }
  assert.equal(k, 3);
});
