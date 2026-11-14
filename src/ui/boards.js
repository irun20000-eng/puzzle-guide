// 판 그리기(SVG). 시안 board-puzzle.js 를 앱용으로 옮겨 고침: 칸 48 단위, 색은 모두 var(--토큰).
// 화면은 이 문자열을 넣고, 누른 자리는 boardCellAt 으로 칸 번호를 얻는다.
const BOARD_S = 48;
const ZONE_PATTERNS = [
  '',
  '<circle cx="4" cy="4" r="1.3" style="fill:var(--zone-pattern)"/>',
  '<path d="M-1,9 L9,-1 M-1,1 L1,-1 M7,9 L9,7" style="stroke:var(--zone-pattern)" stroke-width="1.2"/>',
  '<path d="M0,4 H8" style="stroke:var(--zone-pattern)" stroke-width="1.2"/>',
  '<path d="M0,4 H8 M4,0 V8" style="stroke:var(--zone-pattern)" stroke-width="1"/>',
  '<path d="M-1,-1 L9,9 M7,-1 L9,1 M-1,7 L1,9" style="stroke:var(--zone-pattern)" stroke-width="1.2"/>',
  '<circle cx="4" cy="4" r="2.2" fill="none" style="stroke:var(--zone-pattern)" stroke-width="1"/>',
  '<path d="M4,2 V6 M2,4 H6" style="stroke:var(--zone-pattern)" stroke-width="1.2"/>',
  '<path d="M4,0 V8" style="stroke:var(--zone-pattern)" stroke-width="1.2"/>',
  '<path d="M0,6 L2,2 L4,6 L6,2 L8,6" fill="none" style="stroke:var(--zone-pattern)" stroke-width="1"/>',
];
// 구역 이름(힌트 문장): DESIGN.md 9-5 뿌리 색 + 무늬. 무늬를 끄면 색 이름만.
const ZONE_COLORS = ['주황색', '하늘색', '청록색', '노란색', '파란색', '주홍색', '자주색', '회색', '모래색', '연보라색'];
const ZONE_MARKS = ['민무늬', '점무늬', '빗금무늬', '가로줄무늬', '격자무늬', '반대 빗금무늬', '고리무늬', '더하기무늬', '세로줄무늬', '지그재그무늬'];
function zoneName(z, pattern) { return pattern ? `${ZONE_COLORS[z]} ${ZONE_MARKS[z]} 구역` : `${ZONE_COLORS[z]} 구역`; }
// 색약에서 헷갈리는 색 쌍(DESIGN.md 9-5, 1부터 센 번호). 이웃 구역끼리 이 쌍이 붙지 않게 색을 고른다.
const ZONE_CONFUSE = [[1, 4], [2, 7], [2, 10], [3, 7], [3, 8], [5, 10], [6, 9], [7, 8]].map(([a, b]) => [a - 1, b - 1]);
const zoneMapCache = new Map();
function zoneMap(n, region) {
  const key = region.join('');
  if (zoneMapCache.has(key)) return zoneMapCache.get(key);
  const nb = [...Array(n)].map(() => new Set());
  for (let x = 0; x < n * n; x++) {
    const r = Math.floor(x / n), c = x % n;
    if (c < n - 1 && region[x] !== region[x + 1]) { nb[region[x]].add(region[x + 1]); nb[region[x + 1]].add(region[x]); }
    if (r < n - 1 && region[x] !== region[x + n]) { nb[region[x]].add(region[x + n]); nb[region[x + n]].add(region[x]); }
  }
  const confuse = (a, b) => ZONE_CONFUSE.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const map = new Array(n).fill(-1);
  for (let g = 0; g < n; g++) {
    const used = new Set(map.filter((z) => z >= 0));
    const free = [...Array(10).keys()].filter((z) => !used.has(z));
    map[g] = free.find((z) => [...nb[g]].every((h) => map[h] < 0 || !confuse(z, map[h]))) ?? free[0];
  }
  zoneMapCache.set(key, map);
  return map;
}
function zoneNamer(n, region, pattern) { const m = zoneMap(n, region); return (g) => zoneName(m[g], pattern); }

let boardSeq = 0;
function zonePatternDefs(id) {
  return ZONE_PATTERNS.map((p, i) => (p ? `<pattern id="${id}-p${i + 1}" width="8" height="8" patternUnits="userSpaceOnUse">${p}</pattern>` : '')).join('');
}

