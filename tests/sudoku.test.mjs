import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sdShape, sdParse, sdFormat, sdConflicts, sdIsSolved, sdCount, sdSolution, sdState, sdFindAll, sdGrade,
  sdStepText, sdCanonical, sdGenerate, SD_TECH, SD_TECH_INDEX, sdLevelOf,
} from '../src/sudoku.mjs';

const SOLVED9 = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

test('판 모양: 4×4 상자 2×2, 6×6 상자 2×3(가로 3, 세로 2), 9×9 상자 3×3', () => {
  const s4 = sdShape(4), s6 = sdShape(6), s9 = sdShape(9);
  assert.deepEqual(s4.boxes[0].cells, [0, 1, 4, 5]);
  assert.deepEqual(s6.boxes[0].cells, [0, 1, 2, 6, 7, 8]);
  assert.deepEqual(s6.boxes[1].cells, [3, 4, 5, 9, 10, 11]);
  assert.equal(s6.boxes.length, 6);
  assert.deepEqual(s9.boxes[4].cells, [30, 31, 32, 39, 40, 41, 48, 49, 50]);
  for (const s of [s4, s6, s9]) for (const p of s.peers) assert.equal(p.length, s.n === 4 ? 7 : s.n === 6 ? 12 : 20);
});

test('규칙: 줄·세로줄·상자에서 겹친 숫자를 찾는다', () => {
  assert.deepEqual(sdConflicts(sdParse('1..1............')), [0, 3]);
  assert.deepEqual(sdConflicts(sdParse('2...........2...')), [0, 12]);
  assert.deepEqual(sdConflicts(sdParse('4....4..........')), [0, 5]);
  assert.deepEqual(sdConflicts(sdParse('1234341221434321')), []);
  assert.ok(sdIsSolved(sdParse(SOLVED9)));
  const broken = sdParse(SOLVED9); [broken[0], broken[1]] = [broken[1], broken[0]];
  assert.equal(sdIsSolved(broken), false);
});

test('해 세기: 0개, 1개, 2개에서 멈춤', () => {
  const g = sdParse(SOLVED9);
  assert.equal(sdCount(g), 1);
  const bad = g.slice(); bad[1] = bad[0];
  assert.equal(sdCount(bad), 0);
  const empty = new Array(81).fill(0);
  assert.equal(sdCount(empty, 2), 2);
  // 두 칸 짝을 바꿔도 되는 판: 해 2개
  const two = g.slice();
  // 534|678 → 5,3 이 있는 1·2칸과 아래 줄 맞바꿀 수 있는 직사각형을 비우면 해가 여럿일 수 있음
  for (const x of [0, 1, 9, 10]) two[x] = 0;
  assert.ok(sdCount(two, 3) >= 1);
  assert.deepEqual(sdSolution(g.map((v, x) => (x % 9 === 0 ? 0 : v))), g);
});

test('주어진 수가 17개 미만인 9×9는 언제나 해가 여럿이다(무작위 50판)', () => {
  const sol = sdParse(SOLVED9);
  let r = 12345;
  const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let k = 0; k < 50; k++) {
    const keep = new Set();
    while (keep.size < 16) keep.add(Math.floor(rand() * 81));
    const p = sol.map((v, x) => (keep.has(x) ? v : 0));
    assert.equal(sdCount(p, 2), 2);
  }
});

test('기법 목록은 기획서 순서이고 숨은 한 자리(상자·줄), 가리키기·차지하기가 나뉘어 있다', () => {
  assert.deepEqual(SD_TECH.map((t) => t.id), ['full-house', 'hidden-single-box', 'hidden-single-line', 'naked-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing']);
  assert.equal(sdLevelOf(SD_TECH_INDEX['hidden-single-line']), 'easy');
  assert.equal(sdLevelOf(SD_TECH_INDEX['pointing']), 'normal');
  assert.equal(sdLevelOf(SD_TECH_INDEX['x-wing']), 'hard');
});

