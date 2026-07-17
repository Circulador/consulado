/**
 * Ícones PWA — ampulheta comum + faixa tricolor (comunidade, não oficial).
 * Requer: Node 18+ (sem dependências externas).
 */
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const BG = [26, 22, 18];
const TERRA = [200, 90, 40];
const SAND = [243, 236, 227];
const VERDE = [0, 146, 70];
const BIANCO = [255, 255, 255];
const ROSSO = [206, 43, 55];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function pngSolid(size, draw) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const row = Buffer.alloc(1 + size * 4);
  const raw = Buffer.alloc((1 + size * 4) * size);
  for (let y = 0; y < size; y++) {
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const i = 1 + x * 4;
      row[i] = r;
      row[i + 1] = g;
      row[i + 2] = b;
      row[i + 3] = a;
    }
    row.copy(raw, y * row.length);
  }
  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(x, y, size, rx, ry, rw, rh, rad) {
  const cx = Math.max(rx + rad, Math.min(x, rx + rw - rad - 1));
  const cy = Math.max(ry + rad, Math.min(y, ry + rh - rad - 1));
  const dx = x < rx + rad ? x - (rx + rad) : x >= rx + rw - rad ? x - (rx + rw - rad - 1) : 0;
  const dy = y < ry + rad ? y - (ry + rad) : y >= ry + rh - rad ? y - (ry + rh - rad - 1) : 0;
  if (Math.abs(x - cx) <= rad && Math.abs(y - cy) <= rad) return dx * dx + dy * dy <= rad * rad;
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

function inHourglass(x, y, size) {
  const cx = size / 2;
  const cy = size * 0.46;
  const w = size * 0.22;
  const h = size * 0.34;
  const nx = (x - cx) / w;
  const ny = (y - cy) / h;
  if (Math.abs(nx) > 1) return false;
  const top = ny < 0 && Math.abs(ny) <= 1 - Math.abs(nx) * 0.15;
  const bot = ny > 0 && Math.abs(ny) <= 1 - Math.abs(nx) * 0.15;
  const neck = Math.abs(nx) < 0.12 && Math.abs(ny) < 0.08;
  return top || bot || neck;
}

function drawIcon(x, y, size) {
  const pad = size * 0.1;
  const rad = size * 0.18;
  if (!inRoundRect(x, y, size, pad, pad, size - pad * 2, size - pad * 2, rad)) {
    return [0, 0, 0, 0];
  }
  const stripeH = size * 0.1;
  const stripeY = size - pad - stripeH;
  if (y >= stripeY) {
    const third = (size - pad * 2) / 3;
    const lx = x - pad;
    if (lx < third) return [...VERDE, 255];
    if (lx < third * 2) return [...BIANCO, 255];
    return [...ROSSO, 255];
  }
  if (inHourglass(x, y, size)) return [...SAND, 255];
  return [...TERRA, 255];
}

function drawMaskable(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;
  const dx = x - cx + 0.5;
  const dy = y - cy + 0.5;
  if (dx * dx + dy * dy > r * r) return [...BG, 255];
  return drawIcon(x, y, size);
}

for (const [name, size, fn] of [
  ['icon-192.png', 192, drawIcon],
  ['icon-512.png', 512, drawIcon],
  ['icon-512-maskable.png', 512, drawMaskable],
]) {
  writeFileSync(join(root, name), pngSolid(size, fn));
  console.log('OK', name);
}
