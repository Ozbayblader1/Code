// Generates icon.png — pure Node.js, zero dependencies
// Icon: the CUBE skin from NEON PLATFORMER (#FF6B6B coral with eyes)
const zlib = require('zlib');
const fs   = require('fs');

const S = 256;
const img = new Uint8Array(S * S * 4); // RGBA

// ── Helpers ────────────────────────────────────────────────────────────────
function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= S || y < 0 || y >= S) return;
  const i = (y * S + x) * 4;
  const sa = a / 255;
  img[i]   = Math.min(255, Math.round(img[i]   * (1 - sa) + r * sa));
  img[i+1] = Math.min(255, Math.round(img[i+1] * (1 - sa) + g * sa));
  img[i+2] = Math.min(255, Math.round(img[i+2] * (1 - sa) + b * sa));
  img[i+3] = 255;
}
function fillRect(x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b, a);
}
function glow(cx, cy, r, g, b, rad, strength = 200) {
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > rad) continue;
      const f = Math.pow(1 - d / rad, 1.8);
      setPixel(cx + dx, cy + dy, r, g, b, Math.round(f * strength));
    }
  }
}
function circle(cx, cy, rad, r, g, b, a = 255) {
  for (let dy = -rad; dy <= rad; dy++)
    for (let dx = -rad; dx <= rad; dx++)
      if (dx*dx + dy*dy <= rad*rad) setPixel(cx+dx, cy+dy, r, g, b, a);
}
function roundRect(x, y, w, h, radius, r, g, b, a = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const lx = px - x, ly = py - y;
      // Corner check
      let inCorner = false;
      if (lx < radius && ly < radius) inCorner = (lx-radius)*(lx-radius)+(ly-radius)*(ly-radius) > radius*radius;
      if (lx > w-1-radius && ly < radius) inCorner = inCorner || (lx-(w-1-radius))*(lx-(w-1-radius))+(ly-radius)*(ly-radius) > radius*radius;
      if (lx < radius && ly > h-1-radius) inCorner = inCorner || (lx-radius)*(lx-radius)+(ly-(h-1-radius))*(ly-(h-1-radius)) > radius*radius;
      if (lx > w-1-radius && ly > h-1-radius) inCorner = inCorner || (lx-(w-1-radius))*(lx-(w-1-radius))+(ly-(h-1-radius))*(ly-(h-1-radius)) > radius*radius;
      if (!inCorner) setPixel(px, py, r, g, b, a);
    }
  }
}

// ── Background: deep navy ──────────────────────────────────────────────────
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = x - S/2, dy = y - S/2;
    const d = Math.sqrt(dx*dx + dy*dy) / (S * 0.55);
    const bg = Math.round(Math.max(0, 1 - d) * 32);
    setPixel(x, y, 0, Math.round(bg * 0.35), 20 + bg, 255);
  }
}

// ── Cube body ──────────────────────────────────────────────────────────────
// Cube color: #FF6B6B = (255, 107, 107)
const CX = 128, CY = 128; // center
const CW = 162, CH = 162; // cube size
const BX = CX - CW/2, BY = CY - CH/2;
const RAD = 22; // corner radius

// Outer glow
glow(CX, CY, 255, 100, 90, 72, 140);
glow(CX, CY, 255, 80,  60, 44, 80);

// Dark shadow base (slightly offset down-right for depth)
roundRect(BX+4, BY+6, CW, CH, RAD, 120, 30, 30, 160);

