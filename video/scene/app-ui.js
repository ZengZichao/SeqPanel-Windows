// SeqPanel UI mock — a faithful, animatable redraw of the real window (three columns, dark theme).
import { C, MONO, FONT, clamp, lerp, pr, rgba, rr, fillRR, strokeRR, txt, measure, line, easeOutCubic, easeInOutCubic, smooth, clickRing } from './anim.js';

export const AW = 1560, AH = 900;

// column rects in mock space (used by the camera)
export const RECT = {
  win: [0, 0, AW, AH],
  col1: [16, 196, 340, 684],
  col2: [368, 196, 560, 684],
  col3: [940, 196, 604, 684],
  tree: [16, 244, 340, 636],
  form: [368, 400, 560, 480],
  workflow: [940, 196, 604, 250],
  cmdline: [940, 440, 604, 120],
  results: [940, 566, 604, 314],
  statusbar: [0, 152, AW, 34],
};

const TREE = [
  { c: 'addadd', d: 'This command adds an identifier to each s', lvl: 0 },
  { c: 'append', d: 'Append alignments to an input alignment', lvl: 0 },
  { c: 'build', d: '', lvl: 0, grp: true },
  { c: 'build distboot', d: 'Builds bootstrap distribution from trees', lvl: 1 },
  { c: 'build seqboot', d: 'Generates n bootstrap alignments', lvl: 1 },
  { c: 'build weightboot', d: 'generate weights from a bootstrap run', lvl: 1 },
  { c: 'clean', d: '', lvl: 0, grp: true },
  { c: 'clean seqs', d: 'Removes sequences according to their id', lvl: 1 },
  { c: 'clean sites', d: 'Removes sites constitutively occupied', lvl: 1 },
  { c: 'codonalign', d: 'Aligns a given nt fasta file using aa seqs', lvl: 0 },
  { c: 'compress', d: 'Removes identical patterns or sites', lvl: 0 },
  { c: 'compute', d: '', lvl: 0, grp: true },
  { c: 'compute distance', d: 'Compute distance matrix from alignment', lvl: 1 },
  { c: 'compute entropy', d: 'Computes entropy of the alignment', lvl: 1 },
  { c: 'compute pssm', d: 'Computes and prints position specific sc', lvl: 1 },
  { c: 'concat', d: 'Concatenates a set of alignments', lvl: 0 },
  { c: 'consensus', d: 'Compute the majority consensus sequence', lvl: 0 },
  { c: 'convertgff', d: 'This command converts the gff to fasta', lvl: 0 },
  { c: 'dedup', d: 'Deduplicate sequences that have same sit', lvl: 0 },
  { c: 'diff', d: 'Prints only characters that are different', lvl: 0 },
  { c: 'draw', d: '', lvl: 0, grp: true },
  { c: 'draw biojs', d: 'Draw alignments in html using biojs', lvl: 1 },
  { c: 'draw circos', d: 'Draw a circos plot of the alignment', lvl: 1 },
  { c: 'draw png', d: 'Draw alignments in png format', lvl: 1 },
  { c: 'draw split', d: 'Draw a split network from a distance matr', lvl: 1 },
  { c: 'merge', d: '', lvl: 0, grp: true },
  { c: 'revcomp', d: 'Reverse complement the sequences', lvl: 0 },
  { c: 'seqs', d: 'Select sequences from the alignment', lvl: 0 },
  { c: 'sites', d: 'Select sites from the alignment', lvl: 0 },
  { c: 'stats', d: 'Print some statistics about the alignment', lvl: 0 },
];
const matches = (row, q) => !q || row.c.includes(q) || row.d.toLowerCase().includes(q.toLowerCase());

