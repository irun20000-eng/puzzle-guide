// 두 갈래 길을 묶고, 차시 열림·다음 차시·미션을 계산한다.
import { SD_LESSONS, SD_MISSIONS, SD_UNITS } from './sudoku.mjs';
import { CT_LESSONS, CT_MISSIONS, CT_UNITS } from './cats.mjs';

export const PATHS = [
  { id: 'sd', title: '스도쿠 길', lessons: SD_LESSONS, missions: SD_MISSIONS, units: SD_UNITS },
  { id: 'ct', title: '고양이 자리 길', lessons: CT_LESSONS, missions: CT_MISSIONS, units: CT_UNITS },
];

export function sentenceCount(text) {
  return (String(text).match(/[.?!](?=\s|$)/g) || []).length;
}

export function findLesson(id) {
  for (const p of PATHS) {
    const i = p.lessons.findIndex((l) => l.id === id);
    if (i >= 0) return { path: p, lesson: p.lessons[i], index: i };
    const m = p.missions.find((x) => x.id === id);
    if (m) return { path: p, mission: m };
  }
  return null;
}

// 길 안에서 앞 차시를 마쳐야 다음이 열린다. 단원 미션은 그 단원 차시를 모두 마치면 열린다.
// skipTo: 어른이 단원을 건너뛰면(설정) 모든 차시가 열린다.
export function isOpen(id, isDone, openAll = false) {
  if (openAll) return true;
  const f = findLesson(id);
  if (!f) return false;
  if (f.mission) return f.path.lessons.filter((l) => l.unit === f.mission.unit).every((l) => isDone(l.id));
  return f.index === 0 || isDone(f.path.lessons[f.index - 1].id);
}

export function nextLesson(pathId, isDone) {
  const p = PATHS.find((x) => x.id === pathId);
  return p.lessons.find((l) => !isDone(l.id)) || null;
}

export function pathProgress(pathId, isDone) {
  const p = PATHS.find((x) => x.id === pathId);
  const done = p.lessons.filter((l) => isDone(l.id)).length;
  return { done, total: p.lessons.length };
}
