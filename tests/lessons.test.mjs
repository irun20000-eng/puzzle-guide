// 차시·미션 자료 전수 검산: 모든 걸음을 펼쳐 엔진으로 다시 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SD_LESSONS, SD_MISSIONS, SD_UNITS } from '../src/lessons/sudoku.mjs';
import { CT_LESSONS, CT_MISSIONS, CT_UNITS } from '../src/lessons/cats.mjs';
import { expandItem, loadPuzzle, checkPick, starsFor } from '../src/lesson-engine.mjs';
import { sdCount, sdGrade, sdState, sdTechIndex, sdPopcount, sdConflicts, SD_TECH } from '../src/sudoku.mjs';
import { ctCount, ctGrade, ctTechIndex, ctRegionsConnected, ctParse, ctConflicts, CT_TECH } from '../src/cats.mjs';
import { sentenceCount } from '../src/lessons/index.mjs';

const ALL = [...SD_LESSONS.map((l) => ({ ...l, kind: 'sd' })), ...CT_LESSONS.map((l) => ({ ...l, kind: 'ct' }))];
const MISSIONS = [...SD_MISSIONS.map((m) => ({ ...m, kind: 'sd' })), ...CT_MISSIONS.map((m) => ({ ...m, kind: 'ct' }))];
const capOf = (kind, id) => (kind === 'sd' ? sdTechIndex(id) : ctTechIndex(id));

test('분량: 10단원 32차시(스도쿠 18, 고양이 자리 14) + 미션 10개, 미션 문제 34개', () => {
  assert.equal(SD_UNITS.length + CT_UNITS.length, 10);
  assert.equal(SD_LESSONS.length, 18);
  assert.equal(CT_LESSONS.length, 14);
  assert.equal(MISSIONS.length, 10);
  assert.equal(MISSIONS.reduce((a, m) => a + m.items.length, 0), 34);
  const ids = new Set(ALL.map((l) => l.id));
  assert.equal(ids.size, 32);
});

test('차시마다 설명 카드 글은 세 문장 이내이고, 직접 해 보는 문제가 3~5개', () => {
  for (const l of ALL) {
    assert.ok(l.cards.length >= 1, l.id);
    for (const c of l.cards) {
      assert.ok(c.text.length <= 3, l.id + ' 카드 문장 수');
      assert.ok(sentenceCount(c.text.join(' ')) <= 3, l.id + ' 문장 수(마침표 기준)');
    }
    const doing = l.items.filter((it) => it.t !== 'card');
    assert.ok(doing.length >= 3 && doing.length <= 5, `${l.id} 문제 수 ${doing.length}`);
    assert.ok(l.summary && sentenceCount(l.summary) <= 2, l.id + ' 정리');
  }
});

function verifyPlayable(kind, x, cap, id) {
  if (kind === 'sd') {
    assert.equal(sdCount(x.puzzle, 2), 1, id + ' 유일해');
    const g = sdGrade(x.puzzle);
    assert.ok(g.solved, id + ' 기법만으로 풀림');
    assert.ok(g.hardest <= cap, `${id} 기법 상한: ${SD_TECH[g.hardest]?.id}`);
    return g;
  }
  assert.equal(ctCount(x.n, x.region, 2), 1, id + ' 유일해');
  assert.ok(ctRegionsConnected(x.n, x.region), id + ' 구역 한 덩어리');
  const g = ctGrade(x.n, x.region);
  assert.ok(g.solved, id + ' 기법만으로 풀림');
  assert.ok(g.hardest <= cap, `${id} 기법 상한: ${CT_TECH[g.hardest]?.id}`);
  return g;
}

test('모든 차시 걸음: 펼치기, 유일해, 기법 상한, 정답 확인', () => {
  let steps = 0;
  for (const l of ALL) {
    const cap = capOf(l.kind, l.maxTech);
    for (const c of l.cards) if (c.demo) {
      const d = expandItem({ t: 'card', ...c }).demo;
      assert.ok(d.explain, l.id + ' 보여 주기 설명');
    }
    l.items.forEach((it, k) => {
      const id = `${l.id}#${k + 1}`;
      const x = expandItem(it);
      steps++;
      if (it.t === 'quiz') { assert.ok(it.answer >= 0 && it.answer < it.options.length, id); return; }
      if (it.t === 'tap') {
        assert.ok(x.answer.cells.length >= 1, id + ' 짚을 칸이 있음');
        if (x.kind === 'ct') assert.ok(ctRegionsConnected(x.n, x.region), id + ' 구역');
        assert.ok(checkPick(x.answer, x.answer.mode === 'one' ? [x.answer.cells[0]] : x.answer.cells), id);
        return;
      }
      const g = verifyPlayable(x.kind, x, cap, id);
      if (it.t === 'step') {
        assert.equal(x.tech, it.tech, id);
        assert.ok(x.prompt && !/undefined|NaN/.test(x.prompt), id + ' 질문: ' + x.prompt);
        assert.ok(x.explain && !/undefined|NaN/.test(x.explain), id + ' 설명');
        if (x.kind === 'sd') {
          if (x.answer.place) assert.equal(x.solution[x.answer.place.x], x.answer.place.d, id + ' 정답이 해와 같음');
          else for (const c of x.answer.cells) assert.ok(c >= 0 && !x.values[c], id + ' 지울 칸은 빈칸');
        } else {
          const sol = new Set(x.solution);
          if (x.answer.cat !== undefined) assert.ok(sol.has(x.answer.cat), id + ' 고양이 정답');
          else for (const c of x.answer.cells) assert.ok(!sol.has(c), id + ' ×할 칸은 답이 아님');
        }
      }
      if (it.t === 'count') { assert.ok(x.answer.choice >= 0 && x.answer.choice < x.options.length, id + ' 보기 안'); }
      if (it.t === 'memo') { assert.ok(sdPopcount(x.answer.mask) >= 2, id + ' 메모 칸'); }
      void g;
    });
  }
  assert.ok(steps >= 120, '차시 문제 수 ' + steps);
});

