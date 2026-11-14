// src/ 의 조각들을 인터넷 없이 열리는 한 파일(index.html)로 합친다(바둑 첫걸음 build.mjs 를 고쳐 씀).
// 사용: node build.mjs
// 주의: import 줄은 걷어 내므로 `import { a as b }` 같은 별칭은 쓰지 않는다. 파일끼리 맨 바깥 이름이 겹치면 멈춘다.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => readFile(path.join(root, p), 'utf8');

// 합치는 순서. 뒤 파일이 앞 파일의 함수를 쓴다.
export const SCRIPTS = [
  'src/rng.mjs',
  'src/sudoku.mjs',
  'src/cats.mjs',
  'src/find-step.mjs',
  'src/hint.mjs',
  'src/daily.mjs',
  'src/packs/packs.mjs',
  'src/lesson-engine.mjs',
  'src/lessons/sudoku.mjs',
  'src/lessons/cats.mjs',
  'src/lessons/index.mjs',
  'src/glossary.mjs',
  'src/store.mjs',
  'src/settings.mjs',
  'src/ui/icons.js',
  'src/ui/boards.js',
  'src/ui/game.js',
  'src/ui/app.js',
];
export const STYLES = ['src/font.css', 'src/tokens.css', 'src/tokens-extra.css', 'src/style.css'];

export function inlineModule(source) {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*\n/gm, '')
    .replace(/^export\s+/gm, '');
}

export function topLevelNames(source) {
  const names = [];
  const re = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(source))) names.push(m[1]);
  return names;
}

export async function build() {
  const [template, ...rest] = await Promise.all([read('src/index.template.html'), ...STYLES.map(read), ...SCRIPTS.map(read)]);
  const css = rest.slice(0, STYLES.length).map((s) => s.replace(/\r\n/g, '\n').trim()).join('\n');
  const sources = rest.slice(STYLES.length);

  const owner = new Map();
  sources.forEach((src, i) => {
    if (/^import\s*\{[^}]*\bas\b/m.test(src)) throw new Error('import 별칭(as)은 쓰지 않습니다: ' + SCRIPTS[i]);
    for (const name of topLevelNames(src)) {
      if (owner.has(name)) throw new Error('이름이 겹칩니다: ' + name + ' (' + owner.get(name) + ', ' + SCRIPTS[i] + ')');
      owner.set(name, SCRIPTS[i]);
    }
  });

  const body = sources.map((src, i) => '// ---- ' + SCRIPTS[i] + ' ----\n' + inlineModule(src)).join('\n');
  const js = "(function () {\n'use strict';\n" + body + '\n})();';
  if (/<\/script/i.test(js)) throw new Error('스크립트 안에 </script> 문자열이 있으면 안 됩니다.');

  const html = template.replace(/\r\n/g, '\n')
    .replace('/*__CSS__*/', () => css)
    .replace('/*__JS__*/', () => js);

  const out = path.join(root, 'index.html');
  await writeFile(out, html, 'utf8');
  const sw = await buildServiceWorker(html);
  return { out, bytes: Buffer.byteLength(html), sw, js, css };
}

export async function precacheList() {
  const icons = (await readdir(path.join(root, 'icons'))).filter((f) => /\.(png|svg)$/.test(f)).sort();
  return ['./', 'index.html', 'manifest.webmanifest', ...icons.map((f) => 'icons/' + f)];
}

export async function buildServiceWorker(html) {
  const pkg = JSON.parse(await read('package.json'));
  const hash = createHash('sha256').update(html).digest('hex').slice(0, 10);
  const cache = 'puzzle-guide-' + pkg.version + '-' + hash;
  const files = await precacheList();
  const src = (await read('src/sw.template.js'))
    .replace('__CACHE__', cache)
    .replace('__FILES__', JSON.stringify(files));
  const out = path.join(root, 'sw.js');
  await writeFile(out, src, 'utf8');
  return { out, cache, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { out, bytes } = await build();
  console.log('만들었습니다: ' + out + ' (' + (bytes / 1024).toFixed(1) + ' KB)');
}
