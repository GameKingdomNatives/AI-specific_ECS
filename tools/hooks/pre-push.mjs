#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deepDue, hasDirectMainPush, parsePushLines, verifyStamp } from './push-guard.mjs';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(root);

const input = readFileSync(0, 'utf8');
const pushes = parsePushLines(input);
const allowMain = process.env.ALLOW_MAIN_PUSH === '1';

if (hasDirectMainPush(pushes, allowMain)) {
  console.error('[pre-push] 拒绝对 main 的直接推送。');
  console.error('  请用 `node tools/hooks/safe-merge.mjs`（本批先手动运行）合并 feature 分支；');
  console.error('  紧急情况才允许 ALLOW_MAIN_PUSH=1，并说明原因。');
  process.exit(1);
}

console.log('[pre-push] 运行全量门禁…');
const gate = spawnSync(process.execPath, ['tools/gate.mjs'], { stdio: 'inherit', env: process.env });
if (gate.status !== 0) {
  console.error('[pre-push] 全量门禁失败，拒绝推送。');
  process.exit(gate.status ?? 1);
}

const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!verifyStamp(root, head)) {
  console.error(`[pre-push] 缺少 ${head} 的 gate stamp；拒绝推送。`);
  process.exit(1);
}

const receiptRun = spawnSync(process.execPath, ['tools/receipt.mjs'], { stdio: 'inherit', env: process.env });
if (receiptRun.status !== 0) {
  console.error('[pre-push] receipt 生成失败；拒绝推送。');
  process.exit(receiptRun.status ?? 1);
}
const receiptPath = join(root, 'artifacts', 'receipts', `${head}.json`);
if (!existsSync(receiptPath)) {
  console.error(`[pre-push] 缺少 receipt：${receiptPath}`);
  process.exit(1);
}
try {
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  if (receipt.head !== head || receipt.gatePassed !== true) {
    console.error('[pre-push] receipt 与 HEAD/门禁结果不一致；拒绝推送。');
    process.exit(1);
  }
} catch {
  console.error('[pre-push] receipt 不可解析；拒绝推送。');
  process.exit(1);
}

const deepPath = join(root, '.gate', 'deep-stamp.json');
let commitsSinceDeep = 0;
let hasDeepStamp = existsSync(join(root, '.gate', 'stamps', `deep-${head}.json`));
if (existsSync(deepPath)) {
  try {
    const deep = JSON.parse(readFileSync(deepPath, 'utf8'));
    if (typeof deep.head === 'string' && /^[0-9a-f]{40}$/.test(deep.head)) {
      commitsSinceDeep = Number(execFileSync('git', ['rev-list', '--count', `${deep.head}..HEAD`], { encoding: 'utf8' }).trim());
    }
  } catch {
    console.error('[pre-push] 无法读取 .gate/deep-stamp.json；按“无深检”处理。');
  }
}
if (deepDue(commitsSinceDeep, hasDeepStamp)) {
  console.error(`[pre-push] 距上次深检已 ${commitsSinceDeep} 个提交（阈值 5），当前 HEAD 无深检 stamp；拒绝推送。`);
  console.error('  先运行 `node tools/deep-audit.mjs`（Batch 0.2 落地）并把结果写入 .gate/stamps/deep-<HEAD>.json。');
  process.exit(1);
}

console.log(`[pre-push] PASS：${pushes.length} 个 ref，HEAD ${head.slice(0, 10)} 有 gate stamp。`);
