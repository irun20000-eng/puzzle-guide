// 판 하나를 푸는 상태와 동작(화면 그리기와 분리). 차시 문제, 오늘의 퍼즐, 자유 연습, 미션이 함께 쓴다.

// 새 판. src: { kind:'sd', n, puzzle, solution, values?, notes? } 또는 { kind:'ct', n, region, solution, cats?, marks? }
function newGame(src, opts = {}) {
  const g = {
    kind: src.kind, n: src.n, mode: opts.mode || 'free', sel: -1, memo: false, history: [],
    mistakes: 0, hints: 0, hearts: opts.challenge ? 3 : null, done: false, elapsed: opts.elapsed || 0, popCell: null,
  };
  if (src.kind === 'sd') {
    g.puzzle = src.puzzle.slice();
    g.solution = src.solution || sdSolution(src.puzzle);
    g.values = (src.values || src.puzzle).slice();
    g.notes = src.notes ? src.notes.slice() : new Array(src.n * src.n).fill(0);
    const firstEmpty = g.values.findIndex((v) => !v);
    g.sel = firstEmpty;
  } else {
    g.region = src.region.slice();
    g.solution = src.solution || ctSolution(src.n, src.region);
    g.cats = (src.cats || []).slice();
    g.marks = (src.marks || []).slice();
    g.given = (src.cats || []).slice();
    g.sel = 0;
  }
  return g;
}

function gameSnapshot(g) {
  return g.kind === 'sd' ? { values: g.values.slice(), notes: g.notes.slice() } : { cats: g.cats.slice(), marks: g.marks.slice() };
}
function gamePush(g) { g.history.push(gameSnapshot(g)); if (g.history.length > 200) g.history.shift(); }
function gameUndo(g) {
  const s = g.history.pop();
  if (!s) return false;
  Object.assign(g, s);
  g.popCell = null;
  return true;
}

// ── 스도쿠 ──
function sdPeersOf(n, x) { return sdShape(n).peers[x]; }
// 숫자 놓기. 돌려줌: 'placed' | 'note' | 'given' | 'wrong-challenge' | 'same'
function sdInput(g, d, settings) {
  const x = g.sel;
  if (x < 0 || g.done) return 'none';
  if (g.puzzle[x]) return 'given';
  if (g.memo) {
    if (g.values[x]) return 'none';
    gamePush(g);
    g.notes[x] ^= 1 << (d - 1);
    return 'note';
  }
  if (g.values[x] === d) return 'same';
  if (g.hearts !== null && d !== g.solution[x]) {
    g.hearts = Math.max(0, g.hearts - 1);
    g.mistakes++;
    return 'wrong-challenge';
  }
  gamePush(g);
  g.values[x] = d;
  g.notes[x] = 0;
  if (settings.autoClean) for (const p of sdPeersOf(g.n, x)) g.notes[p] &= ~(1 << (d - 1));
  g.popCell = x;
  if (sdConflicts(g.values).includes(x)) g.mistakes++;
  return 'placed';
}
function sdErase(g) {
  const x = g.sel;
  if (x < 0 || g.puzzle[x] || g.done) return false;
  if (!g.values[x] && !g.notes[x]) return false;
  gamePush(g);
  g.values[x] = 0; g.notes[x] = 0;
  return true;
}
function sdFillNotes(g) {
  gamePush(g);
  const auto = sdAutoNotes(g.values);
  g.notes = auto;
}
function sdWrongCells(g) { return g.values.map((v, x) => (v && !g.puzzle[x] && v !== g.solution[x] ? x : -1)).filter((x) => x >= 0); }
function sdIsDone(g) { return g.values.every((v, x) => v === g.solution[x]); }
function sdDigitLeft(g, d) { return g.n - g.values.filter((v) => v === d).length; }

// ── 고양이 자리 ──
// 한 번 누르면 ×, 두 번 누르면 고양이, 세 번이면 비움
function ctCycle(g, x) {
  if (g.done || g.given.includes(x)) return 'none';
  if (g.cats.includes(x)) { gamePush(g); g.cats = g.cats.filter((y) => y !== x); return 'cleared'; }
  if (g.marks.includes(x)) return ctPutCat(g, x);
  gamePush(g); g.marks.push(x); return 'marked';
}
function ctPutCat(g, x) {
  if (g.done || g.given.includes(x)) return 'none';
  if (g.hearts !== null && !g.solution.includes(x)) {
    g.hearts = Math.max(0, g.hearts - 1); g.mistakes++;
    return 'wrong-challenge';
  }
  gamePush(g);
  g.marks = g.marks.filter((y) => y !== x);
  if (!g.cats.includes(x)) g.cats.push(x);
  g.popCell = x;
  if (ctConflicts(g.n, g.region, g.cats).cells.includes(x)) g.mistakes++;
  return 'cat';
}
function ctToggleMark(g, x) {
  if (g.done || g.cats.includes(x)) return 'none';
  gamePush(g);
  if (g.marks.includes(x)) g.marks = g.marks.filter((y) => y !== x); else g.marks.push(x);
  return 'marked';
}
function ctClearCell(g, x) {
  if (g.done || g.given.includes(x)) return false;
  if (!g.cats.includes(x) && !g.marks.includes(x)) return false;
  gamePush(g);
  g.cats = g.cats.filter((y) => y !== x);
  g.marks = g.marks.filter((y) => y !== x);
  return true;
}
// 자동 점: 놓인 고양이 때문에 둘 수 없는 칸(사용자 × 와 겹치지 않게)
function ctAutoDots(g) {
  const s = new Set();
  for (const c of g.cats) for (const y of ctBlockedBy(g.n, g.region, c)) s.add(y);
  for (const c of g.cats) s.delete(c);
  for (const m of g.marks) s.delete(m);
  return [...s];
}
function ctIsDone(g) { return g.cats.length === g.n && ctConflicts(g.n, g.region, g.cats).cells.length === 0; }
function ctWrongCats(g) { return g.cats.filter((x) => !g.solution.includes(x)); }

