// Generates icon.png — pure Node.js, zero dependencies
const zlib = require('zlib');
const fs   = require('fs');

const S = 256;
const img = new Uint8Array(S * S * 4); // RGBA

// ── Background: deep navy with a subtle centre glow ───────────────────────
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i  = (y * S + x) * 4;
    const dx = x - S / 2, dy = y - S / 2;
    const d  = Math.sqrt(dx * dx + dy * dy) / (S * 0.6);
    const bg = Math.round(Math.max(0, 1 - d) * 28);
    img[i]   = 0;
    img[i+1] = Math.round(bg * 0.4);
    img[i+2] = 18 + bg;
    img[i+3] = 255;
  }
}

// ── Pixel helpers ─────────────────────────────────────────────────────────
function blend(x, y, r, g, b, a) {
  if (x < 0 || x >= S || y < 0 || y >= S) return;
  const i  = (y * S + x) * 4;
  const sa = a / 255;
  img[i]   = Math.min(255, Math.round(img[i]   * (1 - sa) + r * sa));
  img[i+1] = Math.min(255, Math.round(img[i+1] * (1 - sa) + g * sa));
  img[i+2] = Math.min(255, Math.round(img[i+2] * (1 - sa) + b * sa));
}

function glow(cx, cy, r, g, b, rad) {
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > rad) continue;
      const f = Math.pow(1 - d / rad, 1.6);
      blend(cx + dx, cy + dy, r, g, b, Math.round(f * 210));
    }
  }
}

function line(x1, y1, x2, y2, cb) {
  const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    cb(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t));
  }
}

// ── Lightning bolt: classic Z shape ──────────────────────────────────────
//  (155,24) → (88,130) → (138,130) → (100,232)
const segs = [
  [155, 24,  88,  130],
  [ 88, 130, 138, 130],
  [138, 130, 100, 232],
];

// Layer 1 — wide outer glow (deep teal)
for (const [x1,y1,x2,y2] of segs)
  line(x1,y1,x2,y2, (x,y) => glow(x, y, 0, 160, 230, 20));

// Layer 2 — medium glow (bright cyan)
for (const [x1,y1,x2,y2] of segs)
  line(x1,y1,x2,y2, (x,y) => glow(x, y, 30, 215, 255, 11));

// Layer 3 — tight inner glow (white-cyan)
for (const [x1,y1,x2,y2] of segs)
  line(x1,y1,x2,y2, (x,y) => glow(x, y, 180, 245, 255, 5));

// Layer 4 — white-hot core (2 px wide)
for (const [x1,y1,x2,y2] of segs)
  line(x1,y1,x2,y2, (x,y) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        blend(x + dx, y + dy, 255, 255, 255, 255);
  });

// ── PNG encoder (pure Node.js) ────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const t   = Buffer.from(type);
  const d   = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB, no alpha

// IDAT: scanlines with filter byte 0
const raw = Buffer.alloc(S * (1 + S * 3));
for (let y = 0; y < S; y++) {
  raw[y * (S * 3 + 1)] = 0;
  for (let x = 0; x < S; x++) {
    const si = (y * S + x) * 4;
    const di = y * (S * 3 + 1) + 1 + x * 3;
    raw[di]   = img[si];
    raw[di+1] = img[si+1];
    raw[di+2] = img[si+2];
  }
}

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync('icon.png', png);
console.log('icon.png created successfully');
