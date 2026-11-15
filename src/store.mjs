// 프로필과 진행도 저장. 기기 안(localStorage)에만 저장하고 밖으로 보내지 않는다(바둑 첫걸음 store 를 고쳐 씀).
// storage 는 getItem/setItem 을 가진 객체. 저장이 막힌 환경에서도 앱은 동작한다(저장만 안 됨).
// 형식(version 1, rev 2): { version, rev, current, profiles: [{ id, name, color, level, done, missions, daily, best, progress, review, last }] }
// rev 2(v1.0.2): 오늘의 퍼즐 기록을 날짜 × 난이도 × 퍼즐로 나눔 daily[date][level] = { sudoku, cats, sudokuHelp, catsHelp, gen },
//   진행 중 저장을 퍼즐별 여러 칸으로 progress[key] = { state, at }(오늘의 퍼즐 난이도×퍼즐 최대 6칸 + 자유 연습 1칸).
//   rev 1 기록(daily[date] = { sudoku, cats, level, ... }, inProgress 한 칸)은 읽을 때 옮긴다(level 이 없으면 쉬움).
export const STORE_KEY = 'puzzle-guide:v1';
export const STORE_REV = 2;
export const MAX_PROGRESS = 7;
export const MAX_PROFILES = 5;
export const MAX_NAME = 8;
export const MAX_REVIEW = 60;
export const MAX_DAILY = 800;
export const BACKUP_APP = 'puzzle-guide';
export const LEVELS = ['easy', 'normal', 'hard'];

function emptyData() {
  return { version: 1, rev: STORE_REV, current: null, profiles: [] };
}

function isValid(d) {
  return Boolean(d) && d.version === 1 && Array.isArray(d.profiles) &&
    d.profiles.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && p.done && typeof p.done === 'object');
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const secs = (v) => (Number.isFinite(v) && v >= 0 && v < 360000 ? Math.round(v) : null);

const PUZZLES = ['sudoku', 'cats'];

// 한 난이도 칸 { sudoku, cats, sudokuHelp, catsHelp, gen } 을 고른다. 푼 것이 없으면 null.
function cleanLevelEntry(v) {
  if (!v || typeof v !== 'object') return null;
  const e = {};
  for (const w of PUZZLES) {
    if (secs(v[w]) === null) continue;
    e[w] = secs(v[w]);
    // 힌트 3단계로 채운 판(혼자 푼 기록이 없을 때만 남는다)
    if (v[w + 'Help'] === true) e[w + 'Help'] = true;
  }
  if (Number.isInteger(v.gen)) e.gen = v.gen;
  return e.sudoku !== undefined || e.cats !== undefined ? e : null;
}

// 같은 난이도 칸 둘을 합친다(혼자 푼 기록 > 힌트 기록, 같은 종류면 더 빠른 것)
function mergeLevelEntry(a, b) {
  if (!a) return b;
  if (!b) return a;
  const e = { ...a };
  for (const w of PUZZLES) {
    if (b[w] === undefined) continue;
    const hk = w + 'Help';
    if (e[w] === undefined || (e[hk] && !b[hk])) { e[w] = b[w]; if (b[hk]) e[hk] = true; else delete e[hk]; }
    else if (Boolean(e[hk]) === Boolean(b[hk])) e[w] = Math.min(e[w], b[w]);
  }
  if (b.gen !== undefined && e.gen === undefined) e.gen = b.gen;
  return e;
}

// 하루 칸: rev 2 형식 { easy: {...}, normal: {...}, hard: {...} }.
// rev 1 형식(맨 위에 sudoku·cats·level)은 그 level(없으면 easy) 칸으로 옮긴다. 이미 옮긴 칸에 다시 돌려도 그대로다.
export function migrateDay(v) {
  if (!v || typeof v !== 'object') return null;
  const out = {};
  for (const lv of LEVELS) { const e = cleanLevelEntry(v[lv]); if (e) out[lv] = e; }
  const old = cleanLevelEntry(v);
  if (old) { const lv = LEVELS.includes(v.level) ? v.level : 'easy'; out[lv] = mergeLevelEntry(out[lv], old); }
  return Object.keys(out).length ? out : null;
}