test('"꼭 필요한 기법" 차시: 한 판 풀기 문제가 그 기법 없이는 안 풀린다', () => {
  // 4×4의 줄 숨은 한 자리는 상자 숨은 한 자리로 언제나 대신 풀려서(묶음 만들기에서 확인) S04는 "써 보기"만 확인한다
  const REQUIRED = { S02: 'full-house', S03: 'hidden-single-box', S07: 'naked-single', S11: 'naked-single', S12: 'pointing', S13: 'claiming', S14: 'naked-pair', S15: 'hidden-pair', S16: 'naked-triple', S17: 'x-wing', C04: 'one-line', C05: 'one-line', C07: 'blocks-all', C08: 'blocks-all', C10: 'k-lines', C11: 'k-lines', C13: 'what-if' };
  for (const l of ALL) {
    const req = REQUIRED[l.id];
    if (!req) continue;
    const cap = capOf(l.kind, req);
    for (const it of l.items.filter((i) => i.t === 'solve')) {
      const x = expandItem(it);
      const g = l.kind === 'sd' ? sdGrade(x.puzzle) : ctGrade(x.n, x.region);
      assert.ok(g.hardest >= cap, `${l.id} ${it.pack}#${it.i}: 가장 어려운 기법이 ${req} 보다 쉬움`);
      const without = l.kind === 'sd' ? sdGrade(x.puzzle, { maxTech: cap - 1 }) : ctGrade(x.n, x.region, { maxTech: cap - 1 });
      assert.equal(without.solved, false, `${l.id}: ${req} 없이도 풀림`);
    }
  }
});

test('미션: 모든 문제가 유일해, 단원 기법 상한 안, 미션 안에서 겹치지 않음', () => {
  for (const m of MISSIONS) {
    const cap = capOf(m.kind, m.maxTech);
    const texts = new Set();
    m.items.forEach((it, k) => {
      const x = expandItem(it);
      verifyPlayable(m.kind, x, cap, `${m.id}#${k + 1}`);
      texts.add(loadPuzzle({ pack: it.pack, i: it.i }).text);
    });
    assert.equal(texts.size, m.items.length, m.id);
  }
});

test('같은 문제를 두 차시(또는 미션)가 함께 한 판 풀기로 쓰지 않는다', () => {
  const used = new Map();
  for (const l of [...ALL, ...MISSIONS]) for (const it of l.items) if (it.t === 'solve') {
    const key = it.pack + '#' + it.i;
    assert.ok(!used.has(key), `${key}: ${used.get(key)}, ${l.id}`);
    used.set(key, l.id);
  }
});

test('검산기가 틀린 자료를 잡는다', () => {
  assert.throws(() => expandItem({ t: 'solve', board: '.'.repeat(16) }), /해가 하나가 아닌/);
  assert.throws(() => expandItem({ t: 'step', pack: 's4-fh', i: 0, tech: 'x-wing' }), /기법을 찾지 못함/);
  assert.throws(() => expandItem({ t: 'solve', pack: 's4-fh', i: 999 }), /묶음 문제가 없음/);
  assert.throws(() => ctParse(['AABB', 'AABB', 'CCDD', 'CCDE']), /구역 글자/);
  assert.equal(sentenceCount('하나예요. 둘이에요. 셋이에요. 넷이에요.'), 4);
});

test('별 계산과 고르기 답 확인', () => {
  assert.equal(starsFor(0, 0), 3);
  assert.equal(starsFor(1, 1), 2);
  assert.equal(starsFor(2, 1), 1);
  assert.ok(checkPick({ cells: [1, 2], mode: 'all' }, [2, 1]));
  assert.equal(checkPick({ cells: [1, 2], mode: 'all' }, [1]), false);
  assert.ok(checkPick({ cells: [1, 2], mode: 'one' }, [2]));
  void sdState;
});

test('설명 카드의 그림 판: 스도쿠는 겹침 없음, 고양이 자리는 구역 한 덩어리·고양이 규칙 지킴', () => {
  let k = 0;
  for (const l of ALL) for (const c of l.cards) if (c.board) {
    const P = loadPuzzle(c.board);
    k++;
    if (P.kind === 'sd') assert.equal(sdConflicts(P.puzzle).length, 0, l.id);
    else {
      assert.ok(ctRegionsConnected(P.n, P.region), l.id);
      assert.equal(ctConflicts(P.n, P.region, P.cats).cells.length, 0, l.id);
    }
  }
  assert.ok(k >= 5);
});
