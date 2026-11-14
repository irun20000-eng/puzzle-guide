// 차시 자료(글자 판, 묶음 번호, 기법 이름)를 화면이 쓸 문제로 펼친다. 정답은 자료에 적지 않고 엔진이 계산한다.
// 시험(tests/lessons.test.mjs)이 모든 걸음을 펼쳐 유일해, 기법 상한, 정답을 다시 확인한다.
import { sdParse, sdShape, sdState, sdNextStep, sdApply, sdFindAll, sdSolution, sdConflicts, sdPopcount, sdStepText, sdUnitName, sdCellName, SD_TECH } from './sudoku.mjs';
import { ctParse, ctState, ctNextStep, ctApply, ctFindAll, ctSolution, ctConflicts, ctBlockedBy, ctStepText, ctUnitName, ctDefaultRegionName, CT_TECH } from './cats.mjs';
import { PACKS } from './packs/packs.mjs';
import { sdFindLessonStep, ctFindLessonStep } from './find-step.mjs';
import { josa } from './rng.mjs';

export function packKind(packId) {
  if (/^s\d/.test(packId)) return 'sd';
  if (/^c\d/.test(packId)) return 'ct';
  throw new Error('묶음 이름이 잘못됨: ' + packId);
}
export function packEntry(packId, i) {
  const list = PACKS[packId];
  if (!list || list[i] === undefined) throw new Error('묶음 문제가 없음: ' + packId + '#' + i);
  return list[i];
}
export function loadPuzzle(ref) {
  if (Array.isArray(ref)) ref = ref.join('');
  const text = typeof ref === 'string' ? ref : packEntry(ref.pack, ref.i);
  const kind = typeof ref === 'string' ? (/^[.1-9]+$/.test(ref.replace(/\s+/g, '')) ? 'sd' : 'ct') : packKind(ref.pack);
  if (kind === 'sd') {
    const puzzle = sdParse(text);
    return { kind, n: Math.round(Math.sqrt(puzzle.length)), puzzle, text };
  }
  const { n, region, cats } = ctParse(text);
  return { kind, n, region, cats, text };
}

const unitOf = (shape, kind, i) => shape.units.find((u) => u.kind === kind && u.i === i);

// 걸음 하나를 화면용으로 펼친다. 돌려주는 모양:
// { t, kind, n, puzzle|region, values|cats, marks, notes, focus:[unit], spot:[칸], prompt, answer, solution, explain }
// answer: { place: {x, d} } (스도쿠 숫자 놓기) | { cat: x } | { cells: [...], mode: 'one'|'all' } | { choice: i } | { mask }
export function expandItem(item, regionName = ctDefaultRegionName) {
  const t = item.t;
  if (t === 'card') {
    const out = { t, title: item.title, text: item.text, board: item.board || null, show: item.show || null };
    if (item.demo) out.demo = expandItem({ t: 'step', ...item.demo }, regionName);
    return out;
  }
  if (t === 'quiz') return { t, prompt: item.q, options: item.options, answer: { choice: item.answer }, explain: item.why };
  const P = loadPuzzle(item.board || { pack: item.pack, i: item.i });
  if (P.kind === 'sd') return expandSd(item, P);
  return expandCt(item, P, regionName);
}

