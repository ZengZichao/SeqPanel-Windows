// Renders the SeqPanel promo frame-by-frame with headless Edge driving the canvas compositor.
// Usage: node render-frames.mjs [firstFrame] [lastFrame]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENE = path.resolve(__dirname, '../scene');
const FRAMES = path.resolve(__dirname, 'frames');
const TOOLCHAIN = process.env.VIDEO_TOOLCHAIN || path.resolve(__dirname, '../../../视频制作流程');
const require = createRequire(path.join(TOOLCHAIN, 'noop.js'));
const puppeteer = require('puppeteer-core');

const FPS = 30, DUR = 60, TOTAL = FPS * DUR;
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(p => fs.existsSync(p));
if (!EDGE) { console.error('no chromium-based browser found'); process.exit(2); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(SCENE, rel);
  if (!f.startsWith(SCENE) || !fs.existsSync(f)) { res.writeHead(404); return res.end('404 ' + rel); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
const PORT = await new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));
fs.mkdirSync(FRAMES, { recursive: true });

const from = Number(process.argv[2] ?? 0), to = Number(process.argv[3] ?? TOTAL - 1);
const DRY = process.env.DRY === '1';   // SEEK every frame, screenshot none (error sweep)
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: true,
  args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run',
    '--disable-lcd-text', '--font-render-hinting=none', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--enable-unsafe-swiftshader', '--no-sandbox', '--mute-audio', '--window-size=1920,1080'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.READY === true', { timeout: 60000 });
const boot = await page.evaluate(() => (window.__ERR || []).slice());
if (boot.length) { console.log('BOOT ERRORS:', boot.join(' | ')); }
console.log(`browser=${path.basename(EDGE)} port=${PORT} frames=${from}..${to} @${FPS}fps`);

const t0 = Date.now();
let errs = 0;
for (let i = from; i <= to; i++) {
  const t = i / FPS;
  const err = await page.evaluate(tt => { try { window.SEEK(tt); } catch (e) { return String(e); } return null; }, t);
  if (err) { console.log('SEEK FAIL', i, err); errs++; }
  const out = path.join(FRAMES, `f_${String(i).padStart(4, '0')}.jpg`);
  if (!DRY && !fs.existsSync(out)) {
    const buf = await page.screenshot({ type: 'jpeg', quality: 92, captureBeyondViewport: false });
    fs.writeFileSync(out, buf);
  }
  if (i % 150 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`frame ${i}/${to}  ${el.toFixed(0)}s elapsed  eta ${((el / Math.max(1, i - from)) * (to - i)).toFixed(0)}s`);
  }
}
const collected = await page.evaluate(() => window.__ERR || []);
if (collected.length) { console.log('RENDER ERRORS:', collected.length); collected.slice(0, 12).forEach(e => console.log('  ', e)); }
await browser.close();
server.close();
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s  seekFailures=${errs}  jsErrors=${collected.length}`);
if (collected.length || errs) process.exit(3);
