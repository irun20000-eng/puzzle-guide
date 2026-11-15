// v1.0.2 오늘의 퍼즐 기록: 날짜 × 난이도 × 퍼즐, 진행 중 저장 여러 칸, rev 1 기록 옮기기
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, migrateData, migrateDay, dayFlags, validateBackup, STORE_KEY, STORE_REV, MAX_PROGRESS } from '../src/store.mjs';

// rev 1(v1.0.0·v1.0.1) 형식으로 저장된 자료
function oldData() {
  return {
    version: 1, rev: 1, current: 'p1',
    profiles: [
      {
        id: 'p1', name: '은우', color: 0, level: 'normal', done: { S01: { stars: 3 } }, missions: {}, best: { 'daily-sd-normal': 200 }, review: [], last: 'S01',
        daily: {
          '2026-11-10': { sudoku: 300, cats: 250, gen: 1, level: 'normal' },         // level 있음 → 보통
          '2026-11-11': { sudoku: 120, gen: 1 },                                     // level 없음 → 쉬움
          '2026-11-12': { cats: 99, catsHelp: true, gen: 1, level: 'hard' },         // 힌트 기록 → 어려움, 힌트 표시 유지
          '2026-11-13': { sudoku: 410, sudokuHelp: true, cats: 77, level: 'easy' },
          'bad-date': { sudoku: 5 },                                                  // 날짜 아님 → 원래도 버림
        },
        inProgress: { key: 'daily-ct-2026-11-14-normal', state: { t: 42, cats: [3] }, at: 1000 },
      },
      { id: 'p2', name: '하린', color: 1, level: 'easy', done: {}, daily: { '2026-11-14': { cats: 61, gen: 1, level: 'easy' } }, inProgress: null },
    ],
  };
}