function expandSd(item, P) {
  const { n, puzzle } = P;
  const shape = sdShape(n);
  const base = { t: item.t, kind: 'sd', n, puzzle, notesOn: Boolean(item.notes) };
  const C = (x) => sdCellName(n, x);
  if (item.t === 'tap') {
    const values = puzzle.slice();
    const [check, ...args] = item.check.split(':');
    let cells, mode = 'one', focus = [];
    let prompt = item.prompt;
    if (check === 'conflict') cells = sdConflicts(values);
    else if (check === 'unit') { const u = unitOf(shape, args[0], Number(args[1])); cells = u.cells; focus = []; }
    else if (check === 'cell') cells = [Number(args[0]) * n + Number(args[1])];
    else if (check === 'cand') {
      const u = unitOf(shape, args[1], Number(args[2]));
      const st = sdState(values);
      const where = (d) => u.cells.filter((x) => st.cand[x] & (1 << (d - 1)));
      // auto: 상자에 아직 없고 후보 칸이 둘 이상인 가장 작은 숫자
      const d = args[0] === 'auto' ? [...Array(n)].map((_, i) => i + 1).find((k) => !u.cells.some((x) => values[x] === k) && where(k).length >= 2) : Number(args[0]);
      cells = where(d); mode = 'all'; focus = [u];
      prompt = prompt.replace('{d}', josa(String(d), '이가'));
    } else throw new Error('모르는 짚기: ' + item.check);
    return { ...base, values, focus, prompt, answer: { cells, mode }, explain: item.why || '' };
  }
  const solution = sdSolution(puzzle);
  if (!solution) throw new Error('해가 하나가 아닌 스도쿠: ' + P.text);
  if (item.t === 'count' || item.t === 'memo') {
    const st = sdState(puzzle);
    // cell 이 없으면 고른다: 세기는 후보가 가장 적은 칸, 메모는 후보가 2~3개인 첫 칸
    let x;
    if (item.cell) x = item.cell[0] * n + item.cell[1];
    else {
      const empty = puzzle.map((v, y) => (v ? -1 : y)).filter((y) => y >= 0);
      if (item.t === 'count') x = empty.reduce((a, y) => (sdPopcount(st.cand[y]) < sdPopcount(st.cand[a]) ? y : a), empty[0]);
      else x = empty.find((y) => { const k = sdPopcount(st.cand[y]); return k >= 2 && k <= 3; }) ?? empty[0];
    }
    const mask = st.cand[x];
    if (item.t === 'count') {
      const k = sdPopcount(mask);
      const options = [...Array(Math.min(n, 4))].map((_, i) => String(i + 1));
      return { ...base, values: puzzle.slice(), solution, spot: [x], focus: [], prompt: item.prompt || `${C(x)}에 들어갈 수 있는 숫자는 몇 개일까요?`, options, answer: { choice: k - 1 }, explain: `가로줄, 세로줄, 상자에 없는 숫자는 ${digitsText(mask, n)}예요.` };
    }
    return { ...base, notesOn: true, values: puzzle.slice(), solution, spot: [x], focus: [], prompt: item.prompt || `${C(x)}에 들어갈 수 있는 숫자를 모두 메모해 보세요.`, answer: { mask, x }, explain: `들어갈 수 있는 숫자는 ${digitsText(mask, n)}예요.` };
  }
  if (item.t === 'solve' || item.t === 'guided') {
    return { ...base, values: puzzle.slice(), solution, focus: [], prompt: item.prompt || (item.t === 'guided' ? '설명을 따라 한 걸음씩 풀어 보세요.' : '끝까지 풀어 보세요.'), answer: { solution }, guided: item.t === 'guided' ? (item.steps || 6) : 0 };
  }
  if (item.t === 'step') {
    const found = sdFindLessonStep(puzzle, item.tech, { nth: item.nth || 0, match: item.match, easiest: item.easiest });
    if (!found) throw new Error('이 판에서 기법을 찾지 못함: ' + item.tech + ' ' + P.text);
    const { step } = found;
    const showNotes = Boolean(item.notes) || Boolean(step.elim);
    // 메모를 보여 주는 걸음은 보이는 메모를 근거로 말한다
    const text = sdStepText(n, step, { memo: showNotes });
    const notes = showNotes ? found.cand.map((m, x) => (found.values[x] ? 0 : m)) : null;
    const out = { ...base, t: 'step', tech: step.tech, values: found.values, notes, notesOn: showNotes, solution, explain: text.why, techName: text.name, step };
    const d = step.digit;
    if (step.place) {
      const { x, d: dd } = step.place[0];
      if (step.tech === 'naked-single') return { ...out, focus: [], spot: [x], prompt: item.prompt || `${josa(C(x), '은는')} 들어갈 수 있는 숫자가 하나뿐이에요. 그 숫자를 놓아 보세요.`, answer: { place: { x, d: dd } } };
      if (step.tech === 'full-house') return { ...out, focus: [step.unit], spot: [], prompt: item.prompt || `${sdUnitName(step.unit)}의 빈칸을 채워 보세요.`, answer: { place: { x, d: dd } } };
      return { ...out, focus: [step.unit], spot: [], prompt: item.prompt || `${sdUnitName(step.unit)}에서 ${josa(String(dd), '이가')} 들어갈 칸을 찾아 ${josa(String(dd), '을를')} 놓아 보세요.`, answer: { place: { x, d: dd } } };
    }
    if (step.tech === 'hidden-pair' || step.tech === 'hidden-triple') {
      return { ...out, focus: step.focus, spot: [], prompt: item.prompt || `${sdUnitName(step.unit)}에서 ${josa(step.digits.join(', '), '이가')} 들어갈 수 있는 칸을 모두 고르세요.`, answer: { cells: step.cells.slice(), mode: 'all' } };
    }
    const cells = step.elim.map((e) => e.x);
    const what = d ? josa(String(d), '을를') : josa(step.digits.join(', '), '을를');
    return { ...out, focus: step.focus, spot: step.tech.startsWith('naked') ? step.cells.slice() : [], prompt: item.prompt || `표시한 곳을 보고, ${what} 지울 수 있는 칸을 모두 고르세요.`, answer: { cells, mode: 'all' } };
  }
  throw new Error('모르는 걸음: ' + item.t);
}

function digitsText(mask, n) {
  const ds = [];
  for (let d = 1; d <= n; d++) if (mask & (1 << (d - 1))) ds.push(d);
  return ds.join(', ');
}

