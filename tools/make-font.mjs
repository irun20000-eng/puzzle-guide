// 앱에 쓰인 글자만 Pretendard 400·700에서 잘라 src/font.css 에 base64로 넣는다: node tools/make-font.mjs
// 필요: pyftsubset·python(fonttools), Pretendard OTF (SIL Open Font License 1.1).
// 환경 변수: PRETENDARD_DIR(Pretendard-Regular.otf·Bold.otf 가 있는 폴더, 꼭 필요), PYFTSUBSET, PYTHON(fonttools 가 있는 파이썬).
// OFL 조건 3: 잘라 낸 글꼴은 수정본이라 예약 이름 "Pretendard"를 쓰지 않는다 → tools/rename-font.py 가 이름 기록 1·3·4·6·16·17을 "PG Sans"로 바꾼다(0·13·14 유지).
// 글자를 새로 쓰면 다시 돌린다. tests/build.test.mjs 가 "글꼴에 없는 한글"과 이름 기록을 확인한다.
import { readFile, writeFile, readdir, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = process.env.PRETENDARD_DIR;
const PYFT = process.env.PYFTSUBSET || 'pyftsubset';
const PY = process.env.PYTHON || 'python';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(mjs|js|html|css)$/.test(e.name) && e.name !== 'font.css') out.push(p);
  }
  return out;
}

export async function appChars() {
  const files = await walk(path.join(root, 'src'));
  const chars = new Set();
  for (const f of files) for (const ch of await readFile(f, 'utf8')) if (ch.codePointAt(0) >= 0x20) chars.add(ch);
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const c of '·→←×−–…“”‘’「」★☆') chars.add(c);
  return [...chars].sort().join('');
}

async function main() {
  if (!FONT_DIR) throw new Error('PRETENDARD_DIR 환경 변수에 Pretendard OTF 폴더를 적어 주세요.');
  const text = await appChars();
  const tmp = await mkdtemp(path.join(tmpdir(), 'pg-font-'));
  const txt = path.join(tmp, 'chars.txt');
  await writeFile(txt, text, 'utf8');
  const faces = [];
  const names = [];
  for (const [w, file, style] of [[400, 'Pretendard-Regular.otf', 'Regular'], [700, 'Pretendard-Bold.otf', 'Bold']]) {
    const o = path.join(tmp, `pd-${w}.woff2`);
    execFileSync(PYFT, [path.join(FONT_DIR, file), `--text-file=${txt}`, '--flavor=woff2', `--output-file=${o}`, '--layout-features=kern,tnum,ccmp,locl', '--no-hinting', '--desubroutinize', '--name-IDs=0,1,2,3,4,5,6,13,14,16,17', '--name-languages=*']);
    const out = JSON.parse(execFileSync(PY, [path.join(root, 'tools', 'rename-font.py'), o, style], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).toString());
    if (out.left.length || /Pretendard/.test(out['1'] + out['4'] + out['6'])) throw new Error('이름 바꾸기 실패: ' + JSON.stringify(out));
    if (!/Kil Hyung-jin/.test(out['0']) || !out['13'] || !out['14']) throw new Error('저작권·라이선스 이름 기록이 없음: ' + JSON.stringify(out));
    names.push(`${w}: 1=${out['1']}; 4=${out['4']}; 6=${out['6']}; 0·13·14 유지`);
    const b64 = (await readFile(o)).toString('base64');
    faces.push(`@font-face{font-family:"PD";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${w};font-style:normal;font-display:swap}`);
    console.log(`PG Sans ${style}: ${(b64.length * 0.75 / 1024).toFixed(1)} KB`);
  }
  const hangul = [...text].filter((c) => /[\uac00-\ud7a3]/.test(c)).join('');
  const css = `/* PG Sans 400·700: Pretendard(Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard)에서 앱 글자만 잘라 이름을 바꾼 수정본. SIL Open Font License 1.1(THIRD-PARTY-LICENSES.md). tools/make-font.mjs 가 만듦. */\n/* 이름 기록: ${names.join(' / ')} */\n/* 글자: ${hangul} */\n${faces.join('\n')}\n`;
  await writeFile(path.join(root, 'src', 'font.css'), css, 'utf8');
  console.log('src/font.css', (Buffer.byteLength(css) / 1024).toFixed(1) + ' KB, 한글 ' + hangul.length + '자');
}

if (process.argv[1] && process.argv[1].endsWith('make-font.mjs')) await main();