const FORM = [
  { flag: '--char', type: 'string', def: '""', val: 'GAP', desc: 'Characters to treat as missing, e.g. GAP' },
  { flag: '--cutoff', type: 'int', def: '0', desc: 'Remove sites present in less than cutoff sequences' },
  { flag: '--count-gap', type: 'bool', def: 'false', desc: 'Consider gap characters as missing data', on: true },
  { flag: '--preserve-order', type: 'bool', def: 'false', desc: 'Preserve the order of sites in the input' },
  { flag: '--reference', type: 'string', def: '""', desc: 'Reference sequence used to define occupied sites' },
];
const STEPS = [
  { c: 'clean seqs', f: '' },
  { c: 'clean sites', f: '--char GAP --cutoff 0' },
  { c: 'stats', f: '' },
];
const CMDLINE = `clean seqs --align 'F:\\ZengZichao\\下载\\SeqPanel\\samples\\demo.fasta' | clean sites --char GAP --cutoff 0 | stats`;
const STATS = [
  ['length', '60', ''], ['nseqs', '7', ''], ['avgalleles', '1.0500', ''], ['variable sites', '2', ''],
  ['char', 'nb', 'freq'], ['A', '104', '0.247619'], ['C', '94', '0.223810'],
  ['G', '105', '0.250000'], ['T', '117', '0.278571'], ['alphabet', 'nucleotide', ''],
];
const TAXA = ['species_A', 'species_B', 'species_C', 'species_D', 'species_E', 'Long_name_taxon_F', 'Long_name_taxon_G', 'taxon_H'];

// ---------- pieces ----------
function chip(ctx, x, y, label, o = {}) {
  const w = measure(ctx, label, { size: o.size || 15 }) + (o.pad == null ? 26 : o.pad * 2);
  const h = o.h || 32;
  fillRR(ctx, x, y, w, h, 6, o.bg || C.panel2);
  strokeRR(ctx, x, y, w, h, 6, o.border || C.line, 1);
  txt(ctx, label, x + (o.pad == null ? 13 : o.pad), y + h / 2 + 5, { size: o.size || 15, color: o.color || C.text2, weight: o.weight || 400 });
  return w;
}
function fieldLabel(ctx, x, y, s) { txt(ctx, s, x, y, { size: 14, color: C.muted, weight: 700, ls: 0.6 }); }

