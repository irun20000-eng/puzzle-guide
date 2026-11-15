import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, validateBackup, migrateData, STORE_KEY, MAX_PROFILES } from '../src/store.mjs';
import { loadSettings, saveSettings, cleanSettings, newsSince, shouldShowNews, resolveTheme, APP_VERSION, WHATS_NEW, DEFAULT_SETTINGS } from '../src/settings.mjs';
import { isOpen, nextLesson, PATHS } from '../src/lessons/index.mjs';

test('프로필: 최대 5명, 이름 중복·빈 이름 막기, 지우기', () => {
  const s = createStore(memoryStorage());
  for (const n of ['가', '나', '다', '라', '마']) assert.ok(s.addProfile(n).id);
  assert.deepEqual(s.addProfile('바'), { error: 'full' });
  assert.equal(s.profiles().length, MAX_PROFILES);
  const s2 = createStore(memoryStorage());
  assert.deepEqual(s2.addProfile('   '), { error: 'empty' });
  s2.addProfile('은우');
  assert.deepEqual(s2.addProfile('은우'), { error: 'duplicate' });
  assert.equal(s2.addProfile('아주아주긴이름입니다요').name.length, 8);
  const id = s2.current().id;
  assert.ok(s2.removeProfile(id));
  assert.equal(s2.current().name, '은우');
});

test('진행도: 별은 가장 좋은 기록, 미션, 오늘의 퍼즐, 최고 기록, 진행 중 퍼즐', () => {
  const mem = memoryStorage();
  const s = createStore(mem);
  s.addProfile('하나');
  s.completeLesson('S01', 2); s.completeLesson('S01', 1); s.completeLesson('S02', 3);
  assert.equal(s.starsOf('S01'), 2);
  assert.equal(s.totalStars(), 5);
  s.completeMission('MS1');
  assert.ok(s.missionDone('MS1'));
  s.recordDaily('2026-11-14', 'sudoku', 312.4, 1, 'normal');
  s.recordDaily('2026-11-14', 'sudoku', 400, 1, 'normal');
  s.recordDaily('2026-11-14', 'cats', 205, 1, 'normal');
  assert.deepEqual(s.dailyOf('2026-11-14'), { normal: { sudoku: 312, cats: 205, gen: 1 } });
  assert.deepEqual(s.dailyOf('2026-11-14', 'normal'), { sudoku: 312, cats: 205, gen: 1 });
  assert.equal(s.dailyOf('2026-11-14', 'easy'), null);
  assert.equal(s.recordBest('sd-9-easy', 420), true);
  assert.equal(s.recordBest('sd-9-easy', 500), false);
  assert.equal(s.recordBest('sd-9-easy', 300), true);
  s.saveProgress('daily-sd-2026-11-14-normal', { values: '1.2.', sec: 12 });
  // 다시 열어도 그대로
  const again = createStore(mem);
  assert.equal(again.starsOf('S01'), 2);
  assert.equal(again.bestAll()['sd-9-easy'], 300);
  assert.equal(again.progressOf('daily-sd-2026-11-14-normal').state.sec, 12);
  again.clearProgress('daily-sd-2026-11-14-normal');
  assert.equal(again.progressOf('daily-sd-2026-11-14-normal'), null);
});

test('저장: 깨진 자료, 막힌 저장소에서도 동작', () => {
  const bad = memoryStorage();
  bad.setItem(STORE_KEY, '{망가짐');
  const s = createStore(bad);
  assert.equal(s.profiles().length, 0);
  const blocked = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); } };
  const s2 = createStore(blocked);
  s2.addProfile('가');
  assert.equal(s2.current().name, '가');
  assert.equal(s2.canSave(), false);
  assert.equal(migrateData({ version: 2, profiles: [] }), null);
});

test('기록 내보내기·가져오기 왕복, 다른 앱 파일과 망가진 파일 거절', () => {
  const s = createStore(memoryStorage());
  s.addProfile('가'); s.completeLesson('C01', 3); s.recordDaily('2026-11-01', 'cats', 99, 1, 'easy');
  const file = JSON.stringify(s.exportBackup(new Date('2026-11-14T00:00:00Z')));
  const t = createStore(memoryStorage());
  assert.deepEqual(t.importBackup(file), { ok: true, count: 1 });
  assert.equal(t.starsOf('C01'), 3);
  assert.equal(t.dailyOf('2026-11-01', 'easy').cats, 99);
  assert.equal(validateBackup('not json').error, 'format');
  assert.equal(validateBackup({ app: 'baduk-guide', kind: 'backup', data: { profiles: [] } }).error, 'app');
  assert.equal(validateBackup({ app: 'puzzle-guide', kind: 'backup', data: { version: 1, profiles: [{ id: 'p1', name: '가', done: {} }, { id: 'p1', name: '나', done: {} }] } }).error, 'profiles');
});

test('설정: 기본값, 잘못된 값 거르기, 화면 밝기, 새로 생긴 것(v1.0.0)', () => {
  assert.deepEqual(cleanSettings({ theme: 'neon', challenge: 'yes', piece: 'star' }), { ...DEFAULT_SETTINGS, piece: 'star' });
  const mem = memoryStorage();
  saveSettings(mem, { ...DEFAULT_SETTINGS, theme: 'dark', challenge: true });
  assert.equal(loadSettings(mem).theme, 'dark');
  assert.equal(loadSettings(mem).challenge, true);
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
  assert.equal(APP_VERSION, '1.0.2');
  assert.ok(WHATS_NEW.every((n) => ['1.0.0', '1.0.1', '1.0.2'].includes(n.v)));
  assert.equal(WHATS_NEW[0].v, APP_VERSION);
  assert.equal(newsSince('').length, WHATS_NEW.length);
  assert.equal(newsSince('1.0.0').length, 2);
  assert.equal(newsSince('1.0.1').length, 1);
  assert.equal(newsSince('1.0.2').length, 0);
  assert.equal(shouldShowNews({ seen: '' }, false), false);
  assert.equal(shouldShowNews({ seen: '' }, true), true);
});

test('차시 열림: 길 안에서 앞 차시를 마쳐야 다음이 열리고, 미션은 단원 차시를 다 마치면', () => {
  const done = new Set();
  const isDone = (id) => done.has(id);
  assert.ok(isOpen('S01', isDone));
  assert.equal(isOpen('S02', isDone), false);
  assert.ok(isOpen('C01', isDone), '두 길은 따로');
  done.add('S01');
  assert.ok(isOpen('S02', isDone));
  assert.equal(isOpen('MS1', isDone), false);
  ['S02', 'S03', 'S04'].forEach((id) => done.add(id));
  assert.ok(isOpen('MS1', isDone));
  assert.equal(nextLesson('sd', isDone).id, 'S05');
  assert.ok(isOpen('S18', isDone, true), '모든 차시 열기');
  assert.equal(PATHS.length, 2);
});
