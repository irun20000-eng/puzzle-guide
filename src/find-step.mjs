// 풀이 길을 따라가며 어떤 기법을 쓸 수 있는 상태를 찾는다(차시 '걸음' 문제, 묶음 만들기, 시험이 함께 쓴다).
import { sdState, sdNextStep, sdApply, sdFindAll } from './sudoku.mjs';
import { ctState, ctNextStep, ctApply, ctFindAll } from './cats.mjs';

export const stepMatches = (step, match) => {
  if (!match) return true;
  for (const [k, v] of Object.entries(match)) {
    const got = k === 'unitKind' ? step.unit && step.unit.kind : step[k];
    if (Array.isArray(v) ? !v.includes(got) : got !== v) return false;
  }
  return true;
};

// 풀이 길을 따라가며 tech 를 쓸 수 있는 상태를 찾는다. nth 번째(0부터) 상태를 돌려준다.
// easiest: 그 상태에서 풀이기가 고르는 가장 쉬운 단계가 바로 이 기법일 때만(더 쉬운 기법으로는 진행이 없을 때)
export function sdFindLessonStep(puzzle, tech, { nth = 0, match = null, easiest = false } = {}) {
  const st = sdState(puzzle);
  let seen = 0;
  for (let guard = 0; guard < 400; guard++) {
    const first = easiest ? sdNextStep(st) : null;
    const found = easiest && (!first || first.tech !== tech) ? [] : sdFindAll(st, tech).filter((s) => stepMatches(s, match));
    if (found.length) {
      if (seen === nth) return { values: st.val.slice(), cand: st.cand.slice(), step: found[0], all: found };
      seen++;
    }
    const next = sdNextStep(st);
    if (!next) return null;
    sdApply(st, next);
    if (st.val.every(Boolean)) return null;
  }
  return null;
}
export function ctFindLessonStep(n, region, tech, { nth = 0, match = null, easiest = false } = {}) {
  const st = ctState(n, region);
  let seen = 0;
  for (let guard = 0; guard < 400; guard++) {
    const first = easiest ? ctNextStep(st) : null;
    const found = easiest && (!first || first.tech !== tech) ? [] : ctFindAll(st, tech).filter((s) => stepMatches(s, match));
    if (found.length) {
      if (seen === nth) return { cats: st.cat.map((v, x) => (v ? x : -1)).filter((x) => x >= 0), cand: st.cand.slice(), step: found[0], all: found };
      seen++;
    }
    const next = ctNextStep(st);
    if (!next) return null;
    ctApply(st, next);
    if (st.cat.filter(Boolean).length === n) return null;
  }
  return null;
}

