#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FILE = join(ROOT, 'apps', 'game', 'src', 'main.ts');
const errors = [];

if (!existsSync(FILE)) {
  console.error('预算告警检查失败：apps/game/src/main.ts 不存在');
  process.exit(1);
}
const source = readFileSync(FILE, 'utf8');
if (!source.includes('findBudgetBreach')) errors.push('缺少 findBudgetBreach 调用；p95 超预算不会告警');
if (!source.includes("logger.warn('system over budget'")) errors.push('缺少 system over budget 告警日志；没有留证');
if (!source.includes("get('budget')")) errors.push('缺少 ?budget= 覆盖入口；无法验证阈值');

if (errors.length > 0) {
  console.error(`预算告警检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('预算告警检查通过：findBudgetBreach + 告警日志 + ?budget= 入口都在');
