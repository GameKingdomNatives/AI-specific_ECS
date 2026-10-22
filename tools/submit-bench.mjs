import { readFileSync, writeFileSync } from 'node:fs';
import { computeViewBounds, isVisible } from '../packages/engine/dist/src/impl/render-cull.js';

/**
 * 提交簿记基准：3000 项全部可见时，测「剔除判定 + 视图簿记（Map 代际）+ 引用遍历」的 JS 耗时。
 * 不含 Pixi 节点创建与 GPU 绘制；真实 submit 耗时读浏览器 `__itb.render().submitAvgMs`。
 * 判定 = 绝对预算（默认 2ms/3000 项）且不超过历史基线容差（默认 2 倍）。
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

const items = valueOf('--items', 3000);
const rounds = valueOf('--rounds', 9);
const budgetMs = valueOf('--budget', 2);
const tolerance = valueOf('--tolerance', 2);
const baselinePath = stringOf('--baseline', 'tools/submit-bench-baseline.json');
const update = args.includes('--update');
const WARMUP_ROUNDS = 2;

const viewport = { width: 1920, height: 1080 };
const world = { width: viewport.width, height: viewport.height };
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

const rng = mulberry32(20261022);
const pool = [];
for (let index = 0; index < items; index += 1) {
  pool.push({
    id: index + 1,
    x: rng() * world.width,
    y: rng() * world.height,
    sx: 8 + rng() * 8,
    sy: 8 + rng() * 8,
    visible: true,
  });
}

let submitted = 0;
const samples = [];
for (let round = 0; round < rounds; round += 1) {
  const started = process.hrtime.bigint();
  const ledger = new Map();
  let frame = round + 1;
  let count = 0;
  for (const item of pool) {
    if (!item.visible || !isVisible(bounds, item.x, item.y, item.sx, item.sy, 24)) {
      continue;
    }
    const existing = ledger.get(item.id);
    if (existing === undefined) {
      ledger.set(item.id, { lastSeen: frame, layer: 1 });
    } else {
      existing.lastSeen = frame;
    }
    count += 1;
  }
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
  samples.push(elapsed);
  submitted = count;
  frame += 1;
}
const measured = samples.slice(WARMUP_ROUNDS);
const sorted = [...measured].sort((left, right) => left - right);
const msPerPass = sorted[Math.floor(sorted.length / 2)];

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
  submitted,
  rounds,
  samples: samples.map((value) => Number(value.toFixed(3))),
  msPerPass: Number(msPerPass.toFixed(3)),
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
    viewport,
    recordedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log(`基线已更新：${baselinePath}`);
}

process.exit(pass ? 0 : 1);
