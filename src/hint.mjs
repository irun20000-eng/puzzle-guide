// 힌트 3단계: 1 어디를 볼까 → 2 기법 이름과 이유 → 3 이렇게 해요(칸 표시).
// 풀이기가 지금 판에서 실제로 찾은 논리 단계로 문장을 만든다. 정답(solution)은 "틀린 수 짚기"에만 쓴다.
import { sdState, sdNextStep, sdFindAll, sdStepText, sdCellName, sdConflicts, sdPopcount, SD_TECH_INDEX } from './sudoku.mjs';
import { ctState, ctNextStep, ctStepText, ctCellName, ctConflicts, ctDefaultRegionName, ctEmptyUnit } from './cats.mjs';
import { josa } from './rng.mjs';

// 스도쿠 힌트. values: 지금 판(주어진 수 + 사용자가 놓은 수), notes: 칸마다 메모 비트(없으면 null)
export function sdHint({ puzzle, values, notes = null, solution }) {
  const n = Math.round(Math.sqrt(values.length));
  const C = (x) => sdCellName(n, x);
  if (values.every(Boolean) && values.every((v, x) => v === solution[x])) return { kind: 'done', where: '다 풀었어요.', why: '', todo: '', focus: [], cells: [] };
  // 1) 사용자가 놓은 수가 답과 다르면 그 수를 먼저 짚는다
  const conflicts = sdConflicts(values);
  const wrong = values.map((v, x) => (v && !puzzle[x] && v !== solution[x] ? x : -1)).filter((x) => x >= 0);
  if (wrong.length) {
    const x = wrong.find((y) => conflicts.includes(y)) ?? wrong[0];
    const clash = conflicts.includes(x);
    return {
      kind: 'mistake', name: '다시 보기', focus: [], cells: [x], mark: [x],
      where: `${josa(C(x), '을를')} 다시 보세요.`,
      why: clash ? `${C(x)}의 ${josa(String(values[x]), '이가')} 같은 줄이나 상자의 숫자와 겹쳐요.` : `${C(x)}의 ${josa(String(values[x]), '은는')} 규칙은 지키지만, 끝까지 풀면 맞지 않는 수예요.`,
      todo: `${C(x)}의 숫자를 지우고 다시 생각해 봐요.`,
    };
  }
  // 2) 메모 점검: 들어가야 할 숫자가 빠졌거나, 이미 같은 줄·상자에 있는 숫자가 남아 있으면 먼저 알린다
  let useNotes = null;
  if (notes && notes.some((m, x) => m && !values[x])) {
    const base = sdState(values);
    for (let x = 0; x < n * n; x++) {
      if (values[x] || !notes[x]) continue;
      const need = 1 << (solution[x] - 1);
      if (!(notes[x] & need)) return { kind: 'note', name: '메모 다시 보기', focus: [], cells: [x], mark: [x], where: `${C(x)}의 메모를 보세요.`, why: '이 칸의 메모에 들어갈 수 있는 숫자가 빠져 있어요.', todo: '메모를 다시 적어 봐요. 같은 줄, 세로줄, 상자에 없는 숫자를 모두 적어요.' };
      const extra = notes[x] & ~base.cand[x];
      if (extra) {
        const ds = [];
        for (let d = 1; d <= n; d++) if (extra & (1 << (d - 1))) ds.push(d);
        return { kind: 'note', name: '메모 다시 보기', focus: [], cells: [x], mark: [x], where: `${C(x)}의 메모를 보세요.`, why: `메모 중에 지워야 할 것이 남아 있어요. ${josa(ds.join(', '), '은는')} 같은 줄이나 상자에 이미 있어요.`, todo: `${C(x)}의 메모에서 ${josa(ds.join(', '), '을를')} 지워요.`, elimNotes: [{ x, mask: extra }] };
      }
    }
    useNotes = notes;
  }
  // 3) 풀이기로 다음 한 단계를 찾는다. 메모를 근거로 찾았으면 문장도 "메모를 보면"으로 말한다.
  //    후보 지우기 단계는 그 한 단계만 보여 주고, 「그대로 하기」가 메모를 채워 그 후보를 지운다(다음 힌트는 그 메모에서 이어진다).
  const st = sdState(values, useNotes);
  const step = sdNextStep(st);
  if (!step) return { kind: 'stuck', name: '', focus: [], cells: [], where: '지금 배운 기법으로는 다음 수를 찾기 어려워요.', why: '메모를 다시 적어 보거나, 처음부터 다시 풀어 보세요.', todo: '' };
  const memo = Boolean(useNotes) && !onlyPeers(values, useNotes, step);
  const t = sdStepText(n, step, { memo });
  return {
    kind: 'step', name: t.name, tech: step.tech, steps: [step], focus: step.focus, cells: step.cells,
    where: t.where, why: t.why, todo: t.todo, memo,
    place: step.place ? step.place[0] : null, elim: step.elim || [],
    techs: [step.tech], hardest: SD_TECH_INDEX[step.tech],
  };
}