// Main body gradient: lighter coral at top → darker red at bottom
for (let row = 0; row < CH; row++) {
  const t = row / CH;
  // Top: lighter (#FF9999) → Bottom: darker (#CC3333)
  const r = Math.round(255 * (1-t) + 180 * t);
  const g = Math.round(140 * (1-t) + 40  * t);
  const b = Math.round(140 * (1-t) + 40  * t);
  for (let col = 0; col < CW; col++) {
    const px = BX + col, py = BY + row;
    const lx = col, ly = row;
    let inCorner = false;
    if (lx < RAD && ly < RAD) inCorner = (lx-RAD)*(lx-RAD)+(ly-RAD)*(ly-RAD) > RAD*RAD;
    if (lx > CW-1-RAD && ly < RAD) inCorner = inCorner||(lx-(CW-1-RAD))*(lx-(CW-1-RAD))+(ly-RAD)*(ly-RAD)>RAD*RAD;
    if (lx < RAD && ly > CH-1-RAD) inCorner = inCorner||(lx-RAD)*(lx-RAD)+(ly-(CH-1-RAD))*(ly-(CH-1-RAD))>RAD*RAD;
    if (lx > CW-1-RAD && ly > CH-1-RAD) inCorner = inCorner||(lx-(CW-1-RAD))*(lx-(CW-1-RAD))+(ly-(CH-1-RAD))*(ly-(CH-1-RAD))>RAD*RAD;
    if (!inCorner) setPixel(px, py, r, g, b);
  }
}

// Top shine: semi-transparent white gradient in top third
for (let row = 0; row < CH * 0.42; row++) {
  const t = row / (CH * 0.42);
  const alpha = Math.round((1 - t) * (1 - t) * 90);
  for (let col = 0; col < CW; col++) {
    const lx = col, ly = row;
    let inCorner = false;
    if (lx < RAD && ly < RAD) inCorner = (lx-RAD)*(lx-RAD)+(ly-RAD)*(ly-RAD) > RAD*RAD;
    if (lx > CW-1-RAD && ly < RAD) inCorner = inCorner||(lx-(CW-1-RAD))*(lx-(CW-1-RAD))+(ly-RAD)*(ly-RAD)>RAD*RAD;
    if (!inCorner) setPixel(BX+col, BY+row, 255, 230, 230, alpha);
  }
}

// Bottom shadow strip
for (let row = Math.round(CH * 0.62); row < CH; row++) {
  const t = (row - CH * 0.62) / (CH * 0.38);
  const alpha = Math.round(t * 80);
  for (let col = 0; col < CW; col++) {
    const lx = col, ly = row;
    let inCorner = false;
    if (lx < RAD && ly > CH-1-RAD) inCorner = (lx-RAD)*(lx-RAD)+(ly-(CH-1-RAD))*(ly-(CH-1-RAD)) > RAD*RAD;
    if (lx > CW-1-RAD && ly > CH-1-RAD) inCorner = inCorner||(lx-(CW-1-RAD))*(lx-(CW-1-RAD))+(ly-(CH-1-RAD))*(ly-(CH-1-RAD))>RAD*RAD;
    if (!inCorner) setPixel(BX+col, BY+row, 0, 0, 0, alpha);
  }
}

// ── Border edge highlight ──────────────────────────────────────────────────
// Light top edge
for (let col = RAD; col < CW - RAD; col++) setPixel(BX+col, BY, 255, 200, 200, 160);
// Dark bottom edge
for (let col = RAD; col < CW - RAD; col++) setPixel(BX+col, BY+CH-1, 100, 20, 20, 180);

// ── Eyes ───────────────────────────────────────────────────────────────────
const EY = CY - 14; // eye vertical center

// Left eye — white + dark pupil + highlight
circle(CX - 28, EY, 15, 255, 255, 255); // white
circle(CX - 28, EY,  9, 20,  20,  20);  // pupil
circle(CX - 32, EY - 4, 4, 255, 255, 255); // highlight

// Right eye
circle(CX + 28, EY, 15, 255, 255, 255);
circle(CX + 28, EY,  9, 20,  20,  20);
circle(CX + 24, EY - 4, 4, 255, 255, 255);

// ── Small legs at bottom ───────────────────────────────────────────────────
const LY = BY + CH + 2;
fillRect(CX - 38, LY,  20, 14, 200, 55, 55); // left leg
fillRect(CX + 18, LY,  20, 14, 200, 55, 55); // right leg

// ── PNG encoder ───────────────────────────────────────────────────────────
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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

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
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync('icon.png', png);
console.log('icon.png created — NEON PLATFORMER cube character');