function cleanDaily(daily) {
  const out = {};
  if (!daily || typeof daily !== 'object') return out;
  const keys = Object.keys(daily).filter((k) => DATE_RE.test(k)).sort().slice(-MAX_DAILY);
  for (const k of keys) {
    const day = migrateDay(daily[k]);
    if (day) out[k] = day;
  }
  return out;
}

// 하루 기록 요약: 퍼즐마다 'solo'(어느 난이도든 혼자 풂) | 'help'(힌트와 함께만) | null
export function dayFlags(day) {
  const f = { sudoku: null, cats: null };
  if (!day) return f;
  for (const lv of LEVELS) {
    const e = day[lv];
    if (!e) continue;
    for (const w of PUZZLES) if (e[w] !== undefined) f[w] = !e[w + 'Help'] || f[w] === 'solo' ? 'solo' : 'help';
  }
  return f;
}

function cleanProgressItem(v) {
  if (!v || typeof v !== 'object' || typeof v.state !== 'object' || !v.state) return null;
  const json = JSON.stringify(v.state);
  if (json.length > 4000) return null;
  return { state: JSON.parse(json), at: Number.isFinite(v.at) ? v.at : 0 };
}

const PROGRESS_KEY_RE = /^(?:daily-(?:sd|ct)-\d{4}-\d{2}-\d{2}-(?:easy|normal|hard)|free)$/;

// 진행 중 저장 여러 칸. rev 1 의 inProgress(한 칸)도 옮긴다. 새 것부터 MAX_PROGRESS 칸.
function cleanProgress(map, oldOne) {
  const items = [];
  if (map && typeof map === 'object') for (const [k, v] of Object.entries(map)) {
    const c = PROGRESS_KEY_RE.test(k) ? cleanProgressItem(v) : null;
    if (c) items.push([k, c]);
  }
  if (oldOne && typeof oldOne === 'object' && typeof oldOne.key === 'string' && PROGRESS_KEY_RE.test(oldOne.key) && !items.some(([k]) => k === oldOne.key)) {
    const c = cleanProgressItem(oldOne);
    if (c) items.push([oldOne.key, c]);
  }
  items.sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(items.slice(0, MAX_PROGRESS));
}

// 지난 날짜의 오늘의 퍼즐 진행은 지운다(자유 연습 칸은 남김)
function pruneProgressMap(map, today) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) if (k === 'free' || k.slice(9, 19) === today) out[k] = v;
  return out;
}

// 예전 형식이나 빠진 칸이 있는 자료를 지금 형식으로 맞춘다. 맞출 수 없으면 null.
export function migrateData(d) {
  if (!isValid(d)) return null;
  const profiles = d.profiles.map((p) => {
    const done = {};
    for (const [k, v] of Object.entries(p.done)) {
      if (k.length > 8) continue;
      const stars = v && Number.isFinite(v.stars) ? Math.max(1, Math.min(3, Math.round(v.stars))) : 1;
      done[k] = { stars };
    }
    const missions = {};
    if (p.missions && typeof p.missions === 'object') for (const [k, v] of Object.entries(p.missions)) if (v && k.length <= 8) missions[k] = true;
    const best = {};
    if (p.best && typeof p.best === 'object') for (const [k, v] of Object.entries(p.best)) if (k.length <= 30 && secs(v) !== null) best[k] = secs(v);
    const review = Array.isArray(p.review) ? [...new Set(p.review.filter((k) => typeof k === 'string' && k.length <= 20))].slice(-MAX_REVIEW) : [];
    return {
      id: p.id, name: p.name,
      color: Number.isInteger(p.color) ? p.color : 0,
      level: LEVELS.includes(p.level) ? p.level : 'easy',
      done, missions, best, review,
      daily: cleanDaily(p.daily),
      progress: cleanProgress(p.progress, p.inProgress),
      last: typeof p.last === 'string' ? p.last : null,
    };
  });
  const current = profiles.some((p) => p.id === d.current) ? d.current : (profiles[0] ? profiles[0].id : null);
  return { version: 1, rev: STORE_REV, current, profiles };
}