// 단계의 모든 주장(놓을 칸·지울 후보·칸·줄 종류와 번호·숫자)이 같으면 같은 단계
export function sdStepKey(a) {
  const u = (x) => (x ? x.kind + x.i : '');
  return JSON.stringify({ p: a.place, e: a.elim, c: a.cells, u: u(a.unit), b: u(a.box), l: u(a.line), ls: (a.lines || []).map(u), cr: (a.cross || []).map(u), d: a.digit, ds: a.digits, cell: a.cell });
}
// 이 단계가 메모 없이 주변 숫자만으로도 찾아지는가(그러면 "메모를 보면"을 붙이지 않는다)
function onlyPeers(values, notes, step) {
  const base = sdState(values);
  const same = (a) => sdStepKey(a) === sdStepKey(step);
  return sdFindAll(base, step.tech).some(same);
}

// 고양이 자리 힌트. cats: 놓인 고양이 칸, marks: 사용자가 × 한 칸
export function ctHint({ n, region, cats, marks = [], solution, regionName = ctDefaultRegionName }) {
  const C = (x) => ctCellName(n, x);
  const sol = new Set(solution);
  if (cats.length === n && cats.every((x) => sol.has(x))) return { kind: 'done', where: '다 풀었어요.', why: '', todo: '', focus: [], cells: [] };
  const conf = ctConflicts(n, region, cats);
  const wrongCats = cats.filter((x) => !sol.has(x));
  if (wrongCats.length) {
    const x = wrongCats.find((y) => conf.cells.includes(y)) ?? wrongCats[0];
    const r = conf.reasons.find((q) => q.a === x || q.b === x);
    const whyMap = { row: '같은 가로줄에 고양이가 또 있어요.', col: '같은 세로줄에 고양이가 또 있어요.', region: '같은 구역에 고양이가 또 있어요.', touch: '다른 고양이와 닿아 있어요. 대각선도 닿은 거예요.' };
    return {
      kind: 'mistake', name: '다시 보기', focus: [], cells: [x], mark: [x],
      where: `${C(x)}의 고양이를 다시 보세요.`,
      why: r ? whyMap[r.why] : '규칙은 지키지만, 끝까지 풀면 이 자리는 답이 아니에요.',
      todo: `${C(x)}의 고양이를 치우고 다시 생각해 봐요.`, remove: x,
    };
  }
  const wrongMarks = marks.filter((x) => sol.has(x));
  if (wrongMarks.length) {
    const x = wrongMarks[0];
    return { kind: 'note', name: '× 다시 보기', focus: [], cells: [x], mark: [x], where: `${C(x)}의 ×를 다시 보세요.`, why: '이 칸을 비워 둘 까닭이 아직 없어요. 고양이가 들어갈 수도 있는 칸이에요.', todo: `${C(x)}의 ×를 지워요.`, unmark: x };
  }
  const st = ctState(n, region, cats, marks);
  if (ctEmptyUnit(st)) return { kind: 'stuck', name: '', focus: [], cells: [], where: '고양이를 둘 곳이 없는 줄이나 구역이 생겼어요.', why: '×를 다시 확인해 보세요.', todo: '' };
  const step = ctNextStep(st);
  if (!step) return { kind: 'stuck', name: '', focus: [], cells: [], where: '지금 기법으로는 다음 수를 찾기 어려워요.', why: '', todo: '' };
  const t = ctStepText(n, step, regionName);
  return {
    kind: 'step', name: t.name, tech: step.tech, steps: [step], focus: step.focus, cells: step.cells || [],
    where: t.where, why: t.why, todo: t.todo,
    place: step.place ? step.place[0] : null, elim: step.elim || [],
  };
}

// 메모 자동 채우기: 같은 줄·세로줄·상자에 없는 숫자 모두
export function sdAutoNotes(values) {
  const st = sdState(values);
  return st.cand.map((m, x) => (values[x] ? 0 : m));
}
export const sdNoteCount = (m) => sdPopcount(m);