function expandCt(item, P, regionNameIn) {
  const { n, region } = P;
  // 구역 이름 함수는 (구역 번호, 판의 구역 배열)을 받는다. 화면은 판마다 색 배정이 달라서다.
  const regionName = (g) => regionNameIn(g, region);
  const base = { t: item.t, kind: 'ct', n, region };
  if (item.t === 'tap') {
    const cats = P.cats.slice();
    const [check] = item.check.split(':');
    let cells, mode = 'one';
    if (check === 'conflict') cells = ctConflicts(n, region, cats).cells;
    else if (check === 'blocked') { cells = ctBlockedBy(n, region, cats[0]); mode = 'all'; }
    else if (check === 'smallest') {
      const sizes = [...Array(n)].map((_, g) => region.filter((v) => v === g).length);
      const min = Math.min(...sizes);
      cells = region.map((g, x) => (sizes[g] === min ? x : -1)).filter((x) => x >= 0);
    } else throw new Error('모르는 짚기: ' + item.check);
    return { ...base, cats, marks: [], focus: [], prompt: item.prompt, answer: { cells, mode }, explain: item.why || '' };
  }
  const solution = ctSolution(n, region);
  if (!solution) throw new Error('해가 하나가 아닌 고양이 자리: ' + P.text);
  if (item.t === 'solve' || item.t === 'guided') {
    return { ...base, cats: [], marks: [], solution, focus: [], prompt: item.prompt || (item.t === 'guided' ? '설명을 따라 한 걸음씩 풀어 보세요.' : '모든 고양이 자리를 찾아 보세요.'), answer: { solution }, guided: item.t === 'guided' ? (item.steps || 6) : 0 };
  }
  if (item.t === 'step') {
    const found = ctFindLessonStep(n, region, item.tech, { nth: item.nth || 0, match: item.match, easiest: item.easiest });
    if (!found) throw new Error('이 판에서 기법을 찾지 못함: ' + item.tech + ' ' + P.text);
    let { step } = found;
    // 가정해 보기: 가장 짧게 막히는 칸만 정답으로 친다(어느 칸이나 눌러서 맞히는 일이 없게)
    let whatIf = null;
    if (step.tech === 'what-if') {
      const minDepth = Math.min(...found.all.map((s) => s.depth));
      whatIf = found.all.filter((s) => s.depth === minDepth);
      step = whatIf[0];
    }
    const text = ctStepText(n, step, regionName);
    const marks = found.cand.map((v, x) => (!v && !found.cats.includes(x) ? x : -1)).filter((x) => x >= 0);
    const out = { ...base, tech: step.tech, cats: found.cats, marks, solution, explain: text.why, techName: text.name, step };
    const U = (u) => ctUnitName(u, regionName);
    if (step.place) return { ...out, focus: step.focus, spot: [], prompt: item.prompt || `${U(step.unit)}에 고양이를 놓아 보세요.`, answer: { cat: step.place[0] } };
    if (step.tech === 'blocks-all') {
      const same = found.all.filter((s) => s.unit.kind === step.unit.kind && s.unit.i === step.unit.i).map((s) => s.cell);
      return { ...out, focus: [step.unit], spot: [], prompt: item.prompt || `여기에 두면 ${U(step.unit)}의 자리가 모두 막히는 칸이 있어요. 찾아서 ×를 해 보세요.`, answer: { cells: same, mode: 'one' } };
    }
    if (step.tech === 'what-if') {
      return { ...out, focus: [], spot: [], prompt: item.prompt || `배운 기법으로는 더 지울 칸이 없어요. 한 칸에 두었다고 해 보고 ${whatIf[0].depth}걸음 만에 막히는 칸을 찾아 ×를 해 보세요.`, answer: { cells: whatIf.map((s) => s.cell), mode: 'one' }, depth: whatIf[0].depth };
    }
    return { ...out, focus: step.focus, spot: [], prompt: item.prompt || '표시한 곳을 보고, ×를 할 칸을 모두 고르세요.', answer: { cells: step.elim.slice(), mode: 'all' } };
  }
  throw new Error('모르는 걸음: ' + item.t);
}

// 별: 틀림과 힌트를 합해 0이면 3개, 2 이하면 2개, 그보다 많으면 1개
export function starsFor(mistakes, hints) {
  const k = mistakes + hints;
  return k === 0 ? 3 : k <= 2 ? 2 : 1;
}

// 답 확인(화면과 시험이 함께 쓴다)
export function checkPick(answer, picked) {
  const want = new Set(answer.cells);
  if (answer.mode === 'one') return picked.length === 1 && want.has(picked[0]);
  const got = new Set(picked);
  return got.size === want.size && [...want].every((x) => got.has(x));
}

export const TECH_NAMES = { sd: SD_TECH, ct: CT_TECH };