function gameIsDone(g) { return g.kind === 'sd' ? sdIsDone(g) : ctIsDone(g); }
function gameConflicts(g) { return g.kind === 'sd' ? sdConflicts(g.values) : ctConflicts(g.n, g.region, g.cats).cells; }

// 힌트(3단계 자료). regionName: 구역 이름 함수
function gameHint(g, regionName) {
  if (g.kind === 'sd') return sdHint({ puzzle: g.puzzle, values: g.values, notes: g.notes.some(Boolean) ? g.notes : null, solution: g.solution });
  return ctHint({ n: g.n, region: g.region, cats: g.cats, marks: g.marks, solution: g.solution, regionName });
}
// 힌트 3단계 "이렇게 해요" 적용
function gameApplyHint(g, h, settings) {
  if (!h) return;
  if (h.kind === 'mistake') {
    gamePush(g);
    if (g.kind === 'sd') { const x = h.cells[0]; g.values[x] = 0; g.sel = x; } else { g.cats = g.cats.filter((y) => y !== h.remove); }
    return;
  }
  if (h.kind === 'note') {
    gamePush(g);
    if (g.kind === 'sd') { const x = h.cells[0]; if (h.elimNotes) for (const e of h.elimNotes) g.notes[e.x] &= ~e.mask; else g.notes[x] = 0; g.sel = x; } else g.marks = g.marks.filter((y) => y !== h.unmark);
    return;
  }
  if (h.kind !== 'step') return;
  if (g.kind === 'sd') {
    gamePush(g);
    // 후보 지우기: 메모가 없으면 먼저 메모를 채운 뒤 지운다(힌트가 그 메모에서 이어지도록)
    if ((h.elim || []).length && !h.memo) { const auto = sdAutoNotes(g.values); for (let k = 0; k < auto.length; k++) if (!g.notes[k]) g.notes[k] = auto[k]; }
    for (const e of h.elim || []) g.notes[e.x] &= ~e.mask;
    if (h.place) {
      const { x, d } = h.place;
      g.values[x] = d; g.notes[x] = 0; g.sel = x; g.popCell = x;
      if (settings.autoClean) for (const p of sdPeersOf(g.n, x)) g.notes[p] &= ~(1 << (d - 1));
    }
  } else {
    gamePush(g);
    for (const x of h.elim || []) if (!g.marks.includes(x)) g.marks.push(x);
    if (h.place !== null && h.place !== undefined) { g.marks = g.marks.filter((y) => y !== h.place); g.cats.push(h.place); g.popCell = h.place; }
  }
}

// 진행 저장용(작게)
function gameSave(g) {
  return g.kind === 'sd'
    ? { v: sdFormat(g.values), m: g.notes.join(','), t: Math.round(g.elapsed), h: g.hints, e: g.mistakes, hp: g.hearts, a: g.assisted ? 1 : 0 }
    : { c: g.cats.join(','), x: g.marks.join(','), t: Math.round(g.elapsed), h: g.hints, e: g.mistakes, hp: g.hearts, a: g.assisted ? 1 : 0 };
}
function gameRestore(g, s) {
  if (!s) return g;
  try {
    if (g.kind === 'sd' && typeof s.v === 'string' && s.v.length === g.n * g.n) {
      const vals = sdParse(s.v);
      if (vals.every((v, x) => !g.puzzle[x] || v === g.puzzle[x])) g.values = vals;
      const m = String(s.m || '').split(',').map(Number);
      if (m.length === g.n * g.n && m.every(Number.isFinite)) g.notes = m;
    }
    if (g.kind === 'ct') {
      const list = (t) => String(t || '').split(',').filter(Boolean).map(Number).filter((x) => x >= 0 && x < g.n * g.n);
      g.cats = list(s.c); g.marks = list(s.x);
    }
    g.elapsed = Number(s.t) || 0; g.hints = Number(s.h) || 0; g.mistakes = Number(s.e) || 0; g.assisted = s.a === 1;
    if (g.hearts !== null && Number.isInteger(s.hp)) g.hearts = s.hp;
  } catch (err) { /* 망가진 저장은 무시 */ }
  return g;
}

function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
}
