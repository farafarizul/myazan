#!/usr/bin/env node
/**
 * generate-icons.js
 * Generates app icons (PNG + ICO) for Azan Malaysia using only Node.js built-ins.
 * Run with: node scripts/generate-icons.js
 *
 * Outputs:
 *   assets/icon.png        – 256×256 PNG (general)
 *   assets/tray-icon.png   – 16×16 PNG (system tray)
 *   assets/icon.ico        – simple ICO wrapping the 256×256 PNG
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS = path.join(__dirname, '..', 'assets');
fs.mkdirSync(ASSETS, { recursive: true });

/* ── Minimal PNG builder ──────────────────────────────────── */
function buildPng(width, height, pixelFn) {
  // pixelFn(x, y) -> [r, g, b, a]
  const chunks = [];

  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // colour type: RGB (no alpha channel; background is blended into pixel values)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // IDAT: raw scanlines (filter byte 0 + RGB per pixel)
  const raw = Buffer.alloc((1 + width * 3) * height);
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function makeChunk(type, data) {
    const buf = Buffer.alloc(4 + 4 + data.length + 4);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.slice(4, 8 + data.length));
    buf.writeUInt32BE(crc, 8 + data.length);
    return buf;
  }

  chunks.push(sig);
  chunks.push(makeChunk('IHDR', ihdr));
  chunks.push(makeChunk('IDAT', compressed));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

/* ── CRC-32 ───────────────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── Icon pixel function ──────────────────────────────────── */
// Dark background with a green crescent
function iconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.42;
  const r2 = size * 0.30;
  const ox = size * 0.10;

  const dx  = x - cx;
  const dy  = y - cy;
  const dist  = Math.sqrt(dx * dx + dy * dy);
  const dist2 = Math.sqrt((dx - ox) * (dx - ox) + dy * dy);

  // Background: dark navy
  let [pr, pg, pb] = [13, 17, 23];

  // Outer circle (green glow)
  if (dist < r + 2 && dist > r - 4) {
    const alpha = Math.max(0, 1 - Math.abs(dist - r) / 4);
    pr = Math.round(pr + (74 - pr) * alpha);
    pg = Math.round(pg + (222 - pg) * alpha);
    pb = Math.round(pb + (128 - pb) * alpha);
  }

  // Crescent: inside big circle but outside shifted circle
  if (dist < r - 5 && dist2 > r2) {
    pr = 74; pg = 222; pb = 128; // accent green
  }

  // Star inside crescent
  const angle = Math.atan2(dy, dx);
  const starR = size * 0.14;
  const starCx = cx + r * 0.28;
  const starCy = cy - r * 0.10;
  if (isInsideStar(x, y, starCx, starCy, starR, 5)) {
    pr = 250; pg = 204; pb = 21; // gold
  }

  return [pr, pg, pb];
}

function isInsideStar(px, py, cx, cy, r, points) {
  const angle = Math.atan2(py - cy, px - cx);
  const dist  = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  const inner = r * 0.45;
  const step  = Math.PI / points;
  const normalised = ((angle % (2 * step)) + 2 * step) % (2 * step);
  const boundary   = normalised < step
    ? inner + (r - inner) * (normalised / step)
    : r - (r - inner) * ((normalised - step) / step);
  return dist < boundary;
}

/* ── Generate 256×256 PNG ─────────────────────────────────── */
const SIZE256 = 256;
const png256 = buildPng(SIZE256, SIZE256, (x, y) => iconPixel(x, y, SIZE256));
fs.writeFileSync(path.join(ASSETS, 'icon.png'), png256);
console.log('✔ assets/icon.png (256×256)');

/* ── Generate 16×16 tray PNG ──────────────────────────────── */
const SIZE16 = 16;
const png16 = buildPng(SIZE16, SIZE16, (x, y) => iconPixel(x, y, SIZE16));
fs.writeFileSync(path.join(ASSETS, 'tray-icon.png'), png16);
console.log('✔ assets/tray-icon.png (16×16)');

/* ── Wrap 256×256 PNG in a minimal ICO ────────────────────── */
function buildIco(pngBuf) {
  // ICO format: header + directory entry + PNG data
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(1, 4); // count: 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 0;   // width:  0 means 256
  dirEntry[1] = 0;   // height: 0 means 256
  dirEntry[2] = 0;   // colour count (0 = no palette)
  dirEntry[3] = 0;   // reserved
  dirEntry.writeUInt16LE(1,   4); // planes
  dirEntry.writeUInt16LE(32,  6); // bit count
  dirEntry.writeUInt32LE(pngBuf.length, 8); // size of image data
  dirEntry.writeUInt32LE(6 + 16, 12);       // offset to image data

  return Buffer.concat([header, dirEntry, pngBuf]);
}

const ico = buildIco(png256);
fs.writeFileSync(path.join(ASSETS, 'icon.ico'), ico);
console.log('✔ assets/icon.ico');

console.log('\nIcon generation complete.');
