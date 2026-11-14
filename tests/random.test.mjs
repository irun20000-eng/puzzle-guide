// 무작위 대량 검사: 기기에서 만드는 퍼즐(오늘의 퍼즐·자유 연습)이 유일해이고, 기법만으로 풀리고, 같은 씨앗이면 같은 판인지.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sdGenerate, sdCount, sdGrade, sdFormat } from '../src/sudoku.mjs';
import { ctGenerate, ctCount, ctGrade, ctFormat, ctRegionsConnected } from '../src/cats.mjs';
import { practiceSudoku, practiceCats, dailyPuzzles, SD_LEVELS, CT_LEVELS } from '../src/daily.mjs';

const SD_N = Number(process.env.RANDOM_SD || 1500);
const CT_N = Number(process.env.RANDOM_CT || 1000);
export const RANDOM_COUNTS = { SD_N, CT_N };

test(`스도쿠 ${SD_N}판: 유일해, 기법만으로 풀림, 같은 씨앗 같은 판`, () => {
  let checked = 0;
  for (let k = 0; k < SD_N; k++) {
    const n = [4, 6, 9][k % 3];
    const level = ['easy', 'normal', 'hard'][Math.floor(k / 3) % 3];
    const g = practiceSudoku(n, level, 100000 + k);
    assert.equal(sdCount(g.puzzle, 2), 1, '유일해');
    const r = sdGrade(g.puzzle);
    assert.ok(r.solved, '기법만으로 풀림');
    assert.ok(r.hardest <= SD_LEVELS[level].max, '난이도 상한');
    if (k % 10 === 0) assert.equal(sdFormat(practiceSudoku(n, level, 100000 + k).puzzle), sdFormat(g.puzzle), '재현');
    checked++;
  }
  assert.equal(checked, SD_N);
});

test(`고양이 자리 ${CT_N}판(4×4~8×8): 유일해, 기법만으로 풀림, 같은 씨앗 같은 판`, () => {
  let checked = 0;
  for (let k = 0; k < CT_N; k++) {
    const n = 4 + (k % 5);
    const level = ['easy', 'normal', 'hard'][Math.floor(k / 5) % 3];
    const g = practiceCats(n, level, 200000 + k);
    assert.ok(g, '생성 실패 없음');
    assert.equal(ctCount(n, g.region, 2), 1, '유일해');
    assert.ok(ctRegionsConnected(n, g.region), '구역은 한 덩어리');
    const r = ctGrade(n, g.region);
    assert.ok(r.solved, '기법만으로 풀림');
    if (k % 10 === 0) assert.equal(ctFormat(practiceCats(n, level, 200000 + k).region), ctFormat(g.region), '재현');
    checked++;
  }
  assert.equal(checked, CT_N);
  void CT_LEVELS;
});

test('오늘의 퍼즐: 같은 날짜·난이도면 같은 판, 날짜가 다르면 다른 판(60일)', () => {
  const seen = new Set();
  for (let d = 0; d < 60; d++) {
    const date = new Date(Date.UTC(2026, 10, 1 + d)).toISOString().slice(0, 10);
    for (const level of ['easy', 'normal', 'hard']) {
      const a = dailyPuzzles(date, level), b = dailyPuzzles(date, level);
      assert.equal(sdFormat(a.sudoku.puzzle), sdFormat(b.sudoku.puzzle));
      assert.equal(ctFormat(a.cats.region), ctFormat(b.cats.region));
      assert.equal(sdCount(a.sudoku.puzzle, 2), 1);
      assert.equal(ctCount(a.cats.n, a.cats.region, 2), 1);
      seen.add(level + sdFormat(a.sudoku.puzzle));
    }
  }
  assert.equal(seen.size, 180);
});

test('생성기 원형: sdGenerate·ctGenerate 도 씨앗 재현', () => {
  assert.equal(sdFormat(sdGenerate(9, 42).puzzle), sdFormat(sdGenerate(9, 42).puzzle));
  assert.equal(ctFormat(ctGenerate(8, 42).region), ctFormat(ctGenerate(8, 42).region));
});

test('오늘의 퍼즐 난이도 이름표 = 엔진 등급(검수 PZ-R1): 30일 × 보통·어려움', async () => {
  const { sdLevelOf } = await import('../src/sudoku.mjs');
  const { ctLevelOf } = await import('../src/cats.mjs');
  let ok = 0, total = 0;
  for (let d = 0; d < 30; d++) {
    const date = new Date(Date.UTC(2026, 11, 1 + d)).toISOString().slice(0, 10);
    for (const level of ['normal', 'hard']) {
      const p = dailyPuzzles(date, level);
      total += 2;
      if (sdLevelOf(p.sudoku.grade.hardest) === level) ok++;
      if (ctLevelOf(p.cats.grade.hardest) === level) ok++;
    }
  }
  assert.ok(ok / total >= 0.95, `${ok}/${total}`);
  console.log(`오늘의 퍼즐 이름표 일치 ${ok}/${total}`);
});
