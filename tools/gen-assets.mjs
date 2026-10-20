import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 最小 PNG 编码器 + 程序化贴图生成。
 * 不引任何图像库：RGBA → 过滤 0 的扫描线 → zlib → IHDR/IDAT/IEND。
 */
const OUT = join(process.cwd(), 'apps', 'game', 'public', 'assets');
const SS = 2; // 超采样倍数，边缘更顺

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createCanvas(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

function blend(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const offset = (y * canvas.width + x) * 4;
  const alpha = color[3] / 255;
  const existing = canvas.data[offset + 3] / 255;
  const outAlpha = alpha + existing * (1 - alpha);
  if (outAlpha === 0) return;
  for (let channel = 0; channel < 3; channel += 1) {
    const src = color[channel] * alpha;
    const dst = canvas.data[offset + channel] * existing * (1 - alpha);
    canvas.data[offset + channel] = Math.round((src + dst) / outAlpha);
  }
  canvas.data[offset + 3] = Math.round(outAlpha * 255);
}

function fillRect(canvas, x0, y0, x1, y1, color) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y += 1) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x += 1) {
      blend(canvas, x, y, color);
    }
  }
}

function fillCircle(canvas, cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (distance <= radius) {
        const edge = Math.min(1, radius - distance);
        blend(canvas, x, y, [color[0], color[1], color[2], Math.round(color[3] * edge)]);
      }
    }
  }
}

function fillPolygon(canvas, points, color) {
  const ys = points.map((point) => point[1]);
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y += 1) {
    const crossings = [];
    for (let index = 0; index < points.length; index += 1) {
      const [ax, ay] = points[index];
      const [bx, by] = points[(index + 1) % points.length];
      if (ay === by) continue;
      const scan = y + 0.5;
      if (scan >= Math.min(ay, by) && scan < Math.max(ay, by)) {
        crossings.push(ax + ((scan - ay) / (by - ay)) * (bx - ax));
      }
    }
    crossings.sort((left, right) => left - right);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      for (let x = Math.floor(crossings[index]); x <= Math.ceil(crossings[index + 1]); x += 1) {
        blend(canvas, x, y, color);
      }
    }
  }
}

function downsample(canvas, scale) {
  const width = Math.floor(canvas.width / scale);
  const height = Math.floor(canvas.height / scale);
  const out = createCanvas(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const offset = ((y * scale + sy) * canvas.width + (x * scale + sx)) * 4;
          r += canvas.data[offset];
          g += canvas.data[offset + 1];
          b += canvas.data[offset + 2];
          a += canvas.data[offset + 3];
        }
      }
      const count = scale * scale;
      const offset = (y * width + x) * 4;
      out.data[offset] = Math.round(r / count);
      out.data[offset + 1] = Math.round(g / count);
      out.data[offset + 2] = Math.round(b / count);
      out.data[offset + 3] = Math.round(a / count);
    }
  }
  return out;
}

function drawPlayer() {
  const canvas = createCanvas(48 * SS, 48 * SS);
  fillPolygon(canvas, [[24 * SS, 5 * SS], [43 * SS, 43 * SS], [24 * SS, 34 * SS], [5 * SS, 43 * SS]], [242, 138, 68, 255]);
  fillPolygon(canvas, [[24 * SS, 11 * SS], [33 * SS, 34 * SS], [24 * SS, 29 * SS], [15 * SS, 34 * SS]], [255, 214, 170, 255]);
  fillCircle(canvas, 24 * SS, 22 * SS, 3 * SS, [90, 40, 20, 255]);
  fillRect(canvas, 22 * SS, 34 * SS, 26 * SS, 42 * SS, [255, 210, 120, 200]);
  return downsample(canvas, SS);
}

function drawBox() {
  const canvas = createCanvas(24 * SS, 24 * SS);
  fillRect(canvas, 3 * SS, 3 * SS, 21 * SS, 21 * SS, [40, 38, 34, 255]);
  fillRect(canvas, 3 * SS, 3 * SS, 21 * SS, 4.5 * SS, [230, 226, 214, 255]);
  fillRect(canvas, 3 * SS, 19.5 * SS, 21 * SS, 21 * SS, [230, 226, 214, 255]);
  fillRect(canvas, 3 * SS, 3 * SS, 4.5 * SS, 21 * SS, [230, 226, 214, 255]);
  fillRect(canvas, 19.5 * SS, 3 * SS, 21 * SS, 21 * SS, [230, 226, 214, 255]);
  return downsample(canvas, SS);
}

function drawBullet() {
  const canvas = createCanvas(12 * SS, 12 * SS);
  fillCircle(canvas, 6 * SS, 6 * SS, 4.5 * SS, [255, 236, 180, 120]);
  fillCircle(canvas, 6 * SS, 6 * SS, 2.6 * SS, [255, 255, 255, 255]);
  return downsample(canvas, SS);
}

mkdirSync(OUT, { recursive: true });
const assets = [
  { name: 'player', file: 'player.png', canvas: drawPlayer() },
  { name: 'box', file: 'box.png', canvas: drawBox() },
  { name: 'bullet', file: 'bullet.png', canvas: drawBullet() },
];

for (const asset of assets) {
  const buffer = encodePng(asset.canvas.width, asset.canvas.height, asset.canvas.data);
  writeFileSync(join(OUT, asset.file), buffer);
  console.log(`${asset.file}  ${asset.canvas.width}×${asset.canvas.height}  ${buffer.length} bytes`);
}

writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  assets: assets.map((asset) => ({ name: asset.name, file: asset.file, width: asset.canvas.width, height: asset.canvas.height })),
}, null, 2)}\n`);
console.log('manifest.json');