// 옛 기록의 (날짜, 퍼즐, 초, 힌트) 모두가 새 형식 어딘가에 같은 값으로 있는지
function sameRecords(oldDaily, newDaily) {
  let n = 0;
  for (const [date, v] of Object.entries(oldDaily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const lv = v.level || 'easy';
    for (const w of ['sudoku', 'cats']) {
      if (v[w] === undefined) continue;
      const e = newDaily[date] && newDaily[date][lv];
      assert.ok(e, `${date} ${lv} 칸이 없음`);
      assert.equal(e[w], v[w], `${date} ${w}`);
      assert.equal(Boolean(e[w + 'Help']), Boolean(v[w + 'Help']), `${date} ${w} 힌트 표시`);
      n++;
    }
  }
  return n;
}

test('옮기기: rev 1 기록이 날짜 × 난이도 × 퍼즐로, 손실 0(level 없으면 쉬움)', () => {
  const src = oldData();
  const m = migrateData(JSON.parse(JSON.stringify(src)));
  assert.equal(m.rev, STORE_REV);
  let total = 0;
  m.profiles.forEach((p, i) => { total += sameRecords(src.profiles[i].daily, p.daily); });
  assert.equal(total, 7, '옛 기록 7개가 모두 옮겨짐');
  const p1 = m.profiles[0];
  assert.deepEqual(p1.daily['2026-11-10'], { normal: { sudoku: 300, cats: 250, gen: 1 } });
  assert.deepEqual(p1.daily['2026-11-11'], { easy: { sudoku: 120, gen: 1 } });
  assert.deepEqual(p1.daily['2026-11-12'], { hard: { cats: 99, catsHelp: true, gen: 1 } });
  assert.equal(p1.daily['bad-date'], undefined);
  // 진행 중 한 칸도 옮김
  assert.deepEqual(Object.keys(p1.progress), ['daily-ct-2026-11-14-normal']);
  assert.equal(p1.progress['daily-ct-2026-11-14-normal'].state.t, 42);
  assert.equal('inProgress' in p1, false);
  // 차시·최고 기록은 그대로
  assert.deepEqual(p1.done, { S01: { stars: 3 } });
  assert.equal(p1.best['daily-sd-normal'], 200);
});

test('옮기기: 두 번 열어도(두 번 옮겨도) 같고, 저장소로 다시 열어도 이중 이전 없음', () => {
  const once = migrateData(oldData());
  const twice = migrateData(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice, once);
  const mem = memoryStorage();
  mem.setItem(STORE_KEY, JSON.stringify(oldData()));
  const a = createStore(mem);
  a.recordDaily('2026-11-14', 'sudoku', 150, 1, 'hard');     // 저장을 일으킴(새 형식으로 쓰임)
  const saved1 = mem.getItem(STORE_KEY);
  const b = createStore(mem);
  b.selectProfile('p1');                                       // 다시 저장
  assert.equal(mem.getItem(STORE_KEY), saved1);
  assert.deepEqual(b.dailyOf('2026-11-10'), { normal: { sudoku: 300, cats: 250, gen: 1 } });
  assert.deepEqual(b.dailyOf('2026-11-14'), { hard: { sudoku: 150, gen: 1 } });
  // 새 형식 하루 칸에 migrateDay 를 다시 돌려도 그대로
  const day = { easy: { sudoku: 10 }, hard: { cats: 20, catsHelp: true, gen: 1 } };
  assert.deepEqual(migrateDay(day), day);
  assert.deepEqual(migrateDay(migrateDay(day)), day);
});

test('난이도별 기록: 쉬움을 풀어도 보통·어려움은 「아직」, 다른 난이도가 level 을 덮어쓰지 않음', () => {
  const s = createStore(memoryStorage());
  s.addProfile('가');
  s.recordDaily('2026-11-15', 'sudoku', 192, 1, 'easy');
  assert.deepEqual(s.dailyOf('2026-11-15', 'easy'), { sudoku: 192, gen: 1 });
  assert.equal(s.dailyOf('2026-11-15', 'normal'), null);
  assert.equal(s.dailyOf('2026-11-15', 'hard'), null);
  s.recordDaily('2026-11-15', 'cats', 300, 1, 'hard');
  s.recordDaily('2026-11-15', 'sudoku', 500, 1, 'hard', true);   // 힌트로 끝낸 판
  assert.deepEqual(s.dailyOf('2026-11-15'), { easy: { sudoku: 192, gen: 1 }, hard: { cats: 300, sudoku: 500, sudokuHelp: true, gen: 1 } });
  // 같은 난이도 다시: 더 빠른 기록, 혼자 푼 기록이 힌트 기록을 이김
  s.recordDaily('2026-11-15', 'sudoku', 200, 1, 'easy');
  assert.equal(s.dailyOf('2026-11-15', 'easy').sudoku, 192);
  s.recordDaily('2026-11-15', 'sudoku', 700, 1, 'hard');
  assert.deepEqual(s.dailyOf('2026-11-15', 'hard'), { cats: 300, sudoku: 700, gen: 1 });
  s.recordDaily('2026-11-15', 'sudoku', 100, 1, 'hard', true);  // 힌트 기록은 혼자 푼 기록을 못 이김
  assert.deepEqual(s.dailyOf('2026-11-15', 'hard'), { cats: 300, sudoku: 700, gen: 1 });
  // 난이도를 모르면 쉬움
  s.recordDaily('2026-11-16', 'cats', 50, 1, undefined);
  assert.deepEqual(s.dailyOf('2026-11-16'), { easy: { cats: 50, gen: 1 } });
});

test('달력·주간 규칙: 하루에 어느 난이도든 혼자 풀면 solo(✓), 힌트로만 끝내면 help(점)', () => {
  assert.deepEqual(dayFlags(null), { sudoku: null, cats: null });
  assert.deepEqual(dayFlags({ hard: { sudoku: 10 } }), { sudoku: 'solo', cats: null });
  assert.deepEqual(dayFlags({ easy: { cats: 10, catsHelp: true } }), { sudoku: null, cats: 'help' });
  // 한 난이도는 힌트, 다른 난이도는 혼자 → solo
  assert.deepEqual(dayFlags({ easy: { cats: 10, catsHelp: true }, normal: { cats: 30 } }), { sudoku: null, cats: 'solo' });
  assert.deepEqual(dayFlags({ easy: { cats: 30 }, normal: { cats: 10, catsHelp: true } }), { sudoku: null, cats: 'solo' });
  // 옛 기록을 옮긴 뒤에도 같은 판정
  const m = migrateData(oldData()).profiles[0].daily;
  assert.deepEqual(dayFlags(m['2026-11-10']), { sudoku: 'solo', cats: 'solo' });
  assert.deepEqual(dayFlags(m['2026-11-12']), { sudoku: null, cats: 'help' });
  assert.deepEqual(dayFlags(m['2026-11-13']), { sudoku: 'help', cats: 'solo' });
});

test('진행 중 저장: 퍼즐마다 한 칸, 난이도를 바꿔도 하던 판 유지, 지난 날짜 정리, 최대 7칸', () => {
  const s = createStore(memoryStorage());
  s.addProfile('가');
  s.saveProgress('daily-sd-2026-11-15-easy', { t: 10 }, 1);
  s.saveProgress('daily-sd-2026-11-15-hard', { t: 20 }, 2);
  s.saveProgress('daily-ct-2026-11-15-easy', { t: 30 }, 3);
  s.saveProgress('free', { t: 40 }, 4);
  assert.equal(s.progressOf('daily-sd-2026-11-15-easy').state.t, 10);
  assert.equal(s.progressOf('daily-sd-2026-11-15-hard').state.t, 20);
  assert.equal(s.progressKeys().length, 4);
  s.saveProgress('S03#2', { t: 1 });                 // 차시 등 모르는 키는 저장하지 않음
  assert.equal(s.progressKeys().length, 4);
  // 다음 날 저장하면 지난 날짜 칸은 지워지고 자유 연습 칸은 남음
  s.saveProgress('daily-ct-2026-11-16-normal', { t: 5 }, 5);
  assert.deepEqual(s.progressKeys().sort(), ['daily-ct-2026-11-16-normal', 'free']);
  // 앱을 열 때 정리
  s.pruneProgress('2026-11-17');
  assert.deepEqual(s.progressKeys(), ['free']);
  // 한 날의 6칸 + 자유 연습 1칸 = 7칸까지
  let at = 10;
  for (const w of ['sd', 'ct']) for (const lv of ['easy', 'normal', 'hard']) s.saveProgress(`daily-${w}-2026-11-17-${lv}`, { t: at }, at++);
  assert.equal(s.progressKeys().length, MAX_PROGRESS);
  const many = {};
  for (let k = 0; k < 12; k++) many[`daily-sd-2026-11-${String(k + 1).padStart(2, '0')}-easy`] = { state: { t: k }, at: k };
  const m = migrateData({ version: 1, profiles: [{ id: 'p1', name: '가', done: {}, progress: many }] });
  assert.equal(Object.keys(m.profiles[0].progress).length, MAX_PROGRESS);
  assert.ok(m.profiles[0].progress['daily-sd-2026-11-12-easy'], '새 것부터 남김');
});

test('기록 파일: 옛 판(rev 1) 파일 가져오기 → 옮김, 새 판 파일 내보내기·가져오기 왕복', () => {
  const oldFile = { app: 'puzzle-guide', kind: 'backup', exportedAt: '2026-11-14T00:00:00Z', data: oldData() };
  const t = createStore(memoryStorage());
  assert.deepEqual(t.importBackup(JSON.stringify(oldFile)), { ok: true, count: 2 });
  assert.equal(sameRecords(oldData().profiles[0].daily, t.dailyAll()), 6);
  assert.equal(t.progressOf('daily-ct-2026-11-14-normal').state.t, 42);
  t.recordDaily('2026-11-15', 'cats', 88, 1, 'normal');
  const file = JSON.stringify(t.exportBackup(new Date('2026-11-15T00:00:00Z')));
  const u = createStore(memoryStorage());
  assert.deepEqual(u.importBackup(file), { ok: true, count: 2 });
  assert.deepEqual(u.dailyAll(), t.dailyAll());
  assert.ok(validateBackup(file).ok);
  u.selectProfile('p2');
  assert.deepEqual(u.dailyOf('2026-11-14'), { easy: { cats: 61, gen: 1 } });
});
