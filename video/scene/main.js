// SeqPanel 60s promo — master timeline. window.SEEK(t) renders frame at t seconds.
import * as A from './anim.js';
import { drawApp, RECT, CMDLINE, STEPS } from './app-ui.js';

const { W, H, C, clamp, lerp, pr, rgba, rr, fillRR, strokeRR, txt, txtAnim, line, measure,
  easeOutCubic, easeOutQuint, easeInOutCubic, easeInCubic, smooth, springOvershoot,
  bgDeep, glowBlob, gridFloor, seqTexture, grain, vignette, sweep, caption, kicker,
  cursor, clickRing, fitTransform, setT, glowDot } = A;

const FPS = 30, DUR = 60;
const canvas = document.getElementById('stage');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d', { alpha: false });

const IMG = {};
function loadImg(src, key) {
  return new Promise(res => { const i = new Image(); i.onload = () => { IMG[key] = i; res(); }; i.onerror = () => res(); i.src = src; });
}
window.__ERR = [];

// ---------- shared bits ----------
function gradText(str, x, y, o) {
  const w = measure(ctx, str, o);
  const x0 = o.align === 'center' ? x - w / 2 : x;
  const g = ctx.createLinearGradient(x0, y - o.size, x0 + w, y + o.size * 0.4);
  (o.stops || [['#FFFFFF', 0], ['#9CC2FF', 1]]).forEach(([c, p]) => g.addColorStop(p, c));
  txt(ctx, str, x, y, { ...o, color: g });
  return w;
}
function termCard(x, y, w, h, title, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  glowBlob(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.72, C.blue, 0.16);
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 54; ctx.shadowOffsetY = 18;
  fillRR(ctx, x, y, w, h, 12, '#0C1219');
  ctx.shadowColor = 'transparent';
  fillRR(ctx, x, y, w, 42, 12, '#1A2431');
  ctx.fillStyle = '#0C1219'; ctx.fillRect(x, y + 28, w, 16);
  ['#F85149', '#D29922', '#3FB950'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 24 + i * 22, y + 21, 6.5, 0, 6.2832); ctx.fill(); });
  txt(ctx, title, x + w / 2, y + 26, { size: 14, mono: true, color: '#93A4B8', align: 'center' });
  strokeRR(ctx, x, y, w, h, 12, 'rgba(120,170,255,0.20)', 1.4);
  ctx.restore();
}
function brandMark(alpha = 1) {
  ctx.save(); ctx.globalAlpha = 0.85 * alpha;
  ctx.translate(W - 168, H - 46);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = rgba(i % 2 ? C.cyan : C.blue, 0.9);
    ctx.fillRect(i * 9, -6 + Math.sin(i * 1.1) * 5, 4, 12);
  }
  txt(ctx, 'SeqPanel', 62, 5, { size: 14, weight: 700, color: C.text2, ls: 1.2 });
  ctx.restore();
}
function painCard(x, y, w, h, p, title, code, desc, accent) {
  const e = easeOutQuint(clamp(p / 0.5));
  const out = 1 - easeInCubic(clamp((p - 0.72) / 0.28));
  const a = Math.min(e, out);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(lerp(70, 0, e) + lerp(0, -60, 1 - out), 0);
  ctx.transform(1, 0, lerp(-0.12, 0, e), 1, 0, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  fillRR(ctx, x, y, w, h, 16, rgba(C.panel, 0.96));
  ctx.shadowColor = 'transparent';
  strokeRR(ctx, x, y, w, h, 16, 'rgba(255,255,255,0.08)', 1.2);
  fillRR(ctx, x, y, 6, h, 3, accent);
  txt(ctx, title, x + 56, y + 78, { size: 40, weight: 700, color: C.text });
  fillRR(ctx, x + 56, y + 112, w - 112, 84, 10, '#0A0E13');
  strokeRR(ctx, x + 56, y + 112, w - 112, 84, 10, rgba(accent, 0.35), 1.2);
  txt(ctx, code, x + 82, y + 164, { size: 27, mono: true, color: accent });
  // a slow scan across the code line keeps the card from locking off during its hold
  const sx = x + 56 + ((p * 1.35) % 1) * (w - 112);
  const g2 = ctx.createLinearGradient(sx - 110, 0, sx + 110, 0);
  g2.addColorStop(0, rgba(accent, 0)); g2.addColorStop(0.5, rgba(accent, 0.18)); g2.addColorStop(1, rgba(accent, 0));
  ctx.save(); rr(ctx, x + 56, y + 112, w - 112, 84, 10); ctx.clip();
  ctx.fillStyle = g2; ctx.fillRect(x + 56, y + 112, w - 112, 84); ctx.restore();
  txt(ctx, desc, x + 56, y + 246, { size: 25, color: C.muted });
  ctx.restore();
}
function pipeOverlay(S, p, t) {
  // animated stdout -> stdin connectors drawn in mock space over the workflow column
  const [x, y] = RECT.col3;
  const n = (S.steps || STEPS).length;
  for (let i = 0; i < n - 1; i++) {
    const sy = y + 40 + i * 46 + 38;
    const a = clamp((p - i * 0.12) / 0.3);
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a;
    const cx = x - 46;
    ctx.strokeStyle = rgba(C.cyan, 0.85); ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + 12, sy - 8); ctx.lineTo(cx, sy - 8); ctx.lineTo(cx, sy + 22); ctx.lineTo(x + 12, sy + 22);
    ctx.stroke();
    // flowing dots
    for (let k = 0; k < 4; k++) {
      const f = ((t * 1.1 + k / 4 + i * 0.2) % 1);
      glowDot(ctx, lerp(x + 12, cx, f), sy - 8, 7, C.cyan, 0.9);
      glowDot(ctx, lerp(cx, x + 12, f), sy + 22, 7, C.cyan, 0.9);
    }
    ctx.restore();
  }
}

