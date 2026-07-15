/**
 * Gera ícones PWA simples (bandeira IT + azul consular).
 * Requer: Node 18+ (sem dependências externas).
 */
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

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
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
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

function drawIcon(x, y, size) {
  const pad = Math.round(size * 0.08);
  const inner = size - pad * 2;
  const ix = x - pad;
  const iy = y - pad;
  if (ix < 0 || iy < 0 || ix >= inner || iy >= inner) return [0, 98, 188, 255];
  const third = inner / 3;
  if (ix < third) return [0, 146, 70, 255];
  if (ix < third * 2) return [255, 255, 255, 255];
  return [206, 43, 55, 255];
}

function drawMaskable(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const dx = x - cx + 0.5;
  const dy = y - cy + 0.5;
  if (dx * dx + dy * dy > r * r) return [15, 20, 32, 255];
  return drawIcon(x, y, size);
}

const files = [
  ['icon-192.png', 192, drawIcon],
  ['icon-512.png', 512, drawIcon],
  ['icon-512-maskable.png', 512, drawMaskable],
];

for (const [name, size, fn] of files) {
  const out = join(root, name);
  writeFileSync(out, pngSolid(size, fn));
  console.log('OK', name, size + 'x' + size);
}
