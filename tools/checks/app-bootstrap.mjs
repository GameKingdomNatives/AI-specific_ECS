#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FILE = join(ROOT, 'apps', 'game', 'src', 'main.ts');
const errors = [];

if (!existsSync(FILE)) {
  console.error('app bootstrap 检查失败：main.ts 不存在');
  process.exit(1);
}
const source = readFileSync(FILE, 'utf8');
for (const needle of ['createEngine(', 'engine.resetWorld()', 'engine.resetScheduler(']) {
  if (!source.includes(needle)) errors.push(`缺少门面调用 ${needle}`);
}
for (const needle of ['new World(', 'new EventBus(', 'new CommandBuffer(', 'new FixedClock(', 'new Scheduler(']) {
  if (source.includes(needle)) errors.push(`回退手写核心：禁止 ${needle}`);
}
if (errors.length > 0) {
  console.error(`app bootstrap 检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('app bootstrap 检查通过：main.ts 只用 createEngine 门面');