// ---------- S1 hook: terminal pain ----------
const CMD_A = 'goalign clean sites --align demo.fasta --cutoff 0 | goalign stats --phylip';
const CMD_B = 'goalign stats --phylip "demo alignment.fasta"';
// the panel's own line omits the program name; a terminal needs it on every step
const TERM_CMD = `goalign clean seqs --align 'F:\\ZengZichao\\下载\\SeqPanel\\samples\\demo.fasta' | goalign clean sites --char GAP --cutoff 0 | goalign stats`;
// each row appears at `at`; rows with `dur` type out character by character
const ROWS = [
  { pre: 'PS F:\\work\\demo> ', t: 'goalign clean seqs --input demo.fasta', color: '#667489', at: 0.30 },
  { t: 'Error: unknown flag: --input', color: '#B3413B', at: 0.30 },
  { pre: 'PS F:\\work\\demo> ', t: CMD_A, at: 0.80, dur: 1.75 },
  { t: '[Error] in cmd/clean.go (line 87), message: fasta file should start with a >', color: C.red, at: 2.75 },
  { pre: 'PS F:\\work\\demo> ', t: CMD_B, at: 3.15, dur: 1.15 },
  { t: 'open demo alignment.fasta: The system cannot find the file specified.', color: C.red, at: 4.40 },
];
function termRows(x, y, lh, size, t) {
  ROWS.forEach((L, i) => {
    if (t < L.at) return;
    const frac = L.dur ? clamp((t - L.at) / L.dur) : 1;
    const yy = y + i * lh;
    const preW = L.pre ? measure(ctx, L.pre, { size, mono: true }) : 0;
    if (L.pre) txt(ctx, L.pre, x, yy, { size, mono: true, color: C.green });
    const shown = Math.round(L.t.length * frac);
    txt(ctx, L.t.slice(0, shown), x + preW, yy, { size, mono: true, color: L.color || C.text2 });
    if (frac > 0 && frac < 1) {
      const cw = measure(ctx, L.t.slice(0, shown), { size, mono: true });
      line(ctx, x + preW + cw + 3, yy - size * 0.86, x + preW + cw + 3, yy + 3, C.text, 2);
    }
  });
}
function S1(t) {
  const p = pr(t, 0, 6);
  bgDeep(ctx, t, 0.1);
  seqTexture(ctx, t, 0.42, [0, 0, W, H]);
  gridFloor(ctx, t, 0.06);
  const cx = 150, cy = 268, cw = 1220, ch = 404;
  const inP = easeOutQuint(clamp(t / 0.7));
  ctx.save(); ctx.translate(cx + cw / 2, cy + ch / 2);
  ctx.scale(lerp(0.94, 1, inP), lerp(0.94, 1, inP));
  ctx.translate(-(cx + cw / 2), -(cy + ch / 2));
  termCard(cx, cy, cw, ch, 'Windows PowerShell — goalign', inP);
  termRows(cx + 34, cy + 88, 50, 20, t);
  if (t > 2.7 && t < 3.4) {
    ctx.save(); ctx.globalAlpha = (1 - clamp((t - 2.7) / 0.7)) * 0.9;
    fillRR(ctx, cx + 26, cy + 182, cw - 52, 38, 6, rgba(C.red, 0.14)); ctx.restore();
  }
  if (t > 4.35 && t < 5.05) {
    ctx.save(); ctx.globalAlpha = (1 - clamp((t - 4.35) / 0.7)) * 0.9;
    fillRR(ctx, cx + 26, cy + 332, cw - 52, 38, 6, rgba(C.red, 0.14)); ctx.restore();
  }
  ctx.restore();
  // counters
  const kp = clamp((t - 3.6) / 1.9);
  const kx = 1436;
  ctx.save(); ctx.globalAlpha = easeOutCubic(kp);
  ctx.translate((1 - easeOutCubic(kp)) * 40, 0);
  txt(ctx, Math.round(76 * easeOutQuint(kp)), kx, 340, { size: 132, weight: 700, color: C.text });
  txt(ctx, '个可执行命令', kx, 386, { size: 26, color: C.muted });
  txt(ctx, Math.round(42 * easeOutQuint(kp)), kx, 520, { size: 132, weight: 700, color: C.blue2 });
  txt(ctx, '个顶层命令组', kx, 566, { size: 26, color: C.muted });
  txt(ctx, '每一条都要记住拼写、格式和顺序', kx, 640, { size: 24, color: C.dim, alpha: pr(t, 4.6, 5.4) });
  ctx.restore();
  caption(ctx, t < 3.0 ? '进化生物学的命令行工具，很强。' : '但手工驱动它，很累。',
    t < 3.0 ? 'Powerful tools, built for the command line.' : 'Driving them by hand is the hard part.',
    t < 3.0 ? pr(t, 0.3, 2.9) : pr(t, 3.1, 5.9));
  sweep(ctx, pr(t, 5.5, 6.4));
}

// ---------- S2 pain montage ----------
function S2(t) {
  bgDeep(ctx, t, 0.15);
  seqTexture(ctx, t, 0.22, [0, 0, W, H]);
  const cards = [
    { ttl: '输入开关，不叫 --input', code: '--align      而不是      --input', desc: 'GoAlign 里多数命令的输入开关都叫 --align', a: C.amber },
    { ttl: '格式必须真正对上', code: '--phylip / --nexus / --clustal / --stockholm', desc: '选错格式，工具不会猜，它直接报错', a: C.violet },
    { ttl: '谁传递比对，谁消费比对', code: 'clean seqs | stats | draw png      ✗', desc: '统计表是终止步，再接命令等于把表格喂给等 FASTA 的程序', a: C.red },
  ];
  cards.forEach((c, i) => {
    const s = 6.1 + i * 1.62;
    const p = clamp((t - s) / 1.9);
    if (p > 0 && p < 1) painCard(300, 300, 1320, 300, p, c.ttl, c.code, c.desc, c.a);
  });
  kicker(ctx, 'THE PROBLEM', W / 2, 176, pr(t, 6.2, 7.4), C.amber);
  caption(ctx, '76 个命令，42 个命令组，每一条都要背。', 'Quotes, spellings, formats, order — all manual.', pr(t, 6.2, 10.8), { y: H - 108 });
}