const xMark = (x, y, color, w) => `<path d="M${x + 16},${y + 16} L${x + 32},${y + 32} M${x + 32},${y + 16} L${x + 16},${y + 32}" style="stroke:var(${color})" stroke-width="${w}" stroke-linecap="round"/>`;
const ringRect = (x, y, color, w, dash) => `<rect x="${x + 3}" y="${y + 3}" width="${BOARD_S - 6}" height="${BOARD_S - 6}" rx="8" fill="none" style="stroke:var(${color})" stroke-width="${w}"${dash ? ' stroke-dasharray="4 4"' : ''}/>`;

// 고양이 자리 판. o: { n, region, cats:[칸], marks:[칸], dots:[칸](자동 ×), conflict:[칸], focus:[unit], dim(bool), preview:[칸], previewCat, sel, pick:[칸], pattern, piece, faces:{칸:'happy'|'sorry'}, label }
function renderCatsBoard(o) {
  const n = o.n, S = BOARD_S, W = n * S, id = 'cb' + (++boardSeq);
  const at = (x) => [(x % n) * S, Math.floor(x / n) * S];
  const zmap = zoneMap(n, o.region);
  let g = `<defs>${zonePatternDefs(id)}</defs>`;
  for (let x = 0; x < n * n; x++) {
    const z = zmap[o.region[x]], [px, py] = at(x);
    g += `<rect x="${px}" y="${py}" width="${S}" height="${S}" style="fill:var(--zone-${z + 1})"/>`;
    if (o.pattern !== false && ZONE_PATTERNS[z]) g += `<rect x="${px}" y="${py}" width="${S}" height="${S}" fill="url(#${id}-p${z + 1})"/>`;
  }
  for (let i = 1; i < n; i++) g += `<path d="M${i * S},0 V${W} M0,${i * S} H${W}" style="stroke:var(--zone-line)" stroke-width="1"/>`;
  // 힌트 1단계: 볼 곳만 또렷하게, 나머지는 흐리게
  if (o.focus && o.focus.length) {
    const keep = new Set(o.focus.flatMap((u) => u.cells));
    for (let x = 0; x < n * n; x++) if (!keep.has(x)) { const [px, py] = at(x); g += `<rect x="${px}" y="${py}" width="${S}" height="${S}" style="fill:var(--canvas);opacity:.62"/>`; }
  }
  let edge = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = r * n + c;
    if (c < n - 1 && o.region[x] !== o.region[x + 1]) edge += `M${(c + 1) * S},${r * S} V${(r + 1) * S} `;
    if (r < n - 1 && o.region[x] !== o.region[x + n]) edge += `M${c * S},${(r + 1) * S} H${(c + 1) * S} `;
  }
  g += `<path d="${edge}" style="stroke:var(--zone-edge)" stroke-width="3" stroke-linecap="square"/>`;
  g += `<rect x="1.5" y="1.5" width="${W - 3}" height="${W - 3}" rx="6" fill="none" style="stroke:var(--zone-edge)" stroke-width="3"/>`;
  for (const x of o.dots || []) { const [px, py] = at(x); g += `<circle cx="${px + S / 2}" cy="${py + S / 2}" r="3" style="fill:var(--mark-x);opacity:.55"/>`; }
  for (const x of o.marks || []) { const [px, py] = at(x); g += xMark(px, py, '--mark-x', 2.5); }
  for (const x of o.pick || []) { const [px, py] = at(x); g += ringRect(px, py, '--acc-ink', 3); }
  for (const x of o.preview || []) { const [px, py] = at(x); g += xMark(px, py, '--acc-ink', 3) + ringRect(px, py, '--acc-ink', 2, true); }
  for (const x of o.spot || []) { const [px, py] = at(x); g += ringRect(px, py, '--acc-ink', 3, true); }
  for (const x of o.conflict || []) { const [px, py] = at(x); g += ringRect(px, py, '--conflict', 3); }
  const piece = o.piece === 'star' ? 'star' : 'cat';
  const cats = [...(o.cats || []), ...(o.previewCat !== undefined && o.previewCat !== null ? [o.previewCat] : [])];
  for (const x of cats) {
    const [px, py] = at(x);
    const face = (o.faces && o.faces[x]) || 'normal';
    const cls = o.popCell === x ? ' class="pop-in"' : '';
    const ghost = x === o.previewCat ? ' opacity=".55"' : '';
    g += `<g${cls}${ghost} style="transform-origin:${px + S / 2}px ${py + S / 2}px"><use href="#${piece}-${piece === 'cat' ? face : 'normal'}" x="${px + 6}" y="${py + 6}" width="${S - 12}" height="${S - 12}"/></g>`;
  }
  if (o.sel !== undefined && o.sel !== null && o.sel >= 0) { const [px, py] = at(o.sel); g += `<rect x="${px + 2}" y="${py + 2}" width="${S - 4}" height="${S - 4}" rx="8" fill="none" style="stroke:var(--focus)" stroke-width="3"/>`; }
  return `<svg class="board-svg" viewBox="0 0 ${W} ${W}" role="img" aria-label="${o.label || `고양이 자리 ${n}×${n} 판`}" data-n="${n}">${g}</svg>`;
}

