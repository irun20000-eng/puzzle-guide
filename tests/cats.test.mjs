import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ctParse, ctFormat, ctConflicts, ctIsSolved, ctCount, ctSolution, ctState, ctFindAll, ctGrade, ctStepText,
  ctCanonical, ctGenerate, ctBlockedBy, ctRegionsConnected, CT_TECH, ctNear,
} from '../src/cats.mjs';

test('규칙: 같은 가로줄·세로줄·구역, 8방향 닿기를 찾는다', () => {
  const q = ctParse(['AABB', 'AABB', 'CCDD', 'CCDD']);
  const why = (cats) => ctConflicts(4, q.region, cats).reasons.map((r) => r.why);
  assert.deepEqual(why([0, 2]), ['row']);
  assert.deepEqual(why([1, 13]), ['col']);
  assert.deepEqual(why([0, 5]), ['region']);
  assert.deepEqual(why([5, 10]), ['touch']); // 대각선
  assert.deepEqual(why([6, 9]), ['touch']);
  assert.equal(ctNear(4, 5, 10), true);
  assert.equal(ctNear(4, 0, 10), false);
});

test('판 글자: 소문자는 놓인 고양이, 구역은 한 덩어리', () => {
  const q = ctParse(['aAAB', 'CCaB', 'CDDB', 'CDDB']);
  assert.deepEqual(q.cats, [0, 6]);
  assert.equal(ctFormat(q.region), 'AAABCCABCDDBCDDB');
  assert.ok(ctRegionsConnected(4, q.region));
  assert.equal(ctRegionsConnected(4, ctParse(['ABAB', 'CCDD', 'CCDD', 'CCDD']).region), false);
});

test('해 세기와 완성 판정', () => {
  // 4×4 해는 (0,1)(1,3)(2,0)(3,2) 꼴 둘뿐: 구역이 해를 하나로 정한다
  const q = ctParse(['ABBB', 'AACB', 'DACC', 'DDDC']);
  const sol = ctSolution(4, q.region);
  assert.ok(sol === null || ctIsSolved(4, q.region, sol));
  const open = ctParse(['AABB', 'AABB', 'CCDD', 'CCDD']);
  assert.equal(ctCount(4, open.region, 3), 2); // 네 구역이 2×2 네모이면 해가 둘(좌우 대칭)
  const g = ctGenerate(6, 5, {});
  assert.equal(ctCount(6, g.region, 3), 1);
  assert.ok(ctIsSolved(6, g.region, g.solution));
  assert.equal(ctIsSolved(6, g.region, g.solution.slice(1)), false);
});

test('지우기 표시: 고양이 하나가 막는 칸 = 줄 + 세로줄 + 구역 + 둘레', () => {
  const q = ctParse(['aABB', 'AABB', 'CCDD', 'CCDD']);
  assert.deepEqual(ctBlockedBy(4, q.region, 0), [1, 2, 3, 4, 5, 8, 12]);
});

test('기법 목록은 기획서 순서', () => {
  assert.deepEqual(CT_TECH.map((t) => t.id), ['last-spot', 'one-line', 'blocks-all', 'k-lines', 'what-if']);
});

test('기법: 한 줄에 갇힌 구역(기획서 9장 예 판)', () => {
  const q = ctParse(['AABBB', 'CCCBB', 'CDDEE', 'DDDEE', 'DDEEE']);
  const steps = ctFindAll(ctState(5, q.region), 'one-line');
  const s = steps.find((x) => x.variant === 'reg-in-line' && x.reg.i === 0);
  assert.ok(s, 'A 구역이 맨 위 줄에 갇힘');
  assert.equal(s.line.kind, 'row'); assert.equal(s.line.i, 0);
  assert.deepEqual(s.elim, [2, 3, 4]);
  assert.match(ctStepText(5, s).why, /1번 구역의 남은 자리가 모두 1번째 가로줄에 있어요/);
});

test('풀이기: 단계가 정답 칸을 지우지 않고, 놓는 칸은 정답이다(크기마다 60판)', () => {
  for (const n of [4, 5, 6, 7, 8]) for (let k = 0; k < 60; k++) {
    const g = ctGenerate(n, n * 1000 + k, { balance: k % 2 ? 3 : 0, attempts: 1 });
    if (!g) continue;
    const sol = new Set(g.solution);
    const r = ctGrade(n, g.region, { keepSteps: true });
    assert.ok(r.solved);
    for (const s of r.steps) {
      for (const x of s.place || []) assert.ok(sol.has(x), s.tech + ' 가 틀린 칸에 놓음');
      for (const x of s.elim || []) assert.ok(!sol.has(x), s.tech + ' 가 정답 칸을 지움');
      const t = ctStepText(n, s);
      for (const v of Object.values(t)) assert.ok(v && !/undefined|NaN|null/.test(v), s.tech + ' 문장: ' + v);
    }
  }
});

test('같은 판 찾기: 돌리기·뒤집기·구역 글자 바꾸기', () => {
  const q = ctParse(['AABBB', 'CCCBB', 'CDDEE', 'DDDEE', 'DDEEE']);
  const flip = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) flip.push(q.region[r * 5 + (4 - c)]);
  const rot = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) rot.push(q.region[c * 5 + (4 - r)]);
  assert.equal(ctCanonical(flip), ctCanonical(q.region));
  assert.equal(ctCanonical(rot), ctCanonical(q.region));
  assert.equal(ctCanonical(q.region.map((g) => (g + 2) % 5)), ctCanonical(q.region));
});
