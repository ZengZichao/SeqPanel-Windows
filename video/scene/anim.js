// SeqPanel promo — deterministic canvas helpers. Everything is a pure function of time t.
'use strict';

const W = 1920, H = 1080;

// ---------- palette ----------
const C = {
  bg0: '#070A0E', bg1: '#0B0F14', bg2: '#111721',
  panel: '#161B22', panel2: '#1B222C', panel3: '#0D1117',
  line: '#2A3441', line2: '#222C39',
  text: '#E6EDF3', text2: '#C7D2DE', muted: '#8B98A8', dim: '#5C6773',
  blue: '#3B82F6', blue2: '#60A5FA', cyan: '#2DD4BF', teal: '#14B8A6',
  green: '#3FB950', greenDim: '#238636', amber: '#D29922', red: '#F85149',
  violet: '#8B5CF6', pink: '#EC4899',
};
const FONT = '"Microsoft YaHei UI","Microsoft YaHei","PingFang SC",sans-serif';
const MONO = 'Consolas,"Cascadia Mono","Courier New",monospace';

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
// normalized progress of t inside [a,b], clamped to 0..1
const pr = (t, a, b) => clamp((t - a) / (b - a));
const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
const easeOutQuint = u => 1 - Math.pow(1 - u, 5);
const easeInOutCubic = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeInCubic = u => u * u * u;
const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
// damped u in seconds since trigger
function springOvershoot(u, freq = 7, decay = 6) {
  if (u <= 0) return 0;
  return 1 - Math.exp(-decay * u) * Math.cos(freq * u);
}
// deterministic pseudo random
function rnd(seed) {
  let s = (seed * 374761393 + 668265263) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const mix = (c1, c2, u) => {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = p(c1), b = p(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`;
};
const rgba = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// ---------- canvas drawing ----------
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function fillRR(ctx, x, y, w, h, r, fill) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
function strokeRR(ctx, x, y, w, h, r, stroke, lw = 1) {
  rr(ctx, x, y, w, h, r); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
}
// text opts: {size, weight, font(mono), color, alpha, align, baseline, ls(letterSpacing px), maxW}
const _mctx = document.createElement('canvas').getContext('2d');
function fontStr(o) { return `${o.weight || 400} ${o.size}px ${o.mono ? MONO : FONT}`; }
function measure(ctx, str, o) {
  _mctx.font = fontStr(o);
  _mctx.letterSpacing = (o.ls || 0) + 'px';
  return _mctx.measureText(str).width;
}
function txt(ctx, str, x, y, o = {}) {
  if (str === '' || str == null) return 0;
  const size = o.size || 28, alpha = o.alpha == null ? 1 : o.alpha;
  if (alpha <= 0.002) return 0;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = fontStr(o);
  try { ctx.letterSpacing = (o.ls || 0) + 'px'; } catch (e) {}
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  ctx.fillStyle = o.color || C.text;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || size; }
  ctx.fillText(String(str), x, y);
  ctx.restore();
  return measure(ctx, String(str), o);
}
// draw text with per-character reveal / stagger. mode: 'type' | 'fade' | 'rise'
function txtAnim(ctx, str, x, y, o, p, mode = 'type') {
  const n = str.length;
  if (mode === 'type') {
    const k = Math.round(p * n);
    return txt(ctx, str.slice(0, k), x, y, o);
  }
  ctx.save();
  let cx = x;
  for (let i = 0; i < n; i++) {
    const st = i / Math.max(1, n - 1) * 0.55;
    const u = clamp((p - st) / 0.45);
    const e = easeOutCubic(u);
    const ch = str[i];
    const cw = measure(ctx, ch, o);
    if (u > 0) {
      if (mode === 'fade') txt(ctx, ch, cx, y, { ...o, alpha: (o.alpha == null ? 1 : o.alpha) * e });
      else {
        ctx.save(); ctx.translate(0, (1 - e) * (o.rise || 26));
        txt(ctx, ch, cx, y, { ...o, alpha: (o.alpha == null ? 1 : o.alpha) * e });
        ctx.restore();
      }
    }
    cx += cw + (o.ls || 0);
  }
  ctx.restore();
  return cx - x;
}
function line(ctx, x1, y1, x2, y2, color, lw = 1, dash) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}
function glowDot(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 0.95 * a));
  g.addColorStop(0.35, rgba(color, 0.45 * a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

// ---------- full-frame looks ----------
function bgDeep(ctx, t, tint = 0) {
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, mix('#0D131C', '#111E30', tint));
  g.addColorStop(0.55, mix('#0A0E15', '#0D1622', tint));
  g.addColorStop(1, mix('#080B11', '#0E1726', tint));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // centre lift keeps the frame off true black so scene cuts never read as a dead screen
  const c = ctx.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, H * 0.95);
  c.addColorStop(0, 'rgba(56,86,140,0.16)');
  c.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = c; ctx.fillRect(0, 0, W, H);
  // slow-moving brand glows
  const r1 = 620 + 40 * Math.sin(t * 0.5);
  glowBlob(ctx, W * (0.16 + 0.03 * Math.sin(t * 0.23)), H * (0.2 + 0.05 * Math.cos(t * 0.19)), r1, C.blue, 0.24);
  glowBlob(ctx, W * (0.86 + 0.03 * Math.cos(t * 0.21)), H * (0.82 + 0.04 * Math.sin(t * 0.17)), 560, C.teal, 0.17);
}
function glowBlob(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.6, rgba(color, a * 0.25));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function gridFloor(ctx, t, alpha = 0.1, color = C.blue) {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = rgba(color, 0.5); ctx.lineWidth = 1;
  const sp = 96, off = (t * 12) % sp;
  for (let x = -sp; x < W + sp; x += sp) { line(ctx, x + off, 0, x + off, H, rgba(color, 0.14), 1); }
  for (let y = -sp; y < H + sp; y += sp) { line(ctx, 0, y + off, W, y + off, rgba(color, 0.14), 1); }
  ctx.restore();
}
// DNA / sequence motif: rows of bases drifting, used as texture
function seqTexture(ctx, t, alpha = 0.5, region = null) {
  const bases = 'ATGC';
  ctx.save();
  if (region) { ctx.beginPath(); ctx.rect(region[0], region[1], region[2], region[3]); ctx.clip(); }
  const r = rnd(7);
  ctx.font = `15px ${MONO}`;
  const rows = 26, cols = 74;
  for (let i = 0; i < rows; i++) {
    const y = 24 + i * 42;
    const drift = ((t * (6 + i % 5)) % 26);
    for (let j = 0; j < cols; j++) {
      const x = -26 + j * 26 + drift;
      const seed = i * 131 + j * 17;
      const b = bases[Math.floor(rnd(seed)() * 4)];
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + i * 0.4 + j * 0.13);
      ctx.fillStyle = rgba(b === 'G' ? C.cyan : b === 'C' ? C.blue : '#243040', alpha * (0.16 + 0.5 * pulse * pulse * pulse));
      ctx.fillText(b, x, y);
    }
  }
  ctx.restore();
}
let _grain = null;
function grain(ctx, a = 0.03) {
  if (!_grain) {
    const c = document.createElement('canvas'); c.width = 220; c.height = 220;
    const g = c.getContext('2d'); const id = g.createImageData(220, 220);
    const r = rnd(99);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 190;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    _grain = ctx.canvas.getContext('2d').createPattern(c, 'repeat');
  }
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a;
  ctx.fillStyle = _grain; ctx.translate(-((t_global * 37) % 220), -((t_global * 53) % 220));
  ctx.fillRect(0, 0, W + 240, H + 240); ctx.restore();
}
let t_global = 0;
function vignette(ctx, strength = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 1.02);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// diagonal light sweep across the whole frame (transition accent)
function sweep(ctx, p, angle = -0.28, width = 340, color = '#FFFFFF', peak = 0.16) {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(angle);
  const span = W * 1.9;
  const x = lerp(-span / 2, span / 2, easeInOutCubic(p));
  const g = ctx.createLinearGradient(x - width, 0, x + width, 0);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.5, rgba(color, peak));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 2, H * 2);
  ctx.restore();
}
// bottom caption / subtitle bar
function caption(ctx, str, sub, p, o = {}) {
  if (!str && !sub) return;
  const e = easeOutCubic(clamp(p / 0.28));
  const out = 1 - easeInCubic(clamp((p - 0.86) / 0.14));
  const a = Math.min(e, out);
  const yBase = o.y == null ? H - 118 : o.y;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - e) * 18);
  if (o.bar !== false) {
    const g = ctx.createLinearGradient(0, yBase - 66, 0, yBase + 62);
    g.addColorStop(0, 'rgba(6,9,13,0)'); g.addColorStop(1, 'rgba(6,9,13,0.72)');
    ctx.fillStyle = g; ctx.fillRect(0, yBase - 66, W, 128);
  }
  txt(ctx, str, W / 2, yBase, {
    size: o.size || 46, weight: 700, align: 'center',
    color: o.color || C.text, shadow: 'rgba(0,0,0,0.85)', shadowBlur: 22,
  });
  if (sub) {
    txt(ctx, sub, W / 2, yBase + 40, {
      size: o.subSize || 21, weight: 400, align: 'center', color: o.subColor || C.muted, ls: o.ls == null ? 1.6 : o.ls,
    });
  }
  ctx.restore();
}
// small kicker label above captions
function kicker(ctx, str, x, y, p, color = C.cyan) {
  const e = easeOutCubic(clamp(p / 0.3));
  ctx.save(); ctx.globalAlpha = e;
  const w = measure(ctx, str, { size: 19, weight: 700, ls: 3.4 }) + 34;
  fillRR(ctx, x - w / 2, y - 17, w, 34, 17, rgba(color, 0.13));
  strokeRR(ctx, x - w / 2, y - 17, w, 34, 17, rgba(color, 0.45), 1);
  txt(ctx, str, x, y + 6, { size: 19, weight: 700, align: 'center', color, ls: 3.4 });
  ctx.restore();
}
// fake mouse cursor
function cursor(ctx, x, y, scale = 1, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 21); ctx.lineTo(5.2, 16.2); ctx.lineTo(8.6, 23); ctx.lineTo(12.4, 21.2);
  ctx.lineTo(9, 14.6); ctx.lineTo(16, 13.6); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0B0F14'; ctx.lineWidth = 1.6;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.fill(); ctx.stroke();
  ctx.restore();
}
function clickRing(ctx, x, y, p, color = C.blue2) {
  if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.globalAlpha = (1 - p) * 0.8;
  ctx.strokeStyle = rgba(color, 1); ctx.lineWidth = 2.5 * (1 - p) + 0.6;
  ctx.beginPath(); ctx.arc(x, y, 8 + p * 46, 0, 6.2832); ctx.stroke();
  ctx.restore();
}
// map a source rect (in mock-app space) to a target rect on screen -> ctx transform
function fitTransform(src, dst, pad = 0) {
  const s = Math.min((dst[2] - pad * 2) / src[2], (dst[3] - pad * 2) / src[3]);
  const cx = dst[0] + dst[2] / 2, cy = dst[1] + dst[3] / 2;
  return { scale: s, tx: cx - (src[0] + src[2] / 2) * s, ty: cy - (src[1] + src[3] / 2) * s };
}
export { W, H, C, FONT, MONO, clamp, lerp, pr, easeOutCubic, easeOutQuint, easeInOutCubic, easeInCubic, smooth, springOvershoot, rnd, mix, rgba, rr, fillRR, strokeRR, measure, txt, txtAnim, line, glowDot, bgDeep, glowBlob, gridFloor, seqTexture, grain, vignette, sweep, caption, kicker, cursor, clickRing, fitTransform, setT };
function setT(t) { t_global = t; }