// ---------- S3 reveal ----------
function S3(t) {
  bgDeep(ctx, t, 0.62);
  gridFloor(ctx, t, 0.09, C.cyan);
  seqTexture(ctx, t, 0.55, [0, 0, W, H]);
  // light line sweeps in while the last pain card is still leaving
  const lp = pr(t, 10.55, 11.75);
  if (lp > 0) {
    const w = easeOutQuint(lp) * W * 1.05;
    const fade = 1 - easeInCubic(pr(t, 12.1, 13.2));
    ctx.save(); ctx.globalAlpha = fade;
    const g = ctx.createLinearGradient(W / 2 - w / 2, 0, W / 2 + w / 2, 0);
    g.addColorStop(0, rgba(C.blue, 0)); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, rgba(C.cyan, 0));
    ctx.fillStyle = g; ctx.fillRect(W / 2 - w / 2, H / 2 - 2 - 6 * (1 - lp), w, 4 + 12 * (1 - lp));
    const hg = ctx.createLinearGradient(0, H / 2 - 150, 0, H / 2 + 150);
    hg.addColorStop(0, rgba(C.blue, 0)); hg.addColorStop(0.5, rgba(C.blue, 0.20)); hg.addColorStop(1, rgba(C.blue, 0));
    ctx.fillStyle = hg; ctx.fillRect(W / 2 - w / 2, H / 2 - 150, w, 300);
    ctx.restore();
    glowDot(ctx, W / 2, H / 2, 300 * lp, C.blue, 0.45 * (1 - lp));
    // sparks riding the line
    ctx.save(); ctx.globalAlpha = fade * clamp(lp * 2);
    for (let i = 0; i < 26; i++) {
      const q = A.rnd(i * 3 + 11)();
      const fx = W / 2 + (q - 0.5) * w * 0.9;
      const fy = H / 2 - (0.6 + q) * 46 * easeOutCubic(pr(t, 11.2, 12.9));
      glowDot(ctx, fx, fy, 9 + q * 12, q > 0.5 ? C.cyan : C.blue2, 0.5 * (1 - pr(t, 11.4, 13.0)));
    }
    ctx.restore();
  }
  const wp = pr(t, 11.35, 13.5);
  if (wp > 0) {
    const name = 'SeqPanel';
    let cx0 = W / 2 - measure(ctx, name, { size: 156, weight: 700, ls: -4 }) / 2;
    for (let i = 0; i < name.length; i++) {
      const st = i * 0.055;
      const u = clamp((wp - st) / 0.5);
      if (u <= 0) continue;
      const e = springOvershoot(u);
      const ch = name[i];
      const cw = measure(ctx, ch, { size: 156, weight: 700 });
      ctx.save();
      ctx.translate(cx0 + cw / 2, H / 2 + 40);
      ctx.scale(lerp(0.6, 1, e), lerp(1.5, 1, e));
      ctx.globalAlpha = clamp(u * 2.2);
      gradText(ch, 0, 0, { size: 156, weight: 700, align: 'center', stops: [['#FFFFFF', 0], ['#BFD9FF', 0.45], ['#4EA8DE', 1]] });
      ctx.restore();
      cx0 += cw - 2;
    }
    const sp = pr(t, 12.7, 14.0);
    ctx.save(); ctx.globalAlpha = easeOutCubic(sp);
    const lw = 520 * easeOutQuint(sp);
    line(ctx, W / 2 - lw / 2, H / 2 + 92, W / 2 + lw / 2, H / 2 + 92, rgba(C.cyan, 0.7), 2);
    ctx.restore();
    kicker(ctx, 'INTRODUCING', W / 2, H / 2 - 130, pr(t, 11.8, 12.8), C.cyan);
    caption(ctx, '面向 cobra 命令行工具的 Windows 图形操作面板', 'A GUI panel for cobra-based bioinformatics CLIs',
      pr(t, 13.0, 15.2), { y: H / 2 + 178, size: 34, bar: false, subSize: 20 });
  }
  sweep(ctx, pr(t, 15.2, 16.4));
}

