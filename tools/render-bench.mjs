import { readFileSync, writeFileSync } from 'node:fs';
import { computeViewBounds, isVisible } from '../packages/engine/dist/src/impl/render-cull.js';

/**
 * 渲染剔除基准：用固定种子在 8000×6000 世界里放 N 个 item，
 * 相机在中心、视口 1920×1080，测「剔除判定」一整趟的耗时与剔除比例。
 * 只测 JS 侧判定（不含 GPU 绘制），预算默认 4ms/10000 项。
 */
const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const stringOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const items = valueOf('--items', 10000);
const rounds = valueOf('--rounds', 9);
const budgetMs = valueOf('--budget', 4);
const tolerance = valueOf('--tolerance', 2);
const baselinePath = stringOf('--baseline', 'tools/render-bench-baseline.json');
const update = args.includes('--update');
const WARMUP_ROUNDS = 2;

const world = { width: 8000, height: 6000 };
const viewport = { width: 1920, height: 1080 };
const camera = { x: world.width / 2, y: world.height / 2, zoom: 1 };
const bounds = computeViewBounds(camera, viewport);

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261021);
const pool = [];
for (let index = 0; index < items; index += 1) {
  pool.push({
    x: rng() * world.width,
    y: rng() * world.height,
    sx: 8 + rng() * 8,
    sy: 8 + rng() * 8,
  });
}

const samples = [];
let visible = 0;
for (let round = 0; round < rounds; round += 1) {
  const started = process.hrtime.bigint();
  let count = 0;
  for (const item of pool) {
    if (isVisible(bounds, item.x, item.y, item.sx, item.sy, 24)) {
      count += 1;
    }
  }
  samples.push(Number(process.hrtime.bigint() - started) / 1e6);
  visible = count;
}
const measured = samples.slice(WARMUP_ROUNDS);
const sorted = [...measured].sort((left, right) => left - right);
const msPerPass = sorted[Math.floor(sorted.length / 2)];
const culledRatio = items === 0 ? 0 : (items - visible) / items;

let baselineMs = null;
try {
  baselineMs = JSON.parse(readFileSync(baselinePath, 'utf8')).msPerPass ?? null;
} catch {
  baselineMs = null;
}

const withinBudget = msPerPass <= budgetMs;
const withinBaseline = baselineMs === null || msPerPass <= baselineMs * tolerance;
const pass = withinBudget && withinBaseline;

const report = {
  items,
  rounds,
  world,
  viewport,
  samples: samples.map((value) => Number(value.toFixed(3))),
  msPerPass: Number(msPerPass.toFixed(3)),
  visible,
  culledRatio: Number(culledRatio.toFixed(3)),
  budgetMs,
  baselineMs,
  tolerance,
  withinBudget,
  withinBaseline,
  pass,
};
console.log(JSON.stringify(report, null, 2));

if (update) {
  writeFileSync(baselinePath, `${JSON.stringify({
    msPerPass: Number(msPerPass.toFixed(3)),
    items,
    world,
    viewport,
    recordedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log(`基线已更新：${baselinePath}`);
}

process.exit(pass ? 0 : 1);