// 기록 파일(내보내기 결과)을 검사한다. { ok: true, data } 또는 { ok: false, error }
export function validateBackup(obj) {
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch (err) { return { ok: false, error: 'format' }; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'format' };
  if (obj.app !== BACKUP_APP || obj.kind !== 'backup') return { ok: false, error: 'app' };
  const raw = obj.data;
  if (!raw || !Array.isArray(raw.profiles)) return { ok: false, error: 'format' };
  if (raw.profiles.length > MAX_PROFILES) return { ok: false, error: 'too-many' };
  const data = migrateData(raw);
  if (!data) return { ok: false, error: 'profiles' };
  const ids = new Set();
  const names = new Set();
  for (const p of data.profiles) {
    const clean = cleanName(p.name);
    if (!clean || clean !== p.name || ids.has(p.id) || names.has(p.name)) return { ok: false, error: 'profiles' };
    ids.add(p.id);
    names.add(p.name);
  }
  return { ok: true, data };
}

export function cleanName(name) {
  return [...String(name ?? '').replace(/\s+/g, ' ').trim()].slice(0, MAX_NAME).join('');
}

export function createStore(storage) {
  let data = emptyData();
  try {
    const raw = storage.getItem(STORE_KEY);
    const migrated = migrateData(raw ? JSON.parse(raw) : null);
    if (migrated) data = migrated;
  } catch (err) {
    data = emptyData();
  }
  let saveOk = true;
  const save = () => {
    try { storage.setItem(STORE_KEY, JSON.stringify(data)); saveOk = true; } catch (err) { saveOk = false; }
  };
  const current = () => data.profiles.find((p) => p.id === data.current) || null;
  const withP = (fn, fallback) => { const p = current(); return p ? fn(p) : fallback; };

  return {
    canSave: () => saveOk,
    profiles: () => data.profiles.map((p) => ({ ...p })),
    current,

    // 성공하면 프로필, 실패하면 { error: 'empty' | 'full' | 'duplicate' }
    addProfile(name) {
      const clean = cleanName(name);
      if (!clean) return { error: 'empty' };
      if (data.profiles.length >= MAX_PROFILES) return { error: 'full' };
      if (data.profiles.some((p) => p.name === clean)) return { error: 'duplicate' };
      const used = data.profiles.map((p) => Number(p.id.slice(1)) || 0);
      const n = Math.max(0, ...used) + 1;
      const colors = data.profiles.map((p) => p.color);
      let color = 0;
      while (colors.includes(color) && color < MAX_PROFILES) color++;
      const profile = { id: 'p' + n, name: clean, color, level: 'easy', done: {}, missions: {}, best: {}, daily: {}, progress: {}, review: [], last: null };
      data.profiles.push(profile);
      data.current = profile.id;
      save();
      return profile;
    },
    renameProfile(id, name) {
      const clean = cleanName(name);
      const p = data.profiles.find((q) => q.id === id);
      if (!p || !clean) return { error: 'empty' };
      if (data.profiles.some((q) => q.id !== id && q.name === clean)) return { error: 'duplicate' };
      p.name = clean; save(); return p;
    },
    selectProfile(id) {
      if (!data.profiles.some((p) => p.id === id)) return false;
      data.current = id; save(); return true;
    },
    removeProfile(id) {
      const before = data.profiles.length;
      data.profiles = data.profiles.filter((p) => p.id !== id);
      if (data.profiles.length === before) return false;
      if (data.current === id) data.current = data.profiles[0] ? data.profiles[0].id : null;
      save(); return true;
    },
    setLevel(level) { withP((p) => { if (LEVELS.includes(level)) { p.level = level; save(); } }); },
    level: () => withP((p) => p.level, 'easy'),

    // 차시 완료. 별은 가장 좋았던 기록을 남긴다.
    completeLesson(lessonId, stars) {
      withP((p) => {
        const prev = p.done[lessonId] ? p.done[lessonId].stars : 0;
        p.done[lessonId] = { stars: Math.max(prev, Math.max(1, Math.min(3, stars))) };
        p.last = lessonId;
        save();
      });
    },
    isDone: (lessonId) => withP((p) => Boolean(p.done[lessonId]), false),
    starsOf: (lessonId) => withP((p) => (p.done[lessonId] ? p.done[lessonId].stars : 0), 0),
    totalStars: () => withP((p) => Object.values(p.done).reduce((a, v) => a + v.stars, 0), 0),
    completeMission(id) { withP((p) => { p.missions[id] = true; save(); }); },
    missionDone: (id) => withP((p) => Boolean(p.missions[id]), false),
    lastLesson: () => withP((p) => p.last, null),

    // 오늘의 퍼즐: 날짜 × 난이도 × 퍼즐마다 걸린 초를 남긴다(같은 날 같은 난이도를 다시 풀면 더 빠른 기록).
    // help: 힌트 3단계로 채운 판. 혼자 푼 기록이 힌트 도움 기록보다 우선한다. 난이도를 모르면 쉬움.
    recordDaily(date, which, seconds, gen, level, help = false) {
      withP((p) => {
        if (!DATE_RE.test(date) || !PUZZLES.includes(which)) return;
        const s = secs(seconds);
        if (s === null) return;
        const lv = LEVELS.includes(level) ? level : 'easy';
        const day = p.daily[date] || {};
        const add = { [which]: s };
        if (help) add[which + 'Help'] = true;
        if (Number.isInteger(gen)) add.gen = gen;
        day[lv] = mergeLevelEntry(day[lv], add);
        if (Number.isInteger(gen)) day[lv].gen = gen;
        p.daily[date] = day;
        p.daily = cleanDaily(p.daily);
        save();
      });
    },
    // level 을 주면 그 난이도 칸, 안 주면 하루 전체 { easy, normal, hard }
    dailyOf: (date, level) => withP((p) => { const d = p.daily[date]; if (!d) return null; return level ? (d[level] || null) : JSON.parse(JSON.stringify(d)); }, null),
    dailyAll: () => withP((p) => JSON.parse(JSON.stringify(p.daily)), {}),

    // 퍼즐별 최고 기록(초). 더 빠르면 바꾸고 true
    recordBest(key, seconds) {
      return withP((p) => {
        const s = secs(seconds);
        if (s === null || key.length > 30) return false;
        if (p.best[key] !== undefined && p.best[key] <= s) return false;
        p.best[key] = s; save(); return true;
      }, false);
    },
    bestAll: () => withP((p) => ({ ...p.best }), {}),

    // 진행 중인 퍼즐(자동 저장): 퍼즐마다 한 칸. key: daily-sd|ct-날짜-난이도 또는 free
    saveProgress(key, state, now = Date.now()) {
      withP((p) => {
        if (!PROGRESS_KEY_RE.test(key)) return;
        const c = cleanProgressItem({ state, at: now });
        if (!c) return;
        const map = { ...p.progress, [key]: c };
        p.progress = cleanProgress(key === 'free' ? map : pruneProgressMap(map, key.slice(9, 19)));
        save();
      });
    },
    progressOf: (key) => withP((p) => (p.progress[key] ? { key, ...p.progress[key] } : null), null),
    progressKeys: () => withP((p) => Object.keys(p.progress), []),
    clearProgress(key) { withP((p) => { if (p.progress[key]) { delete p.progress[key]; save(); } }); },
    // 오늘이 아닌 날의 오늘의 퍼즐 진행을 지운다
    pruneProgress(today) {
      withP((p) => { const next = pruneProgressMap(p.progress, today); if (Object.keys(next).length !== Object.keys(p.progress).length) { p.progress = next; save(); } });
    },

    addReview(key) {
      withP((p) => {
        p.review = p.review.filter((k) => k !== key);
        p.review.push(key);
        if (p.review.length > MAX_REVIEW) p.review = p.review.slice(-MAX_REVIEW);
        save();
      });
    },
    reviewList: () => withP((p) => [...p.review], []),

    exportBackup(now = new Date()) {
      return { app: BACKUP_APP, kind: 'backup', exportedAt: now.toISOString(), data: JSON.parse(JSON.stringify(data)) };
    },
    importBackup(obj) {
      const r = validateBackup(obj);
      if (!r.ok) return r;
      data = r.data;
      save();
      return { ok: true, count: data.profiles.length };
    },
  };
}

export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
  };
}