// 스도쿠 판. o: { n, puzzle, values, notes:[mask], sel, conflict:[칸], wrong:[칸], focus:[unit], spot:[칸], pick:[칸], elimPreview:[{x,mask}], placePreview:{x,d}, label, popCell }
function renderSudokuBoard(o) {
  const n = o.n, S = BOARD_S, W = n * S;
  const br = n === 4 ? 2 : n === 6 ? 2 : 3, bc = n === 4 ? 2 : 3;
  const at = (x) => [(x % n) * S, Math.floor(x / n) * S];
  const boxOf = (x) => Math.floor(Math.floor(x / n) / br) * (n / bc) + Math.floor((x % n) / bc);
  const fz = Math.round(S * (o.wide ? 0.62 : 0.54));
  // 메모 숫자는 화면에서 14px: scale = 판 한 칸 단위 / 화면 px
  const memoPx = +(14 * (o.scale || 1)).toFixed(2);
  const vals = o.values;
  const sel = o.sel !== undefined && o.sel !== null && o.sel >= 0 ? o.sel : null;
  const selV = sel !== null ? vals[sel] : 0;
  const bad = new Set([...(o.conflict || []), ...(o.wrong || [])]);
  let g = `<rect width="${W}" height="${W}" style="fill:var(--grid-cell)"/>`;
  const keep = o.focus && o.focus.length ? new Set(o.focus.flatMap((u) => u.cells)) : null;
  for (let x = 0; x < n * n; x++) {
    let fill = '';
    if (sel !== null) {
      if (Math.floor(x / n) === Math.floor(sel / n) || x % n === sel % n || boxOf(x) === boxOf(sel)) fill = '--cell-peer';
      if (selV && vals[x] === selV) fill = '--cell-same';
      if (x === sel) fill = '--cell-sel';
    }
    if (keep && keep.has(x) && x !== sel) fill = '--acc-soft';
    if (bad.has(x)) fill = '--bad-soft';
    if (fill) { const [px, py] = at(x); g += `<rect x="${px}" y="${py}" width="${S}" height="${S}" style="fill:var(${fill})"/>`; }
  }
  for (let i = 1; i < n; i++) g += `<path d="M${i * S},0 V${W} M0,${i * S} H${W}" style="stroke:var(--grid-line)" stroke-width="1"/>`;
  if (keep) for (let x = 0; x < n * n; x++) if (!keep.has(x)) { const [px, py] = at(x); g += `<rect x="${px}" y="${py}" width="${S}" height="${S}" style="fill:var(--canvas);opacity:.62"/>`; }
  for (let i = 1; i < n; i++) {
    if (i % bc === 0) g += `<path d="M${i * S},0 V${W}" style="stroke:var(--grid-box)" stroke-width="2.5"/>`;
    if (i % br === 0) g += `<path d="M0,${i * S} H${W}" style="stroke:var(--grid-box)" stroke-width="2.5"/>`;
  }
  g += `<rect x="1.25" y="1.25" width="${W - 2.5}" height="${W - 2.5}" rx="4" fill="none" style="stroke:var(--grid-box)" stroke-width="2.5"/>`;
  for (const x of o.pick || []) { const [px, py] = at(x); g += ringRect(px, py, '--acc-ink', 3); }
  for (const x of o.spot || []) { const [px, py] = at(x); g += ringRect(px, py, '--acc-ink', 3, true); }
  if (sel !== null) { const [px, py] = at(sel); g += `<rect x="${px + 2.5}" y="${py + 2.5}" width="${S - 5}" height="${S - 5}" rx="6" fill="none" style="stroke:var(--focus)" stroke-width="3"/>`; }
  const elim = new Map((o.elimPreview || []).map((e) => [e.x, e.mask]));
  for (let x = 0; x < n * n; x++) {
    const [px, py] = at(x);
    const v = vals[x];
    if (v) {
      const given = Boolean(o.puzzle[x]);
      const isBad = bad.has(x);
      const cls = o.popCell === x ? ' class="pop-in"' : '';
      g += `<text${cls} x="${px + S / 2}" y="${py + S / 2 + fz * 0.36}" text-anchor="middle" style="transform-origin:${px + S / 2}px ${py + S / 2}px;fill:var(${isBad ? '--bad' : given ? '--digit-given' : '--digit-user'});font:${given ? 700 : 400} ${fz}px var(--font)">${v}</text>`;
      if (isBad) g += `<path d="M${px + S - 14},${py + 4} h10 v10 z" style="fill:var(--bad)"/>`;
      continue;
    }
    if (o.placePreview && o.placePreview.x === x) {
      g += `<text x="${px + S / 2}" y="${py + S / 2 + fz * 0.36}" text-anchor="middle" style="fill:var(--acc-ink);opacity:.7;font:400 ${fz}px var(--font)">${o.placePreview.d}</text>`;
      g += ringRect(px, py, '--acc-ink', 2, true);
      continue;
    }
    const m = o.notes ? o.notes[x] : 0;
    const em = elim.get(x) || 0;
    if (!m && !em) continue;
    const cols = n === 4 ? 2 : 3;
    const step = n === 4 ? 20 : 15;
    const ox = n === 4 ? 14 : 9, oy = (n === 4 ? 14 : 9) + memoPx * 0.36;
    for (let d = 1; d <= n; d++) {
      const b = 1 << (d - 1);
      if (!(m & b) && !(em & b)) continue;
      const i = d - 1, mx = i % cols, my = Math.floor(i / cols);
      const tx = px + ox + mx * step, ty = py + oy + my * step;
      if (em & b) {
        g += `<text x="${tx}" y="${ty}" text-anchor="middle" style="fill:var(--acc-ink);font:700 ${memoPx}px var(--font)">${d}</text><path d="M${tx - 6},${ty - 10} L${tx + 6},${ty + 2}" style="stroke:var(--acc-ink)" stroke-width="2" stroke-linecap="round"/>`;
      } else g += `<text x="${tx}" y="${ty}" text-anchor="middle" style="fill:var(--digit-memo);font:700 ${memoPx}px var(--font)">${d}</text>`;
    }
  }
  return `<svg class="board-svg" viewBox="0 0 ${W} ${W}" role="img" aria-label="${o.label || `스도쿠 ${n}×${n} 판`}" data-n="${n}">${g}</svg>`;
}

// 누른 자리 → 칸 번호
function boardCellAt(svg, clientX, clientY) {
  const n = Number(svg.dataset.n);
  const r = svg.getBoundingClientRect();
  const c = Math.floor(((clientX - r.left) / r.width) * n);
  const row = Math.floor(((clientY - r.top) / r.height) * n);
  if (c < 0 || c >= n || row < 0 || row >= n) return -1;
  return row * n + c;
}

// 판 위에 겹치는 칸 단추(누르기, 키보드 초점, 화면 읽기 이름). labels[x] = 칸 이름
function boardCellsHtml(n, labels, sel) {
  let h = '';
  const focusAt = sel !== null && sel !== undefined && sel >= 0 ? sel : 0;
  for (let x = 0; x < n * n; x++) h += `<button class="cellbtn" role="gridcell" data-act="cell" data-arg="${x}" tabindex="${x === focusAt ? 0 : -1}" aria-label="${labels[x]}"${x === focusAt ? ' data-roving' : ''}></button>`;
  return `<div class="cells" role="grid" aria-label="판 칸" style="grid-template-columns:repeat(${n},1fr)">${h}</div>`;
}
