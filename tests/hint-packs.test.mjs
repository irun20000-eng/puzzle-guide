import test from 'node:test';
import assert from 'node:assert/strict';
import { sdHint, ctHint, sdAutoNotes } from '../src/hint.mjs';
import { PACKS } from '../src/packs/packs.mjs';
import { RECIPES } from '../src/packs/recipes.mjs';
import { satisfiesNeeds } from '../tools/make-packs.mjs';
import { sdParse, sdSolution, sdCount, sdGrade, sdCanonical, sdTechIndex, sdApply, sdState } from '../src/sudoku.mjs';
import { ctParse, ctSolution, ctCount, ctGrade, ctCanonical, ctTechIndex, ctRegionsConnected, ctMinRegion } from '../src/cats.mjs';

test('묶음: 조건대로 만들어졌고(유일해, 기법 범위, 필요한 걸음), 겹침 없음, 100KB 이하', () => {
  const canon = new Set();
  let total = 0, bytes = 0;
  for (const r of RECIPES) {
    const list = PACKS[r.id];
    assert.ok(list && list.length === r.count, r.id + ' 개수');
    for (const text of list) {
      total++; bytes += text.length;
      if (r.kind === 'sd') {
        const p = sdParse(text);
        assert.equal(sdCount(p, 2), 1, r.id);
        const g = sdGrade(p);
        assert.ok(g.solved, r.id + ' 기법으로 풀림');
        if (r.maxTech) assert.ok(g.hardest <= sdTechIndex(r.maxTech), r.id + ' 상한');
        if (r.minTech) assert.ok(g.hardest >= sdTechIndex(r.minTech), r.id + ' 꼭 필요');
        canon.add('sd' + sdCanonical(p));
      } else {
        const { n, region } = ctParse(text);
        assert.equal(ctCount(n, region, 2), 1, r.id);
        assert.ok(ctRegionsConnected(n, region), r.id);
        if (r.minRegion) assert.ok(ctMinRegion(n, region) >= r.minRegion, r.id + ' 가장 작은 구역');
        const g = ctGrade(n, region);
        assert.ok(g.solved, r.id + ' 기법으로 풀림');
        if (r.maxTech) assert.ok(g.hardest <= ctTechIndex(r.maxTech), r.id + ' 상한');
        if (r.minTech) assert.ok(g.hardest >= ctTechIndex(r.minTech), r.id + ' 꼭 필요');
        canon.add('ct' + ctCanonical(region));
      }
      assert.ok(satisfiesNeeds(r, text), r.id + ' 필요한 걸음');
    }
  }
  assert.equal(canon.size, total, '돌리기·뒤집기·바꾸기로 같은 판 없음');
  assert.ok(bytes < 100 * 1024);
});

test('스도쿠 힌트: 3단계 문장이 채워지고, 따라 하면 끝까지 풀린다', () => {
  for (const id of ['s4-hb', 's6-ns', 's9-pt', 's9-np', 's9-xw']) {
    const puzzle = sdParse(PACKS[id][0]);
    const solution = sdSolution(puzzle);
    const values = puzzle.slice();
    const notes = new Array(values.length).fill(0);
    let guard = 0;
    while (values.some((v) => !v) && guard++ < 300) {
      const h = sdHint({ puzzle, values, notes: notes.some(Boolean) ? notes : null, solution });
      assert.equal(h.kind, 'step', id);
      for (const k of ['where', 'why', 'todo', 'name']) assert.ok(h[k] && !/undefined|NaN/.test(h[k]), `${id} ${k}: ${h[k]}`);
      if (h.elim.length) { if (!h.memo) { const auto = sdAutoNotes(values); for (let k = 0; k < auto.length; k++) if (!values[k] && !notes[k]) notes[k] = auto[k]; } for (const e of h.elim) notes[e.x] &= ~e.mask; continue; }
      assert.equal(h.place.d, solution[h.place.x], id + ' 힌트 정답');
      values[h.place.x] = h.place.d; notes[h.place.x] = 0;
      for (let k = 0; k < values.length; k++) if (!values[k]) notes[k] = notes[k] && (sdAutoNotes(values)[k] & notes[k]);
    }
    assert.deepEqual(values, solution);
  }
});

test('스도쿠 힌트: 틀린 수를 먼저 짚고, 메모 문제를 알린다', () => {
  const puzzle = sdParse(PACKS['s9-ns'][0]);
  const solution = sdSolution(puzzle);
  const empty = puzzle.findIndex((v) => !v);
  const values = puzzle.slice();
  values[empty] = (solution[empty] % 9) + 1;
  const h = sdHint({ puzzle, values, solution });
  assert.equal(h.kind, 'mistake');
  assert.deepEqual(h.cells, [empty]);
  const notes = sdAutoNotes(puzzle);
  notes[empty] &= ~(1 << (solution[empty] - 1));
  assert.equal(sdHint({ puzzle, values: puzzle, notes, solution }).kind, 'note');
  const notes2 = sdAutoNotes(puzzle);
  const peerGiven = puzzle.find((v) => v);
  const x = puzzle.findIndex((v, i) => !v && sdState(puzzle).cand[i] !== 0 && !(sdState(puzzle).cand[i] & (1 << (peerGiven - 1))));
  if (x >= 0) { notes2[x] |= 1 << (peerGiven - 1); const h2 = sdHint({ puzzle, values: puzzle, notes: notes2, solution }); assert.equal(h2.kind, 'note'); assert.match(h2.why, /지워야 할 것이 남아 있어요/); }
  void sdApply;
});

test('고양이 자리 힌트: 단계를 따라 ×와 고양이를 놓으면 끝까지 풀린다', () => {
  for (const id of ['c4-ls', 'c5-ol', 'c7-ba', 'c8-kl', 'c8-wi', 'c9-mix']) {
    const { n, region } = ctParse(PACKS[id][0]);
    const solution = ctSolution(n, region);
    const cats = [], marks = [];
    let guard = 0;
    while (cats.length < n && guard++ < 300) {
      const h = ctHint({ n, region, cats, marks, solution });
      assert.equal(h.kind, 'step', id + ' ' + h.where);
      for (const k of ['where', 'why', 'todo', 'name']) assert.ok(h[k] && !/undefined|NaN/.test(h[k]), `${id} ${k}: ${h[k]}`);
      if (h.place !== null) { assert.ok(solution.includes(h.place)); cats.push(h.place); }
      for (const x of h.elim) { assert.ok(!solution.includes(x)); if (!marks.includes(x)) marks.push(x); }
    }
    assert.deepEqual([...cats].sort((a, b) => a - b), [...solution].sort((a, b) => a - b), id);
    assert.equal(ctHint({ n, region, cats, marks, solution }).kind, 'done');
  }
});

test('고양이 자리 힌트: 틀린 고양이와 틀린 ×를 먼저 짚는다', () => {
  const { n, region } = ctParse(PACKS['c6-ba'][0]);
  const solution = ctSolution(n, region);
  const wrong = [...Array(n * n).keys()].find((x) => !solution.includes(x));
  const h = ctHint({ n, region, cats: [wrong], marks: [], solution });
  assert.equal(h.kind, 'mistake');
  assert.equal(h.remove, wrong);
  const h2 = ctHint({ n, region, cats: [], marks: [solution[0]], solution });
  assert.equal(h2.kind, 'note');
  void ctGrade; void sdGrade;
});
