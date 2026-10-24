#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'packages', 'engine', 'src', 'demo');
const errors = [];

if (!existsSync(DIR)) {
  console.error(`热路径事件检查失败：目录不存在 ${DIR}`);
  process.exit(1);
}

const COLD = /(Hit|Spawner|Cleanup|Contact|Scene)/;
for (const entry of readdirSync(DIR)) {
  if (!entry.endsWith('.ts')) continue;
  const lines = readFileSync(join(DIR, entry), 'utf8').split('\n');
  let current = '';
  for (let index = 0; index < lines.length; index += 1) {
    const fn = lines[index].match(/export function (create\w+)\s*\(/);
    if (fn !== null) current = fn[1];
    if (!lines[index].includes('ctx.bus.emit')) continue;
    if (!COLD.test(current)) {
      errors.push(`${entry}:${index + 1} 在热路径系统 ${current || '?'} 里调用事件总线；应走冷逻辑或命令缓冲`);
    }
  }
}

if (errors.length > 0) {
  console.error(`热路径事件检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('热路径事件检查通过：高频系统没有直接 emit');
