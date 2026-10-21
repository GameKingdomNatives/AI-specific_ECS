import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 覆盖率门禁：读取 NODE_V8_COVERAGE 产出的 JSON，按「行是否被任一命中区间覆盖」
 * 统计 packages/engine/src 的覆盖率。只作为下限保护，不追求精确语句级统计。
 * 用法：node tools/coverage.mjs <coverageDir> [threshold]
 */
const args = process.argv.slice(2);
const coverageDir = resolve(args[0] ?? 'artifacts/coverage');
const threshold = Number(args[1] ?? 0.6);
const ROOT = resolve('.');
const ENGINE_SRC = join(ROOT, 'packages', 'engine', 'src');

function listJson(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...listJson(path));
    } else if (entry.endsWith('.json')) {
      out.push(path);
    }
  }
  return out;
}

function toSourcePath(url) {
  if (!url.startsWith('file://')) {
    return null;
  }
  const file = decodeURIComponent(url.slice('file://'.length)).replace(/^\/([A-Za-z]:)/, '$1');
  return file.replace(/\\/g, '/');
}

function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

/** 返回 { covered, executable } 行数；取覆盖该行的最内层区间计数。 */
function countLines(scriptText, functions) {
  const starts = lineStarts(scriptText);
  const ranges = [];
  for (const fn of functions) {
    for (const range of fn.ranges ?? []) {
      ranges.push(range);
    }
  }
  let covered = 0;
  let executable = 0;
  for (let line = 0; line < starts.length; line += 1) {
    let offset = starts[line];
    if (offset >= scriptText.length) {
      break;
    }
    while (offset < scriptText.length && (scriptText[offset] === ' ' || scriptText[offset] === '\t')) {
      offset += 1;
    }
    let best = null;
    for (const range of ranges) {
      if (range.startOffset <= offset && offset < range.endOffset) {
        if (best === null || range.endOffset - range.startOffset < best.endOffset - best.startOffset) {
          best = range;
        }
      }
    }
    if (best === null) {
      continue;
    }
    executable += 1;
    if (best.count > 0) {
      covered += 1;
    }
  }
  return { executable, covered };
}

const files = listJson(coverageDir);
const seen = new Map();
for (const file of files) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  for (const script of parsed.result ?? []) {
    const source = toSourcePath(script.url ?? '');
    if (source === null || !source.includes('/packages/engine/dist/src/')) {
      continue;
    }
    const srcPath = source.replace('/packages/engine/dist/src/', '/packages/engine/src/').replace(/\.js$/, '.ts');
    let text;
    try {
      text = readFileSync(source, 'utf8');
    } catch {
      continue;
    }
    const counts = countLines(text, script.functions ?? []);
    const previous = seen.get(srcPath) ?? { executable: 0, covered: 0 };
    seen.set(srcPath, {
      executable: Math.max(previous.executable, counts.executable),
      covered: Math.max(previous.covered, counts.covered),
    });
  }
}

if (seen.size === 0) {
  console.error(`没有可用的覆盖率数据（${coverageDir}）`);
  process.exit(1);
}

const rows = [];
let executable = 0;
let covered = 0;
for (const [srcPath, counts] of [...seen].sort(([left], [right]) => left.localeCompare(right))) {
  const label = srcPath.replace(`${ENGINE_SRC.replace(/\\/g, '/')}/`, '');
  const ratio = counts.executable === 0 ? 1 : counts.covered / counts.executable;
  rows.push({ file: label, ratio, covered: counts.covered, executable: counts.executable });
  executable += counts.executable;
  covered += counts.covered;
}

const overall = executable === 0 ? 0 : covered / executable;
for (const row of rows.filter((entry) => entry.executable > 0).sort((left, right) => left.ratio - right.ratio).slice(0, 8)) {
  console.log(`${(row.ratio * 100).toFixed(1).padStart(5)}%  ${String(row.covered).padStart(4)}/${String(row.executable).padEnd(4)} ${row.file}`);
}
console.log(`引擎源码覆盖率 ${(overall * 100).toFixed(1)}%（${covered}/${executable} 行），阈值 ${(threshold * 100).toFixed(0)}%`);
process.exit(overall >= threshold ? 0 : 1);