test('기법: 마지막 빈칸, 숨은 한 자리, 하나뿐인 숫자를 고정 판에서 찾는다', () => {
  // 맨 윗줄 빈칸 하나 → 마지막 빈칸
  const fh = sdState(sdParse('123.............'));
  const s1 = sdFindAll(fh, 'full-house');
  assert.equal(s1[0].place[0].x, 3); assert.equal(s1[0].place[0].d, 4);
  // 기획서 9장 예: 왼쪽 위 상자에서 3의 자리 (* 칸 = 1줄... 아닌 2줄 2칸)
  const hb = sdState(sdParse('...3' + '....' + '3...' + '....'));
  const s2 = sdFindAll(hb, 'hidden-single-box').find((s) => s.digit === 3 && s.unit.i === 0);
  assert.equal(s2.place[0].x, 5);
  // 하나뿐인 숫자: 1줄 1칸의 줄에 2,3 세로줄에 4 → 1뿐
  const ns = sdState(sdParse('.23.' + '4...' + '....' + '....'));
  const s3 = sdFindAll(ns, 'naked-single').find((s) => s.cell === 0);
  assert.equal(s3.place[0].d, 1);
});

test('기법: 가리키기와 차지하기는 다른 쪽을 지운다', () => {
  // 쓸모 있는 판을 엔진 생성으로 고르고, 단계의 지우는 칸이 정의대로인지 확인한다
  const g = sdGenerate(9, 903, { maxTech: 'pointing', minTech: 'pointing', attempts: 40 });
  assert.ok(g.met);
  const st = sdState(g.puzzle);
  let found = null;
  for (let i = 0; i < 200 && !found; i++) {
    const p = sdFindAll(st, 'pointing');
    if (p.length) found = p[0];
    else { const r = sdGrade(g.puzzle); assert.ok(r.solved); break; }
  }
  const g2 = sdGrade(g.puzzle, { keepSteps: true });
  const pt = g2.steps.find((s) => s.tech === 'pointing');
  assert.ok(pt);
  for (const e of pt.elim) {
    assert.ok(pt.line.cells.includes(e.x), '가리키기는 줄에서 지운다');
    assert.ok(!pt.box.cells.includes(e.x), '상자 밖에서만');
  }
  assert.ok(pt.cells.every((x) => pt.box.cells.includes(x) && pt.line.cells.includes(x)));
});

test('풀이기: 각 기법 단계는 정답을 지우거나 틀린 수를 놓지 않는다(400판)', () => {
  for (let k = 0; k < 400; k++) {
    const n = [4, 6, 9][k % 3];
    const g = sdGenerate(n, 7000 + k, { attempts: 1, logic: k % 2 === 0 });
    if (!g) continue;
    const r = sdGrade(g.puzzle, { keepSteps: true });
    const st = sdState(g.puzzle);
    for (const s of r.steps) {
      for (const { x, d } of s.place || []) assert.equal(d, g.solution[x], s.tech);
      for (const { x, mask } of s.elim || []) assert.equal(mask & (1 << (g.solution[x] - 1)), 0, s.tech + ' 가 정답 후보를 지움');
      const t = sdStepText(n, s);
      for (const v of Object.values(t)) assert.ok(v && !/undefined|NaN|null/.test(v), s.tech + ' 문장: ' + v);
      void st;
    }
  }
});

test('같은 판 찾기: 돌리기·뒤집기·숫자 바꾸기를 같은 판으로 본다', () => {
  const p = sdParse('8.7.....14.5.9..........3.8.2....6...7..24.5.....6.7.....73.......9.1...9...8..2.');
  const flip = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) flip.push(p[r * 9 + (8 - c)]);
  const swapped = p.map((v) => (v ? 10 - v : 0));
  const rot = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) rot.push(p[(8 - c) * 9 + r]);
  assert.equal(sdCanonical(flip), sdCanonical(p));
  assert.equal(sdCanonical(swapped), sdCanonical(p));
  assert.equal(sdCanonical(rot), sdCanonical(p));
  assert.equal(sdFormat(p).length, 81);
});
