// 차시·미션·큰 판 자유 연습 문제 묶음을 만든다: node tools/make-packs.mjs
// 씨앗이 고정이라 다시 돌려도 같은 묶음이 나온다. 결과는 src/packs/packs.mjs (손으로 고치지 않는다).
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import { RECIPES } from '../src/packs/recipes.mjs';
import { makeRng } from '../src/rng.mjs';
import { sdGenerate, sdFormat, sdCanonical, sdTechIndex } from '../src/sudoku.mjs';
import { ctGenerate, ctFormat, ctCanonical, ctTechIndex } from '../src/cats.mjs';
import { sdFindLessonStep, ctFindLessonStep } from '../src/find-step.mjs';

export function satisfiesNeeds(recipe, text) {
  for (const need of recipe.needs || []) {
    if (recipe.kind === 'sd') {
      const puzzle = [...text].map((ch) => (ch === '.' ? 0 : Number(ch)));
      if (!sdFindLessonStep(puzzle, need.tech, { nth: need.nth || 0, match: need.match, easiest: need.easiest })) return false;
    } else {
      const n = Math.round(Math.sqrt(text.length));
      const region = [...text].map((ch) => ch.charCodeAt(0) - 65);
      if (!ctFindLessonStep(n, region, need.tech, { nth: need.nth || 0, match: need.match, easiest: need.easiest })) return false;
    }
  }
  return true;
}

async function main() {
  const t0 = performance.now();
  const seen = new Set();
  const packs = {};
  const log = [];
  for (const r of RECIPES) {
    const rand = makeRng(r.seed);
    const list = [];
    let tries = 0;
    const r0 = performance.now();
    const limit = r.kind === 'sd' ? 20000 : 3000;
    while (list.length < r.count && tries < limit) {
      tries++;
      let text, canon;
      if (r.kind === 'sd') {
        const g = sdGenerate(r.n, rand, { maxTech: r.maxTech, minTech: r.minTech, attempts: 1, logic: r.mode !== 'scan' });
        if (!g || !g.met) continue;
        text = sdFormat(g.puzzle); canon = 'sd' + sdCanonical(g.puzzle);
      } else {
        const g = ctGenerate(r.n, rand, { maxTech: r.maxTech, minTech: r.minTech, balance: r.balance, minRegion: r.minRegion, attempts: 1 });
        if (!g || !g.met) continue;
        text = ctFormat(g.region); canon = 'ct' + ctCanonical(g.region);
      }
      if (seen.has(canon) || !satisfiesNeeds(r, text)) continue;
      seen.add(canon);
      list.push(text);
    }
    if (list.length < r.count) throw new Error(`${r.id}: ${tries}번 만들어 ${list.length}/${r.count}개만 얻음`);
    packs[r.id] = list;
    log.push(`${r.id}: ${list.length}개, 시도 ${tries}, ${((performance.now() - r0) / 1000).toFixed(1)}초`);
    console.log(log[log.length - 1]);
  }
  const body = Object.entries(packs).map(([id, list]) => `  '${id}': [\n${list.map((s) => `    '${s}',`).join('\n')}\n  ],`).join('\n');
  const src = `// tools/make-packs.mjs 가 만든 파일. 손으로 고치지 않는다.\n// 만든 환경: Node ${process.version}, ${os.cpus()[0]?.model || 'CPU 알 수 없음'}\nexport const PACKS = {\n${body}\n};\n`;
  await writeFile(new URL('../src/packs/packs.mjs', import.meta.url), src, 'utf8');
  console.log(`모두 ${Object.values(packs).reduce((a, l) => a + l.length, 0)}문제, ${(Buffer.byteLength(src) / 1024).toFixed(1)} KB, ${((performance.now() - t0) / 1000).toFixed(1)}초`);
}

if (process.argv[1] && process.argv[1].endsWith('make-packs.mjs')) await main();
