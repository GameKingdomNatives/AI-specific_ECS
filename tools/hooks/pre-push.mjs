#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deepDue, parsePushLines, tagPushes, verifyRefs, verifyStamp } from './push-guard.mjs';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(root);

const input = readFileSync(0, 'utf8');
const pushes = parsePushLines(input);
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const receiptPath = join(root, 'artifacts', 'receipts', `${head}.json`);

/** flow ship 已经跑过门禁时不再重复跑；缺少 stamp 才补跑。 */
if (!verifyStamp(root, head)) {
  console.log('[pre-push] 运行全量门禁…');
  const gate = spawnSync(process.execPath, ['tools/gate.mjs'], { stdio: 'inherit', env: process.env });
  if (gate.status !== 0) {
    console.error('[pre-push] 全量门禁失败，拒绝推送。');
    process.exit(gate.status ?? 1);
  }
} else {
  console.log('[pre-push] HEAD 已有 gate stamp，跳过重复门禁。');
}

const missing = verifyRefs(root, pushes);
if (missing.length > 0) {
  console.error('[pre-push] 以下被推送的提交没有 gate stamp；拒绝推送：');
  for (const push of missing) console.error(`  ${push.remoteRef} ${push.localSha.slice(0, 10)}`);
  console.error('  自动化入口：node tools/flow.mjs ship（会自动跑门禁/回执/深检并推送）。');
  process.exit(1);
}

/** tag 不要求 stamp，但必须指向当前历史内的提交；否则是历史漂移，拒绝。 */
for (const tag of tagPushes(pushes)) {
  let commit;
  try {
    commit = execFileSync('git', ['rev-parse', `${tag.localSha}^{commit}`], { encoding: 'utf8' }).trim();
  } catch {
    console.error(`[pre-push] tag ${tag.remoteRef} 无法解引用；拒绝推送。`);
    process.exit(1);
  }
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { stdio: 'ignore' });
  if (ancestor.status !== 0) {
    console.error(`[pre-push] tag ${tag.remoteRef} 指向的 ${commit.slice(0, 10)} 不在当前历史内；拒绝推送。`);
    process.exit(1);
  }
}

if (!existsSync(receiptPath)) {
  const receiptRun = spawnSync(process.execPath, ['tools/receipt.mjs'], { stdio: 'inherit', env: process.env });
  if (receiptRun.status !== 0) {
    console.error('[pre-push] receipt 生成失败；拒绝推送。');
    process.exit(receiptRun.status ?? 1);
  }
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
const hasDeepStamp = existsSync(join(root, '.gate', 'stamps', `deep-${head}.json`));
if (existsSync(deepPath)) {
  try {
    const deep = JSON.parse(readFileSync(deepPath, 'utf8'));
    if (typeof deep.head === 'string' && /^[0-9a-f]{40}$/.test(deep.head)) {
      commitsSinceDeep = Number(execFileSync('git', ['rev-list', '--count', `${deep.head}..HEAD`], { encoding: 'utf8' }).trim());
    }
  } catch {
    console.error('[pre-push] 无法读取 .gate/deep-stamp.json；按「无深检」处理。');
  }
}
if (deepDue(commitsSinceDeep, hasDeepStamp)) {
  console.error(`[pre-push] 距上次深检已 ${commitsSinceDeep} 个提交（阈值 5），当前 HEAD 无深检 stamp；拒绝推送。`);
  console.error('  自动化入口：node tools/flow.mjs ship（会自动跑深检）。');
  process.exit(1);
}

console.log(`[pre-push] PASS：${pushes.length} 个 ref（含 tag 可达性校验），HEAD ${head.slice(0, 10)} 有 stamp/receipt。`);