function drawTitlebar(ctx, S) {
  fillRR(ctx, 0, 0, AW, 46, 0, '#0F141B');
  line(ctx, 0, 46, AW, 46, C.line, 1);
  ['#F85149', '#D29922', '#3FB950'].forEach((c, i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(26 + i * 26, 23, 7, 0, 6.2832); ctx.fill();
  });
  txt(ctx, 'SeqPanel', 112, 29, { size: 17, weight: 700, color: C.text });
  txt(ctx, '—  GoAlign 图形操作面板', 190, 29, { size: 15, color: C.muted });
  const a = S.langFade == null ? 1 : S.langFade;
  txt(ctx, '语言  中文', AW - 250, 29, { size: 14, color: a > 0.5 ? C.text2 : C.cyan, alpha: 1 });
  txt(ctx, '主题  深色', AW - 130, 29, { size: 14, color: C.text2 });
}
function drawToolbar(ctx, S) {
  fieldLabel(ctx, 16, 74, '可执行文件');
  fillRR(ctx, 100, 54, 470, 32, 6, C.panel3); strokeRR(ctx, 100, 54, 470, 32, 6, C.line, 1);
  txt(ctx, 'C:\\Users\\10737\\AppData\\Roaming\\app.seq.panel\\tools\\goalign.exe', 112, 75, { size: 13, mono: true, color: C.text2 });
  let x = 586;
  x += chip(ctx, x + 8, 54, '选择…') + 8;
  x += chip(ctx, x + 8, 54, '用内置 GoAlign') + 8;
  chip(ctx, x + 8, 54, '重新反射命令表');
  fieldLabel(ctx, 16, 128, '预设工作流');
  const presets = ['去缺口后统计', '两两距离矩阵', '比对热图', '截短序列名并导出 Phylip', '去重并导出 Nexus'];
  let px = 100;
  presets.forEach((p, i) => {
    const on = S.presetHi === i;
    px += chip(ctx, px, 108, p, { bg: on ? rgba(C.blue, 0.18) : C.panel2, border: on ? C.blue : C.line, color: on ? C.text : C.text2 }) + 8;
  });
  fillRR(ctx, 0, 152, AW, 34, 0, S.status && S.status.tone === 'ok' ? '#101A14' : '#10161E');
  line(ctx, 0, 152, AW, 152, C.line2, 1); line(ctx, 0, 186, AW, 186, C.line2, 1);
  const st = S.status || { text: '' };
  txt(ctx, st.text, 16, 174, { size: 14, mono: true, color: st.tone === 'ok' ? C.green : st.tone === 'err' ? C.red : C.muted });
}
function drawCol1(ctx, S) {
  const [x, y, w, h] = RECT.col1;
  fillRR(ctx, x, y, w, h, 10, C.panel); strokeRR(ctx, x, y, w, h, 10, C.line2, 1);
  fieldLabel(ctx, x + 14, y + 24, '命令表');
  // search box
  const sy = y + 36;
  fillRR(ctx, x + 12, sy, w - 24, 32, 6, C.panel3);
  strokeRR(ctx, x + 12, sy, w - 24, 32, 6, S.search ? C.blue : C.line, S.search ? 1.6 : 1);
  txt(ctx, S.search || '搜索命令或说明', x + 24, sy + 21, { size: 14, mono: !!S.search, color: S.search ? C.text : C.dim });
  if (S.search && S.caret) {
    const cw = measure(ctx, S.search, { size: 14, mono: true });
    line(ctx, x + 25 + cw, sy + 6, x + 25 + cw, sy + 26, C.blue2, 1.6);
  }
  // rows
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 6, sy + 40, w - 12, h - (sy + 40 - y) - 8); ctx.clip();
  const rowH = 27;
  let i = 0, shown = 0;
  for (const row of TREE) {
    const hit = matches(row, S.filterQ || '');
    const appear = clamp((S.treeReveal - i * 0.55) / 3.5);
    if (appear > 0.01) {
      const yy = sy + 46 + shown * rowH - (S.treeScroll || 0);
      const fade = hit ? 1 : 0.13;
      const act = S.activeCmd === row.c;
      const a = easeOutCubic(appear) * fade;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(0, (1 - easeOutCubic(appear)) * 10);
      if (act) { fillRR(ctx, x + 10, yy - 17, w - 20, rowH - 2, 6, rgba(C.blue, 0.22)); strokeRR(ctx, x + 10, yy - 17, w - 20, rowH - 2, 6, rgba(C.blue, 0.6), 1); }
      else if (row.grp) fillRR(ctx, x + 10, yy - 17, w - 20, rowH - 2, 6, '#12181F');
      txt(ctx, row.c, x + 18 + row.lvl * 22, yy, { size: 14, mono: true, weight: row.grp ? 700 : 400, color: row.grp ? C.blue2 : C.text2 });
      const dx = x + 18 + row.lvl * 22 + measure(ctx, row.c, { size: 14, mono: true }) + 12;
      if (row.d) {
        let d = row.d;
        while (d.length > 3 && measure(ctx, d + '…', { size: 12.5 }) > x + w - 12 - dx) d = d.slice(0, -1);
        txt(ctx, d.length < row.d.length ? d + '…' : d, dx, yy, { size: 12.5, color: C.dim });
      }
      ctx.restore();
      shown++;
    }
    i++;
  }
  ctx.restore();
  // scrollbar
  fillRR(ctx, x + w - 8, sy + 46, 3, h - 66, 2, '#222C39');
  fillRR(ctx, x + w - 8, sy + 46 + (S.treeScroll || 0) * 0.35, 3, 120, 2, '#3A4655');
}
function drawCol2(ctx, S) {
  const [x, y, w, h] = RECT.col2;
  fillRR(ctx, x, y, w, h, 10, C.panel); strokeRR(ctx, x, y, w, h, 10, C.line2, 1);
  fieldLabel(ctx, x + 14, y + 24, '输入');
  // radio row
  const ry = y + 40;
  ctx.strokeStyle = C.blue; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 22, ry + 8, 7, 0, 6.2832); ctx.stroke();
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x + 22, ry + 8, 3.4, 0, 6.2832); ctx.fill();
  txt(ctx, '比对文件 (传 --align)', x + 38, ry + 13, { size: 14, color: C.text2 });
  ctx.strokeStyle = C.line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + 232, ry + 8, 7, 0, 6.2832); ctx.stroke();
  txt(ctx, '直接粘贴', x + 248, ry + 13, { size: 14, color: C.muted });
  // path box
  fillRR(ctx, x + 14, ry + 26, w - 28, 34, 6, C.panel3);
  strokeRR(ctx, x + 14, ry + 26, w - 28, 34, 6, C.line, 1);
  txt(ctx, 'F:\\ZengZichao\\下载\\SeqPanel\\samples\\demo.fasta', x + 26, ry + 48, { size: 13.5, mono: true, color: C.text2 });
  // params
  const py = ry + 78;
  txt(ctx, '参数 · ' + (S.formCmd || 'clean sites').toUpperCase(), x + 14, py, { size: 14, weight: 700, color: C.blue2 });
  txt(ctx, '命令参数', x + 14, py + 26, { size: 13, weight: 700, color: C.muted });
  let yy = py + 52;
  FORM.forEach((f, i) => {
    const a = clamp((S.formReveal - i * 2.2) / 3.2);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = easeOutCubic(a);
    ctx.translate((1 - easeOutCubic(a)) * 14, 0);
    txt(ctx, f.flag, x + 14, yy, { size: 14, mono: true, weight: 700, color: C.text });
    const chipX = x + 14 + measure(ctx, f.flag, { size: 14, mono: true }) + 8;
    const chipW = chip(ctx, chipX, yy - 15, f.type, { size: 11.5, h: 20, pad: 7, bg: '#182029', color: C.muted });
    const cx2 = Math.max(x + 150, chipX + chipW + 12);
    if (f.type === 'bool') {
      ctx.strokeStyle = f.on ? C.blue : C.line; ctx.lineWidth = 1.6;
      rr(ctx, cx2, yy - 12, 15, 15, 3); ctx.stroke();
      if (f.on) { ctx.fillStyle = C.blue; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx2 + 3, yy - 4.5); ctx.lineTo(cx2 + 6.5, yy - 1.5); ctx.lineTo(cx2 + 12, yy - 9); ctx.stroke(); }
      txt(ctx, '启用', cx2 + 24, yy, { size: 13.5, color: C.text2 });
    } else {
      fillRR(ctx, cx2, yy - 14, 120, 26, 5, C.panel3); strokeRR(ctx, cx2, yy - 14, 120, 26, 5, C.line, 1);
      txt(ctx, f.val || f.def, cx2 + 10, yy + 4, { size: 13, mono: true, color: f.val ? C.text : (f.type === 'string' ? C.dim : C.text2) });
      if (f.type === 'string') { txt(ctx, '浏览…', cx2 + 132, yy + 4, { size: 12.5, color: C.blue2 }); }
    }
    txt(ctx, f.desc, x + 14, yy + 21, { size: 12.5, color: C.dim });
    ctx.restore();
    yy += 56;
  });
  // generic flags disclosure
  const gy = yy + 10;
  const ga = clamp(S.genericReveal);
  ctx.save(); ctx.globalAlpha = ga;
  ctx.fillStyle = C.blue2; ctx.beginPath();
  ctx.moveTo(x + 16, gy - 9); ctx.lineTo(x + 16 + 9 * (1 - smooth(S.genericOpen || 0)), gy - 4); ctx.lineTo(x + 16, gy + 1); ctx.closePath(); ctx.fill();
  txt(ctx, `通用参数 (${S.genericCount || 21})`, x + 32, gy, { size: 13.5, color: C.blue2 });
  if ((S.genericOpen || 0) > 0.02) {
    ctx.save(); ctx.globalAlpha = smooth(S.genericOpen) * ga;
    const g = ['--align  string  ""', '--phylip  bool  false', '--nexus  bool  false', '--auto-detect  bool  true', '--threads  int  1', '--alphabet  enum  aminoacid'];
    g.forEach((s, i) => txt(ctx, s, x + 34, gy + 26 + i * 22, { size: 12.5, mono: true, color: C.muted }));
    ctx.restore();
  }
  ctx.restore();
}
function drawCol3(ctx, S) {
  const [x, y, w, h] = RECT.col3;
  const steps = S.steps || STEPS;
  fillRR(ctx, x, y, w, h, 10, C.panel); strokeRR(ctx, x, y, w, h, 10, C.line2, 1);
  fieldLabel(ctx, x + 14, y + 24, '工作流');
  // steps
  steps.forEach((s, i) => {
    const a = clamp((S.wfReveal - i * 2.6) / 3.0);
    if (a <= 0) return;
    const sy = y + 40 + i * 46;
    const e = easeOutCubic(a);
    ctx.save(); ctx.globalAlpha = e; ctx.translate((1 - e) * 26, 0);
    const sel = S.wfSel === i;
    fillRR(ctx, x + 12, sy, w - 24, 38, 7, sel ? rgba(C.blue, 0.16) : C.panel3);
    strokeRR(ctx, x + 12, sy, w - 24, 38, 7, sel ? C.blue : C.line, sel ? 1.6 : 1);
    txt(ctx, String(i + 1), x + 24, sy + 25, { size: 13, mono: true, color: C.dim });
    txt(ctx, s.c, x + 44, sy + 25, { size: 14.5, mono: true, weight: 700, color: C.text });
    if (s.f) txt(ctx, s.f, x + 46 + measure(ctx, s.c, { size: 14.5, mono: true }), sy + 25, { size: 13.5, mono: true, color: C.amber });
    txt(ctx, '↑ ↓ ×', x + w - 60, sy + 25, { size: 13, color: C.dim });
    ctx.restore();
    // pipe connector between steps
    if (i < steps.length - 1 && clamp((S.wfReveal - (i + 1) * 2.6) / 3.0) > 0.5) {
      const py = sy + 38, ph = 8;
      ctx.save(); ctx.globalAlpha = 0.9;
      line(ctx, x + 30, py, x + 30, py + ph, rgba(C.cyan, 0.55), 1.4);
      if (S.pipeP > 0) {
        const f = (S.pipeP * 2 + i * 0.33) % 1;
        ctx.fillStyle = rgba(C.cyan, 1);
        ctx.beginPath(); ctx.arc(x + 30, py + f * ph, 2.6, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }
  });
  // run / clear
  const by = y + 40 + steps.length * 46 + 6;
  const pressed = S.runPressed > 0 && S.runPressed < 1;
  fillRR(ctx, x + 12, by, 84, 36, 7, pressed ? '#2A63C0' : C.blue);
  txt(ctx, '运行', x + 54, by + 24, { size: 15, weight: 700, color: '#fff', align: 'center' });
  chip(ctx, x + 106, by, '清空', { bg: C.panel2, color: C.text2 });
  if (S.runRing) clickRing(ctx, x + 54, by + 18, S.runRing);
  // equivalent command line
  const cy = by + 48;
  fieldLabel(ctx, x + 14, cy, '等价命令行');
  fillRR(ctx, x + 12, cy + 10, w - 24, 66, 7, '#0A0E13');
  strokeRR(ctx, x + 12, cy + 10, w - 24, 66, 7, S.cmdGlow ? rgba(C.cyan, 0.8) : C.line, S.cmdGlow ? 1.8 : 1);
  chip(ctx, x + w - 76, cy + 26, S.copied > 0 ? '已复制' : '复制', { bg: S.copied > 0 ? rgba(C.green, 0.2) : C.panel2, color: S.copied > 0 ? C.green : C.text2, border: S.copied > 0 ? C.green : C.line });
  wrapCode(ctx, S.cmdText || CMDLINE, x + 24, cy + 32, w - 110, 13.5, S.cmdReveal == null ? 1 : S.cmdReveal, S.cmdHi);
  // results
  const ry = cy + 86;
  fieldLabel(ctx, x + 14, ry, '结果');
  chip(ctx, x + w - 116, ry - 16, '保存输出…', { bg: C.panel2, color: S.done ? C.text2 : C.dim, border: C.line });
  if (S.done) {
    const rows = steps.map((s, i) => i === 0 ? `${s.c} --align F:\\…\\demo.fasta` : `${s.c} ${s.f}`.trim());
    rows.forEach((b, i) => {
      const a = clamp((S.resReveal - i * 1.4) / 2.2); if (a <= 0) return;
      const yy = ry + 18 + i * 40;
      ctx.save(); ctx.globalAlpha = easeOutCubic(a);
      fillRR(ctx, x + 12, yy, w - 24, 34, 6, '#0D1A12');
      ctx.fillStyle = C.greenDim; ctx.fillRect(x + 12, yy, 3, 34);
      txt(ctx, b, x + 26, yy + 22, { size: 12.5, mono: true, color: '#7EE787' });
      ctx.restore();
    });
    // stats table — the terminal step of the chain above
    if (S.showStats !== false) {
      const ta = clamp((S.resReveal - 4.2) / 3.0);
      if (ta > 0) {
        const yy = ry + 18 + rows.length * 40 + 6;
        const bh = 214;
        ctx.save(); ctx.globalAlpha = easeOutCubic(ta);
        fillRR(ctx, x + 12, yy, w - 24, bh, 6, '#0A0E13'); strokeRR(ctx, x + 12, yy, w - 24, bh, 6, C.line, 1);
        STATS.forEach((r, i) => {
          const a2 = clamp((ta * STATS.length - i) / 1.2); if (a2 <= 0) return;
          const ly = yy + 26 + i * 18;
          txt(ctx, r[0], x + 28, ly, { size: 13, mono: true, color: i === 4 ? C.blue2 : C.text2, alpha: a2 });
          txt(ctx, r[1], x + 190, ly, { size: 13, mono: true, color: i === 4 ? C.blue2 : C.text, alpha: a2 });
          txt(ctx, r[2], x + 280, ly, { size: 13, mono: true, color: C.muted, alpha: a2 });
        });
        ctx.restore();
      }
    }
    // draw png writes a plain alignment heatmap — one site per pixel, one sequence per row
    if (S.showPng) {
      const pa = clamp(S.pngP == null ? 1 : S.pngP);
      if (pa > 0) {
        const yy = ry + 18 + rows.length * 40 + 8;
        const ph = 190;
        ctx.save(); ctx.globalAlpha = easeOutCubic(pa);
        fillRR(ctx, x + 12, yy, w - 24, ph, 6, '#FFFFFF');
        drawHeatmap(ctx, x + 12, yy, w - 24, ph, pa);
        txt(ctx, 'draw png · 内嵌显示', x + w - 24, yy + ph - 8, { size: 11, mono: true, color: C.dim, align: 'right' });
        ctx.restore();
      }
    }
  }
}
function wrapCode(ctx, str, x, y, maxW, size, reveal, hi) {
  const toks = str.split(/(\|)/);
  let cx = x, cy = y, n = 0;
  const total = str.length;
  ctx.save();
  for (const tk of toks) {
    if (!tk) continue;
    const w = measure(ctx, tk, { size, mono: true });
    if (cx + w > x + maxW && cx > x) { cx = x; cy += size * 1.6; }
    const shown = clamp((reveal * total - n) / Math.max(1, tk.length));
    if (shown > 0) {
      const isPipe = tk.trim() === '|';
      const hiOn = hi != null && hi > 0 && (n / total) < hi;
      txt(ctx, tk.slice(0, Math.round(tk.length * shown)), cx, cy, {
        size, mono: true, color: isPipe ? C.cyan : hiOn ? C.text : C.text2, weight: isPipe ? 700 : 400,
      });
    }
    cx += w; n += tk.length;
  }
  ctx.restore();
}
// goalign's `draw png` is a plain alignment heatmap: one sequence per row, one site per pixel
const SEQ = [
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGTTA',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGTTT',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTA---AGCCGTACGTTA',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGTTA',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGTTA',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGATC',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGATC',
  'ATGCGTTACGATTACGCTAGCTAAGCTTGCAGTCGATCAGGGCTATTAAGCCGTACGATC',
];
const BASE_COL = { A: '#2E7D32', C: '#1565C0', G: '#EF6C00', T: '#B71C1C', '-': '#CFD8DC' };
function drawHeatmap(ctx, x, y, w, h, p) {
  ctx.save();
  rr(ctx, x, y, w, h, 6); ctx.clip();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h);
  const labW = 118, padT = 14, padB = 22;
  const cw = (w - labW - 18) / 60;
  const rh = (h - padT - padB) / SEQ.length;
  for (let r = 0; r < SEQ.length; r++) {
    const yy = y + padT + r * rh;
    txt(ctx, TAXA[r].length > 14 ? TAXA[r].slice(0, 13) + '…' : TAXA[r], x + 8, yy + rh * 0.74, { size: 9.5, mono: true, color: '#37474F' });
    const cols = Math.round(60 * clamp((p - r * 0.04) / 0.5));
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = BASE_COL[SEQ[r][c]] || '#90A4AE';
      ctx.fillRect(x + labW + c * cw, yy + 1, Math.max(1, cw - 0.6), rh - 2.5);
    }
  }
  ctx.strokeStyle = '#B0BEC5'; ctx.lineWidth = 0.8;
  ctx.strokeRect(x + labW + 0.5, y + padT + 0.5, 60 * cw, SEQ.length * rh);
  txt(ctx, '60 sites × 8 sequences', x + labW, y + h - 7, { size: 9, mono: true, color: '#78909C', align: 'left' });
  ctx.restore();
}

export function drawApp(ctx, S) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 22;
  fillRR(ctx, 0, 0, AW, AH, 14, C.panel);
  ctx.restore();
  ctx.save();
  rr(ctx, 0, 0, AW, AH, 14); ctx.clip();
  ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, AW, AH);
  drawTitlebar(ctx, S);
  drawToolbar(ctx, S);
  drawCol1(ctx, S);
  drawCol2(ctx, S);
  drawCol3(ctx, S);
  ctx.restore();
  strokeRR(ctx, 0, 0, AW, AH, 14, 'rgba(255,255,255,0.09)', 1.4);
}
export { TREE, CMDLINE, TAXA, STEPS };