// ---------- S4/S5/S6 app demo, shared camera ----------
function appState(t) {
  const S = {
    status: { text: 'GoAlign  ·  v0.4.1  ·  76 个可执行命令 / 42 个顶层命令组  ·  命令表来自缓存', tone: 'idle' },
    treeReveal: 0, treeScroll: 0, search: '', filterQ: '', activeCmd: null,
    formReveal: 0, genericReveal: 0, genericOpen: 0, formCmd: 'clean sites',
    wfReveal: 0, wfSel: null, pipeP: 0, runPressed: -1, runRing: 0, done: false,
    resReveal: 0, cmdReveal: 0, cmdHi: 0, copied: 0, presetHi: -1, langFade: 1,
  };
  let cam = { scale: 0.8, tx: 0, ty: 0 }, camA = 0;
  let extra = {};
  if (t < 27) {
    // S4 — reflection
    const enter = pr(t, 16.0, 17.6);
    const refl = clamp((t - 16.9) / 3.9);
    S.treeReveal = refl * 19.5;                       // last row lands at ~20.8 s
    S.status = refl < 1
      ? { text: `反射中 · 正在解析 goalign --help · ${Math.round(refl * 76)}/76 个可执行命令`, tone: 'idle' }
      : { text: 'GoAlign  ·  v0.4.1  ·  76 个可执行命令 / 42 个顶层命令组  ·  命令表来自缓存', tone: 'idle' };
    if (t > 20.6) S.treeScroll = clamp((t - 20.6) / 1.0) * 40;
    const q = 'clean';
    if (t > 20.8) S.search = q.slice(0, Math.round(clamp((t - 20.8) / 0.7) * q.length));
    if (t > 21.6) S.filterQ = q;
    S.caret = t > 20.8 && t < 22.2 && Math.floor((t - 20.8) * 3) % 2 === 0;
    if (t > 22.1) S.activeCmd = 'clean sites';
    S.formReveal = clamp((t - 22.3) / 1.2) * 12;
    S.genericReveal = pr(t, 23.5, 24.1);
    S.genericOpen = clamp(pr(t, 24.2, 24.8) - pr(t, 25.5, 26.0));
    // clicking a command appends it to the workflow, so the right column is never dead space
    S.steps = [STEPS[1]];
    S.cmdText = `clean sites --align 'F:\\ZengZichao\\下载\\SeqPanel\\samples\\demo.fasta' --char GAP --cutoff 0`;
    S.wfReveal = clamp((t - 22.35) / 0.4) * 2;
    S.wfSel = 0;
    S.cmdReveal = clamp((t - 22.7) / 0.9);
    const tf = fitTransform(RECT.win, [150, 96, 1620, 888]);
    const k = lerp(0.86, 1, easeOutQuint(enter));
    cam = { scale: tf.scale * k, tx: tf.tx * k + (W - W * k) / 2, ty: tf.ty * k + (H - H * k) / 2 + (1 - easeOutCubic(enter)) * 60 };
    camA = easeOutCubic(pr(t, 16.0, 16.9));
    extra.cursor = t > 21.5 && t < 22.9
      ? { x: lerp(1200, 200, easeInOutCubic(pr(t, 21.5, 22.1))), y: lerp(700, 452, easeInOutCubic(pr(t, 21.5, 22.1))) }
      : null;
  } else if (t < 38) {
    // S5 — pipeline
    const zoom = easeInOutCubic(pr(t, 27.0, 28.2));
    const tfFull = fitTransform(RECT.win, [150, 96, 1620, 888]);
    const tfCol = fitTransform([900, 186, 660, 700], [330, 90, 1260, 900]);
    S.treeReveal = 999; S.filterQ = 'clean'; S.search = 'clean'; S.activeCmd = 'clean sites';
    S.formReveal = 99; S.genericReveal = 1;
    S.steps = STEPS; S.cmdText = CMDLINE;
    S.presetHi = (t > 27.2 && t < 28.6) ? 0 : -1;   // a preset replaces the whole chain
    S.wfReveal = clamp((t - 28.3) / 1.9) * 10;
    S.wfSel = t > 28.4 ? 2 : null;
    S.pipeP = t > 30.2 ? (t - 30.2) : 0;
    S.cmdReveal = pr(t, 30.4, 31.8);
    if (t > 31.9 && t < 32.6) { S.runPressed = pr(t, 31.9, 32.2); S.runRing = pr(t, 32.0, 32.6); }
    if (t > 32.2) { S.status = { text: '运行中 · 3 步 · 正在启动子进程…', tone: 'idle' }; }
    if (t > 33.1) { S.done = true; S.status = { text: '完成 · 3 步 · 86 ms', tone: 'ok' }; S.resReveal = clamp((t - 33.2) / 2.2) * 11; }
    // second beat: stats is a terminal step, so the plot comes from its own one-step chain
    if (t > 35.6) {
      S.presetHi = 2;                                  // 比对热图
      S.steps = [{ c: 'draw png', f: '' }];
      S.cmdText = `draw png --align 'F:\\ZengZichao\\下载\\SeqPanel\\samples\\demo.fasta'`;
      S.wfReveal = 2; S.wfSel = 0; S.pipeP = 0; S.cmdReveal = 1;
      S.showStats = false; S.showPng = true;
      S.pngP = clamp((t - 36.5) / 1.1);
      S.resReveal = clamp((t - 36.2) / 0.7) * 3;
      S.status = t > 36.4 ? { text: '完成 · 1 步 · 12 ms', tone: 'ok' } : { text: '运行中 · 1 步…', tone: 'idle' };
      if (t > 36.0 && t < 36.5) { S.runPressed = pr(t, 36.0, 36.2); S.runRing = pr(t, 36.05, 36.5); }
    }
    cam = {
      scale: lerp(tfFull.scale, tfCol.scale, zoom),
      tx: lerp(tfFull.tx, tfCol.tx, zoom), ty: lerp(tfFull.ty, tfCol.ty, zoom),
    };
    camA = 1;
    extra.cursor = t > 31.3 && t < 32.5 ? { x: lerp(1500, 995, easeInOutCubic(pr(t, 31.3, 31.9))), y: lerp(700, 400, easeInOutCubic(pr(t, 31.3, 31.9))) } : null;
    extra.pipe = { p: pr(t, 30.0, 31.0), t };
  } else {
    // S6 — equivalence
    const zoom = easeInOutCubic(pr(t, 38.0, 39.2));
    const tfCol = fitTransform([900, 186, 660, 700], [330, 90, 1260, 900]);
    const tfCmd = fitTransform([940, 440, 604, 96], [200, 150, 1520, 300]);
    S.treeReveal = 999; S.filterQ = 'clean'; S.search = 'clean'; S.activeCmd = 'clean sites';
    S.formReveal = 99; S.genericReveal = 1; S.wfReveal = 99; S.done = true; S.resReveal = 99;
    S.cmdReveal = 1; S.cmdGlow = 1;
    S.cmdHi = pr(t, 39.4, 41.0);
    if (t > 41.2) { S.copied = 1; S.status = { text: '已复制到剪贴板 · 3 步命令行', tone: 'ok' }; }
    cam = { scale: lerp(tfCol.scale, tfCmd.scale, zoom), tx: lerp(tfCol.tx, tfCmd.tx, zoom), ty: lerp(tfCol.ty, tfCmd.ty, zoom) };
    camA = 1;
    extra.cursor = t > 40.6 && t < 41.6 ? { x: lerp(1600, 1490, easeInOutCubic(pr(t, 40.6, 41.2))), y: lerp(400, 470, easeInOutCubic(pr(t, 40.6, 41.2))) } : null;
  }
  return { S, cam, camA, extra };
}
function drawAppScene(t) {
  bgDeep(ctx, t, 0.34);
  seqTexture(ctx, t, 0.18, [0, 0, W, H]);
  const { S, cam, camA, extra } = appState(t);
  // continuous hand-held drift: keeps the demo alive instead of landing on locked-off frames
  const u = t - 16;
  const k = 1 + 0.0075 * Math.sin(u * 0.85);
  cam.tx = W / 2 - (W / 2 - cam.tx) * k + 7 * Math.sin(u * 0.5);
  cam.ty = H / 2 - (H / 2 - cam.ty) * k + 5 * Math.cos(u * 0.38);
  cam.scale *= k;
  ctx.save();
  ctx.translate(cam.tx, cam.ty); ctx.scale(cam.scale, cam.scale);
  ctx.globalAlpha = camA;
  drawApp(ctx, S);
  if (extra.pipe) pipeOverlay(S, extra.pipe.p, extra.pipe.t);
  ctx.restore();
  if (extra.cursor) {
    const cs = cam.scale;
    cursor(ctx, cam.tx + extra.cursor.x * cs, cam.ty + extra.cursor.y * cs, 1.5, camA);
    if (t > 22.0 && t < 22.5) clickRing(ctx, cam.tx + extra.cursor.x * cs, cam.ty + extra.cursor.y * cs, pr(t, 22.05, 22.5));
    if (t > 31.95 && t < 32.5) clickRing(ctx, cam.tx + extra.cursor.x * cs, cam.ty + extra.cursor.y * cs, pr(t, 32.0, 32.5));
  }
  // push-ins crop neighbouring columns; a focus vignette keeps that bleed from reading as broken text
  const dz = clamp((cam.scale - 1.05) / 0.22);
  if (dz > 0.01) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.30, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(6,9,13,0)');
    g.addColorStop(1, `rgba(6,9,13,${(0.78 * dz).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  brandMark(clamp(pr(t, 17.5, 18.5)));
  if (t < 27) {
    if (t < 21.0) caption(ctx, '整棵命令树，从 --help 反射出来', 'Every flag, type and default — reflected, not hardcoded', pr(t, 17.0, 20.7));
    else if (t < 24.8) caption(ctx, '每条命令，一张带类型校验的表单', 'One command, one typed form', pr(t, 21.0, 24.6));
    else caption(ctx, '上游升级，面板不用改代码', 'Upstream updates need no UI changes', pr(t, 24.8, 26.9));
  } else if (t < 38) {
    if (t < 31.6) caption(ctx, '第 n 步的 stdout，直接喂给第 n+1 步', 'Real OS pipes between steps', pr(t, 27.6, 31.4));
    else if (t < 33.4) caption(ctx, '中间结果从不落到磁盘', 'Nothing written to disk in between', pr(t, 31.6, 33.2));
    else if (t < 35.5) caption(ctx, '统计表，直接内嵌显示', 'Statistics rendered inline', pr(t, 33.6, 35.3));
    else caption(ctx, 'PNG 绘图，同样直接内嵌显示', 'draw png renders inline too', pr(t, 35.8, 37.9));
  } else {
    if (t < 41.4) {
      caption(ctx, '等价命令行，始终可见', 'The exact command line, always on screen', pr(t, 38.4, 41.2));
      txt(ctx, '只是复述默认值的开关，在启动前就被丢掉', 1600, 620, { size: 26, color: C.muted, align: 'right', alpha: pr(t, 39.6, 40.6) });
      txt(ctx, '所以命令行足够短，结果和手敲一致', 1600, 660, { size: 26, color: C.muted, align: 'right', alpha: pr(t, 40.2, 41.2) });
    } else {
      // wipe to terminal proof
      const wp = pr(t, 41.4, 46.0);
      ctx.save(); ctx.globalAlpha = clamp(wp / 0.25);
      bgDeep(ctx, t, 0.16);
      const cx = 200, cy = 268, cw = 1560, ch = 500;
      const zs = 1 + 0.012 * (t - 41.4);
      ctx.translate(cx + cw / 2, cy + ch / 2); ctx.scale(zs, zs); ctx.translate(-(cx + cw / 2), -(cy + ch / 2));
      termCard(cx, cy, cw, ch, 'Windows PowerShell — 粘贴自 SeqPanel', 1);
      // the panel shows bare arguments; running it needs the program name in front of each step
      const pasted = t > 41.75;
      if (pasted) {
        const flash = 1 - clamp((t - 41.75) / 0.45);
        if (flash > 0) {
          ctx.save(); ctx.globalAlpha = flash * 0.5;
          fillRR(ctx, cx + 26, cy + 58, cw - 52, 40, 6, rgba(C.cyan, 0.3)); ctx.restore();
        }
        txt(ctx, 'PS F:\\work\\demo> ', cx + 34, cy + 88, { size: 16, mono: true, color: C.green });
        const pw = measure(ctx, 'PS F:\\work\\demo> ', { size: 16, mono: true });
        txt(ctx, TERM_CMD, cx + 34 + pw, cy + 88, { size: 16, mono: true, color: C.text });
        if (t > 42.1 && t < 42.5) txt(ctx, '⏎', cx + 34 + pw + measure(ctx, TERM_CMD, { size: 16, mono: true }) + 8, cy + 88, { size: 16, mono: true, color: C.cyan });
      }
      const out = [
        ['length', '60', ''], ['nseqs', '7', ''], ['avgalleles', '1.0500', ''], ['variable sites', '2', ''],
        ['char', 'nb', 'freq'], ['A', '104', '0.247619'], ['C', '94', '0.223810'],
        ['G', '105', '0.250000'], ['T', '117', '0.278571'], ['alphabet', 'nucleotide', ''],
      ];
      out.forEach((r, i) => {
        const at = 42.5 + i * 0.11;
        const a = clamp((t - at) / 0.2);
        if (a <= 0) return;
        const yy = cy + 136 + i * 26;
        const col = i === 4 ? C.blue2 : C.text2;
        txt(ctx, r[0], cx + 34, yy, { size: 17, mono: true, color: col, alpha: a });
        txt(ctx, r[1], cx + 300, yy, { size: 17, mono: true, color: col, alpha: a });
        txt(ctx, r[2], cx + 470, yy, { size: 17, mono: true, color: i === 4 ? C.blue2 : C.muted, alpha: a });
      });
      const okp = pr(t, 43.9, 44.8);
      // a live prompt after the output keeps the shot from locking off
      if (t > 44.5) {
        const py = cy + 136 + out.length * 26 + 10;
        txt(ctx, 'PS F:\\work\\demo> ', cx + 34, py, { size: 16, mono: true, color: C.green });
        if (Math.floor((t - 44.5) * 2.4) % 2 === 0) {
          ctx.fillStyle = C.text;
          ctx.fillRect(cx + 36 + measure(ctx, 'PS F:\\work\\demo> ', { size: 16, mono: true }), py - 13, 9, 16);
        }
      }
      if (okp > 0) {
        ctx.save(); ctx.globalAlpha = easeOutCubic(okp);
        fillRR(ctx, cx + 34, cy + ch - 66, 560, 44, 10, rgba(C.green, 0.14));
        strokeRR(ctx, cx + 34, cy + ch - 66, 560, 44, 10, rgba(C.green, 0.5), 1.4);
        txt(ctx, '✓  与面板结果逐字一致 · 86 ms', cx + 58, cy + ch - 36, { size: 23, weight: 700, color: C.green });
        ctx.restore();
      }
      txt(ctx, '面板里省略的是程序名：终端里每步前缀 goalign', cx + cw - 34, cy + ch - 36,
        { size: 20, color: C.muted, align: 'right', alpha: pr(t, 44.3, 45.1) });
      ctx.restore();
      caption(ctx, '用界面搭的每一步，都能复制进终端原样跑', 'Everything you build here runs verbatim in a terminal', pr(t, 41.8, 45.8));
    }
  }
}

// ---------- S7 feature montage ----------
// ---- feature card content, laid out on a shared grid ----
const F_TTL = ['下载就是一个 .exe', '中文 ⇄ English', '浅色 · 深色 · 跟随系统', '指向任意 cobra 二进制'];
const F_CAP = ['免安装 · 下载即用', '中文 · English 运行时切换', '浅色 · 深色 · 跟随系统', '一个面板，驱动任意 cobra 工具'];
const F_KICK = ['NO INSTALL RITUAL', 'BILINGUAL', 'THREE THEMES', 'GENERIC REFLECTION'];
const F_ACC = [C.blue, C.cyan, C.violet, C.green];
const F_BUL = [
  [['单文件自包含', '没有安装程序，下载即可运行'],
   ['首次启动自动解出', '内置 GoAlign v0.4.1，解到用户目录'],
   ['零运行库依赖', '不需要 Python / .NET / Go / Node.js']],
  [['运行时即时切换', '整个界面在中英文之间互换'],
   ['选择会被记住', '重启后仍是上次的语言'],
   ['命令名保持英文', '它们来自上游工具自己的 --help']],
  [['浅色 / 深色', '两套完整配色，逐控件重绘'],
   ['跟随系统', '系统设置改动时面板实时响应'],
   ['原生标题栏一起变', '不只是网页区域换色']],
  [['反射引擎是通用的', '命令、开关、类型、默认值照常出现'],
   ['工具包补齐缺口', '预设工作流 + 位置参数标注'],
   ['换一个二进制', '指向 GoTree 就变成 GoTree 的面板']],
];
const F_FOOT = ['76 个可执行命令 · 42 个顶层命令组 · 开箱可用',
  '界面文案双语 · 上游说明原文保留',
  '真实界面截图 · 三套主题随时切换',
  'GoAlign · GoTree · 任意 cobra 二进制'];

// left-hand visual for one card, drawn inside [lx, ly, lw, lh]
function featureVisual(i, lx, ly, lw, lh, body, t) {
  if (i === 0) {
    fillRR(ctx, lx, ly, lw, lh, 14, '#0A0E13');
    strokeRR(ctx, lx, ly, lw, lh, 14, rgba(C.blue, 0.34), 1.4);
    fillRR(ctx, lx + 30, ly + 30, 88, 108, 10, rgba(C.blue, 0.9));
    txt(ctx, 'exe', lx + 74, ly + 92, { size: 24, weight: 700, mono: true, color: '#fff', align: 'center' });
    txt(ctx, 'SeqPanel-…-win-x64.exe', lx + 142, ly + 68, { size: 23, mono: true, color: C.text });
    txt(ctx, '单文件 · 自包含 · 无安装程序', lx + 142, ly + 104, { size: 20, color: C.muted });
    const p = clamp((body - 0.15) / 0.6);
    line(ctx, lx + 30, ly + 172, lx + lw - 30, ly + 172, C.line, 1);
    fillRR(ctx, lx + 30, ly + 168, Math.max(4, (lw - 60) * easeOutCubic(p)), 8, 4, C.blue);
    txt(ctx, '首次启动 · 解出内置 GoAlign v0.4.1', lx + 30, ly + 208, { size: 18, color: C.dim });
    const chips = ['Windows 10 / 11', 'WebView2 即可', 'Apache-2.0'];
    let cx = lx + 30;
    chips.forEach((s, k) => {
      const a = clamp((body - 0.3 - k * 0.12) / 0.25);
      const w = measure(ctx, s, { size: 17 }) + 30;
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        fillRR(ctx, cx, ly + 236, w, 36, 18, rgba(C.blue, 0.12));
        strokeRR(ctx, cx, ly + 236, w, 36, 18, rgba(C.blue, 0.34), 1);
        txt(ctx, s, cx + w / 2, ly + 260, { size: 17, color: C.blue2, align: 'center' });
        ctx.restore();
      }
      cx += w + 12;
    });
  } else if (i === 1) {
    const rows = [['命令表', 'Commands'], ['输入', 'Input'], ['工作流', 'Workflow'],
      ['等价命令行', 'Command line'], ['结果', 'Results'], ['运行', 'Run']];
    fillRR(ctx, lx, ly, lw, lh, 14, '#0A0E13');
    strokeRR(ctx, lx, ly, lw, lh, 14, rgba(C.cyan, 0.3), 1.4);
    ctx.save();
    rr(ctx, lx, ly, lw, lh, 14); ctx.clip();
    txt(ctx, '界面文案', lx + 28, ly + 36, { size: 15, weight: 700, color: C.dim, ls: 2.2 });
    txt(ctx, 'UI LABELS', lx + lw - 28, ly + 36, { size: 15, weight: 700, color: C.dim, ls: 2.2, align: 'right' });
    line(ctx, lx + 28, ly + 50, lx + lw - 28, ly + 50, C.line, 1);
    const sw = body > 0.55;
    const rh = (lh - 96) / rows.length;
    rows.forEach((r, k) => {
      const a = clamp((body - k * 0.07) / 0.3);
      if (a <= 0) return;
      const yy = ly + 84 + k * rh;
      ctx.save(); ctx.globalAlpha = a;
      if (k % 2 === 0) fillRR(ctx, lx + 16, yy - 25, lw - 32, rh - 3, 8, '#101820');
      txt(ctx, sw ? r[0] : r[1], lx + 32, yy, { size: 21, weight: 600, color: C.text });
      txt(ctx, sw ? r[1] : r[0], lx + lw - 32, yy, { size: 19, mono: !sw, color: C.muted, align: 'right' });
      ctx.restore();
    });
    ctx.restore();
  } else if (i === 2) {
    const imgs = [IMG.light, IMG.dark];
    const names = ['浅色', '深色'];
    const cols = ['#D29922', '#8B5CF6'];
    const tw = (lw - 36) / 2;
    imgs.forEach((im, k) => {
      const slide = easeOutQuint(clamp((body - k * 0.16) / 0.45));
      if (slide <= 0) return;
      const tx = lx + k * (tw + 36), ty = ly;
      const th = Math.min(lh, tw * (im ? im.height / im.width : 0.65));
      ctx.save(); ctx.globalAlpha = slide;
      ctx.translate((1 - slide) * 70, 0);
      if (im) {
        ctx.save(); rr(ctx, tx, ty, tw, th, 10); ctx.clip();
        ctx.drawImage(im, tx, ty, tw, th); ctx.restore();
        strokeRR(ctx, tx, ty, tw, th, 10, 'rgba(255,255,255,0.13)', 1.3);
      } else { fillRR(ctx, tx, ty, tw, th, 10, C.panel); }
      fillRR(ctx, tx + 14, ty + 14, 66, 30, 15, rgba(cols[k], 0.18));
      strokeRR(ctx, tx + 14, ty + 14, 66, 30, 15, rgba(cols[k], 0.5), 1);
      txt(ctx, names[k], tx + 47, ty + 35, { size: 16, weight: 700, color: cols[k], align: 'center' });
      ctx.restore();
    });
  } else {
    const morph = clamp((body - 0.12) / 0.5);
    fillRR(ctx, lx, ly, lw, lh, 14, '#0A0E13');
    strokeRR(ctx, lx, ly, lw, lh, 14, rgba(C.green, 0.3), 1.4);
    const pw = (lw - 120) / 2;
    const cards = [['goalign.exe', 'GoAlign 面板', C.blue, '76 命令 · 42 命令组'],
      ['gotree.exe', 'GoTree 面板', C.green, '同一套反射路径']];
    cards.forEach((cd, k) => {
      const px = lx + 30 + k * (pw + 60);
      const on = morph > 0.5 ? k === 1 : k === 0;
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.45;
      fillRR(ctx, px, ly + 34, pw, 186, 12, on ? rgba(cd[2], 0.13) : '#101820');
      strokeRR(ctx, px, ly + 34, pw, 186, 12, on ? rgba(cd[2], 0.55) : C.line, on ? 1.8 : 1);
      txt(ctx, cd[0], px + 22, ly + 80, { size: 22, mono: true, weight: 700, color: on ? cd[2] : C.muted });
      txt(ctx, cd[1], px + 22, ly + 122, { size: 22, color: C.text2 });
      txt(ctx, cd[3], px + 22, ly + 160, { size: 16, color: C.dim });
      ctx.restore();
    });
    txt(ctx, '→', lx + 30 + pw + 14, ly + 140, { size: 36, weight: 700, color: rgba(C.green, clamp(morph * 2)) });
    txt(ctx, '换一个二进制，面板就变成那个工具的面板', lx + 30, ly + 264, { size: 19, color: C.muted });
  }
}
function featureCard(x, y, w, h, accent) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  fillRR(ctx, x, y, w, h, 20, rgba('#141B25', 0.97));
  ctx.shadowColor = 'transparent';
  strokeRR(ctx, x, y, w, h, 20, rgba(accent, 0.28), 1.4);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, rgba(accent, 0.13)); g.addColorStop(0.55, rgba(accent, 0));
  fillRR(ctx, x, y, w, h, 20, g);
  ctx.restore();
}
function drawFeature(k, dx, u, t) {
  const x = 240, y = 168, w = 1440, h = 668;
  const acc = F_ACC[k];
  ctx.save();
  ctx.translate(dx, 0);
  const s = 1 + 0.005 * Math.sin(t * 1.15 + k * 1.7);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
  featureCard(x, y, w, h, acc);
  const pad = 72;
  const kw = measure(ctx, F_KICK[k], { size: 19, weight: 700, ls: 3.4 });
  kicker(ctx, F_KICK[k], x + pad + kw / 2 + 17, y + 80, clamp(u / 0.18), acc);
  txtAnim(ctx, F_TTL[k], x + pad, y + 178, { size: 64, weight: 700, color: C.text }, clamp(u / 0.24), 'rise');
  const rw = easeOutQuint(clamp((u - 0.1) / 0.4)) * 120;
  line(ctx, x + pad, y + 212, x + pad + rw, y + 212, rgba(acc, 0.85), 3);
  line(ctx, x + pad + rw + 8, y + 212, x + w - pad, y + 212, rgba('#FFFFFF', 0.07), 1);
  const body = clamp((u - 0.1) / 0.42);
  const by = y + 254, bh = 296;
  const lw = k === 2 ? 900 : 660;
  const lx = x + pad, rx = lx + lw + 56, rwd = x + w - pad - rx;
  ctx.save();
  ctx.globalAlpha = easeOutCubic(body);
  featureVisual(k, lx, by, lw, bh, body, t);
  ctx.restore();
  F_BUL[k].forEach((bl, n) => {
    const a = clamp((body - 0.08 - n * 0.13) / 0.3);
    if (a <= 0) return;
    const yy = by + 30 + n * 104;
    ctx.save(); ctx.globalAlpha = easeOutCubic(a);
    ctx.translate((1 - easeOutCubic(a)) * 26, 0);
    glowDot(ctx, rx + 7, yy - 8, 13, acc, 0.5);
    ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(rx + 7, yy - 8, 4, 0, 6.2832); ctx.fill();
    txt(ctx, bl[0], rx + 28, yy, { size: 25, weight: 700, color: C.text });
    txt(ctx, bl[1], rx + 28, yy + 34, { size: 19, color: C.muted });
    ctx.restore();
  });
  const fa = clamp((u - 0.3) / 0.3);
  if (fa > 0) {
    const fy = y + h - 80;
    ctx.save(); ctx.globalAlpha = easeOutCubic(fa);
    line(ctx, x + pad, fy - 28, x + w - pad, fy - 28, rgba('#FFFFFF', 0.09), 1);
    fillRR(ctx, x + pad, fy - 14, 5, 28, 3, acc);
    txt(ctx, F_FOOT[k], x + pad + 22, fy + 6, { size: 23, weight: 600, color: '#DCE6F2' });
    txt(ctx, 'SeqPanel', x + w - pad, fy + 6, { size: 19, mono: true, color: C.dim, align: 'right', ls: 1.2 });
    ctx.restore();
  }
  caption(ctx, F_CAP[k], null, clamp(u), { y: H - 74, size: 38 });
  ctx.restore();
}
function S7(t) {
  bgDeep(ctx, t, 0.45);
  gridFloor(ctx, t, 0.06, C.cyan);
  seqTexture(ctx, t, 0.2, [0, 0, W, H]);
  const i = Math.min(3, Math.floor((t - 46) / 2));
  const u = (t - (46 + i * 2)) / 2;
  const TR = 0.15, W2 = 1780;
  // carousel: outgoing slides left as incoming slides in — never stacked, never black
  if (u > 1 - TR && i < 3) {
    const q = easeInOutCubic((u - (1 - TR)) / TR);
    drawFeature(i, -W2 * q, u, t);
    drawFeature(i + 1, W2 * (1 - q), 0, t);
  } else {
    const e = i === 0 ? easeOutQuint(clamp(u / 0.14)) : 1;
    drawFeature(i, (1 - e) * W2, u, t);
  }
  sweep(ctx, pr(t, 45.7, 46.5), 0.35, 420, '#FFFFFF', 0.12);
}

// ---------- S8 end card ----------
function S8(t) {
  bgDeep(ctx, t, 0.7);
  gridFloor(ctx, t, 0.05, C.cyan);
  seqTexture(ctx, t, 0.42, [0, 0, W, H]);
  // converging particles
  for (let i = 0; i < 46; i++) {
    const r = A.rnd(i + 3)();
    const ang = r * 6.2832, dist = lerp(1100, 320 + (i % 7) * 40, easeOutCubic(pr(t, 54, 57)));
    const x = W / 2 + Math.cos(ang + t * 0.12) * dist, y = H / 2 + Math.sin(ang + t * 0.12) * dist * 0.55;
    glowDot(ctx, x, y, 26 + (i % 5) * 6, i % 3 ? C.blue : C.cyan, 0.35 * pr(t, 54, 55.5));
  }
  const wp = pr(t, 54.4, 56.2);
  ctx.save(); ctx.globalAlpha = easeOutCubic(pr(t, 54.15, 55.3));
  ctx.translate(0, (1 - easeOutQuint(pr(t, 54.15, 55.6))) * 26);
  gradText('SeqPanel', W / 2, H / 2 - 60, {
    size: 128, weight: 700, align: 'center', ls: -2,
    stops: [['#FFFFFF', 0], ['#BFD9FF', 0.5], ['#4EA8DE', 1]],
  });
  ctx.restore();
  ctx.save(); ctx.globalAlpha = easeOutCubic(wp);
  txt(ctx, '下载即用 · 没有黑箱', W / 2, H / 2 + 40, { size: 44, weight: 700, color: C.text, align: 'center' });
  ctx.restore();
  const l1 = pr(t, 55.6, 56.8);
  ctx.save(); ctx.globalAlpha = easeOutCubic(l1);
  fillRR(ctx, W / 2 - 330, H / 2 + 92, 660, 56, 28, rgba(C.blue, 0.14));
  strokeRR(ctx, W / 2 - 330, H / 2 + 92, 660, 56, 28, rgba(C.blue, 0.45), 1.3);
  txt(ctx, 'github.com/ZengZichao/SeqPanel-Windows', W / 2, H / 2 + 129, { size: 26, mono: true, color: C.blue2, align: 'center' });
  ctx.restore();
  txt(ctx, 'Apache License 2.0   ·   Windows 10 / 11   ·   内置 GoAlign v0.4.1', W / 2, H / 2 + 200,
    { size: 22, color: C.muted, align: 'center', alpha: easeOutCubic(pr(t, 56.4, 57.6)) });
  txt(ctx, 'A GUI panel for cobra-based command line tools', W / 2, H / 2 + 236,
    { size: 19, color: C.dim, align: 'center', ls: 1.4, alpha: easeOutCubic(pr(t, 56.8, 58.0)) });
  const fade = easeInCubic(pr(t, 59.2, 60.0));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- dispatcher ----------
function render(t) {
  setT(t);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  try {
    if (t < 6) S1(t);
    else if (t < 11) S2(t);
    else if (t < 16) S3(t);
    else if (t < 46) drawAppScene(t);
    else if (t < 54) S7(t);
    else S8(t);
  } catch (e) {
    window.__ERR.push(`t=${t.toFixed(3)} ${e && e.message ? e.message : e} | ${(e && e.stack || '').split('\n').slice(0, 3).join(' <> ')}`);
    txt(ctx, 'RENDER ERROR: ' + (e && e.message), 60, 60, { size: 34, color: C.red, mono: true });
  }
  vignette(ctx, 0.5);
  grain(ctx, 0.028);
}
window.SEEK = t => render(t);
window.DUR = DUR; window.FPS = FPS;
Promise.all([
  loadImg('assets/interface-zh-dark.png', 'dark'),
  loadImg('assets/interface-en-light.png', 'light'),
]).then(() => {
  if (document.fonts && document.fonts.ready) return document.fonts.ready;
}).then(() => { window.READY = true; })
  .catch(e => { window.__ERR.push('LOAD ' + e.message); window.READY = true; });
