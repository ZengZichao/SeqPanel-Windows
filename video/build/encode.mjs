// Encodes rendered frames + mixed audio into the final MP4.
// Usage: node encode.mjs [outputName]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TOOLCHAIN = process.env.VIDEO_TOOLCHAIN || path.resolve(__dirname, '../../../视频制作流程');
// these installer packages ship only the binary (no JS entry), so resolve the exe path directly
const FFMPEG = process.env.FFMPEG_BIN || path.join(TOOLCHAIN, 'node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
const FFPROBE = process.env.FFPROBE_BIN || path.join(TOOLCHAIN, 'node_modules/@ffprobe-installer/win32-x64/ffprobe.exe');
if (!fs.existsSync(FFMPEG)) { console.error('ffmpeg not found at ' + FFMPEG); process.exit(2); }
const name = process.argv[2] || 'SeqPanel-产品宣传视频-60s.mp4';
const out = path.join(ROOT, 'output', name);
fs.mkdirSync(path.dirname(out), { recursive: true });

const args = [
  '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
  '-framerate', '30', '-start_number', '0',
  '-i', path.join(ROOT, 'build', 'frames', 'f_%04d.jpg'),
  '-i', path.join(ROOT, 'audio', 'mix.wav'),
  '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.1',
  '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-movflags', '+faststart', '-r', '30',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-shortest',
  out,
];
console.log('ffmpeg', FFMPEG);
const r = spawnSync(FFMPEG, args, { stdio: 'inherit', shell: false });
if (r.status !== 0) { console.error('ffmpeg failed', r.status); process.exit(r.status || 1); }
const sz = fs.statSync(out).size;
console.log(`OK ${out}  ${(sz / 1048576).toFixed(1)} MB`);

// poster frame
const poster = path.join(ROOT, 'output', 'poster.jpg');
spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-i', out, '-ss', '14.0',
  '-frames:v', '1', '-q:v', '2', poster], { stdio: 'inherit' });
if (fs.existsSync(poster)) console.log('poster', poster, (fs.statSync(poster).size / 1024).toFixed(0), 'KB');
