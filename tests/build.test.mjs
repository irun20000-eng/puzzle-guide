import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { build, SCRIPTS, topLevelNames } from '../build.mjs';
import { appChars } from '../tools/make-font.mjs';

const INSTALL_LINK = /<link rel="(?:manifest|icon|apple-touch-icon)" href="(?:manifest\.webmanifest|icons\/[\w.-]+)"[^>]*>\n?/g;
const withoutInstallLinks = (h) => h.replace(INSTALL_LINK, '');
let built;
const getBuilt = async () => (built ||= await build());

test('빌드: 한 파일, 외부 자원 0, noindex, 모듈 문법 없음', async () => {
  const { out } = await getBuilt();
  const html = await readFile(out, 'utf8');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.equal(html.includes('/*__CSS__*/') || html.includes('/*__JS__*/'), false);
  assert.equal(/<script[^>]+src=/i.test(html), false);
  assert.equal(/<link[^>]+href=/i.test(withoutInstallLinks(html)), false);
  assert.equal(/@import|url\(\s*['"]?https?:/i.test(html), false);
  assert.equal(/(?:src|href)=["']https?:/i.test(html), false);
  assert.equal(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(html), false);
  assert.equal(/^\s*(export|import)\s/m.test(html), false);
});

test('빌드: 합친 스크립트가 문법 오류 없이 읽히고, 파일끼리 이름이 겹치지 않는다', async () => {
  const { out } = await getBuilt();
  const html = await readFile(out, 'utf8');
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  assert.doesNotThrow(() => new Function(m[1]));
  const seen = new Map();
  for (const f of SCRIPTS) for (const name of topLevelNames(await readFile(new URL('../' + f, import.meta.url), 'utf8'))) {
    assert.ok(!seen.has(name), `${name}: ${seen.get(name)}, ${f}`);
    seen.set(name, f);
  }
});

test('글꼴: Pretendard 400·700 이 들어 있고, 앱에 쓰인 한글이 모두 서브셋에 있다', async () => {
  const css = await readFile(new URL('../src/font.css', import.meta.url), 'utf8');
  assert.match(css, /font-weight:400/);
  assert.match(css, /font-weight:700/);
  assert.match(css, /Open Font License/);
  assert.match(css, /Reserved Font Name Pretendard/);
  const listed = new Set([...(/글자: ([^*]*) \*\//.exec(css) || [, ''])[1]]);
  const used = [...(await appChars())].filter((c) => /[\uac00-\ud7a3]/.test(c));
  const missing = used.filter((c) => !listed.has(c));
  assert.deepEqual(missing, [], '글꼴을 다시 만드세요: node tools/make-font.mjs');
});

test('화면 CSS: hex 색 0, 그라데이션 0, 바깥 그림자·흐림 0, 굵기 400·700만', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.equal((css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length, 0);
  assert.equal(/gradient/i.test(css), false);
  assert.equal(/text-shadow|drop-shadow|blur\(|backdrop-filter/.test(css), false);
  for (const m of css.matchAll(/box-shadow:([^;}]+)/g)) assert.ok(/inset|var\(--ring|none/.test(m[1]), m[1]);
  assert.equal(/font-weight:\s*(500|600|800|900)/.test(css), false);
  assert.equal(/transition:\s*all|ease-in[^-]|scale\(0\)|infinite/.test(css), false);
  assert.match(css, /prefers-reduced-motion/);
});

test('설치: manifest와 아이콘, 서비스 워커(주소로 열 때만)', async () => {
  const { sw } = await getBuilt();
  const root = new URL('../', import.meta.url);
  const html = await readFile(new URL('index.html', root), 'utf8');
  const mf = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
  assert.ok(mf.name && mf.short_name && mf.start_url && mf.display === 'standalone');
  const purposes = mf.icons.map((i) => (i.purpose || 'any') + ':' + i.sizes);
  for (const p of ['any:192x192', 'any:512x512', 'maskable:512x512']) assert.ok(purposes.includes(p), p);
  const hrefs = [...html.matchAll(/<link rel="(?:manifest|icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1]);
  for (const f of [...hrefs, ...mf.icons.map((i) => i.src)]) assert.ok((await stat(new URL(f, root))).size > 0, f);
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.ok(sw.cache.startsWith('puzzle-guide-' + pkg.version + '-'));
  const src = await readFile(sw.out, 'utf8');
  assert.equal(src.includes('__CACHE__') || src.includes('__FILES__'), false);
  for (const f of sw.files.filter((x) => x !== './')) assert.ok((await stat(new URL(f, root))).size > 0, f);
  assert.match(html, /\/\^https\?:\$\/\.test\(location\.protocol\)/);
  assert.match(html, /serviceWorker\.register\('sw\.js'\)/);
});

test('이름 원칙: 화면 문구에 다른 게임 이름이 없고, 스타 배틀은 퍼즐 이야기에서만', async () => {
  const { out } = await getBuilt();
  const html = await readFile(out, 'utf8');
  for (const bad of ['Meowdoku', '메이도쿠', 'Queens', '퀸즈', 'KenKen', 'LinkedIn']) assert.equal(html.includes(bad), false, bad);
  const glossary = await readFile(new URL('../src/glossary.mjs', import.meta.url), 'utf8');
  const lessons = await readFile(new URL('../src/lessons/cats.mjs', import.meta.url), 'utf8');
  assert.equal(lessons.includes('스타 배틀'), false);
  assert.ok(glossary.includes('스타 배틀이라는 장르'));
});

// WOFF2 안 name 테이블 읽기(검수 B3: 수정본은 예약 이름 Pretendard 를 1·4·6에 쓰지 않는다)
import { brotliDecompressSync } from 'node:zlib';
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
export function woff2Names(buf) {
  let p = 48;
  const numTables = buf.readUInt16BE(12);
  const total = buf.readUInt32BE(20);
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[p++]; v = v * 128 + (b & 127); if (!(b & 128)) return v; } return v; };
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++];
    const tag = (flags & 63) === 63 ? buf.toString('latin1', p, (p += 4)) : KNOWN[flags & 63];
    const ver = flags >> 6;
    const orig = base128();
    const transformed = (tag === 'glyf' || tag === 'loca') ? ver === 0 : ver !== 0;
    const len = transformed ? base128() : orig;
    tables.push({ tag, len });
  }
  const data = brotliDecompressSync(buf.subarray(p, p + total));
  let off = 0;
  const t = {};
  for (const x of tables) { t[x.tag] = data.subarray(off, off + x.len); off += x.len; }
  const nm = t.name;
  const count = nm.readUInt16BE(2), so = nm.readUInt16BE(4);
  const out = {};
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    const plat = nm.readUInt16BE(r), id = nm.readUInt16BE(r + 6), len = nm.readUInt16BE(r + 8), o = nm.readUInt16BE(r + 10);
    const raw = nm.subarray(so + o, so + o + len);
    const s = plat === 3 || plat === 0 ? Buffer.from(raw).swap16().toString('utf16le') : raw.toString('latin1');
    (out[id] ||= []).push(s);
  }
  return out;
}

test('글꼴 이름: 서브셋 수정본은 이름 기록 1·3·4·6·16·17에 Pretendard 가 없고, 0·13·14(저작권·라이선스)는 남아 있다', async () => {
  const css = await readFile(new URL('../src/font.css', import.meta.url), 'utf8');
  const faces = [...css.matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], 'base64'));
  assert.equal(faces.length, 2);
  for (const f of faces) {
    const names = woff2Names(f);
    for (const id of [1, 3, 4, 6, 16, 17]) for (const s of names[id] || []) assert.equal(/Pretendard/.test(s), false, id + ': ' + s);
    assert.ok((names[1] || []).every((s) => s === 'PG Sans'));
    assert.ok((names[0] || []).some((s) => /Kil Hyung-jin/.test(s)), '저작권 0번');
    assert.ok((names[13] || []).length && (names[14] || []).length, '라이선스 13·14번');
  }
});
