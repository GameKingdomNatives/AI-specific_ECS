#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { capture } from './checks/spawn-capture.mjs';
import { deepDue } from './hooks/push-guard.mjs';

/**
 * 分支生命周期与交付：把「建分支、跑策略、盖章、合并、推送、删分支」收成一条命令。
 * 设计口径：人不需要记分支命令；AI 调用 flow，策略在 flow 里自动执行。
 * 用法：node tools/flow.mjs [status|policy|sweep|ship] [--remote] [--dry-run]
 */
const ROOT = process.cwd();
const args = process.argv.slice(2);
const command = args[0] ?? 'status';
const flags = new Set(args.slice(1));

function git(list) {
  const result = capture('git', list);
  return { ok: result.status === 0, out: (result.stdout || '').trim(), err: (result.stderr || '').trim() };
}

function runNode(list) {
  return spawnSync(process.execPath, list, { stdio: 'inherit', env: process.env });
}

function currentBranch() {
  return git(['branch', '--show-current']).out;
}

function branches() {
  const format = '%(refname:short)%09%(objectname)%09%(committerdate:unix)%09%(upstream:short)';
  return git(['for-each-ref', `--format=${format}`, 'refs/heads'])
    .out.split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, sha, ts, upstream] = line.split('\t');
      const ageDays = Math.max(0, Math.floor((Date.now() / 1000 - Number(ts)) / 86400));
      return { name, sha, ageDays, upstream: upstream ?? '' };
    });
}

function isMerged(name) {
  return git(['merge-base', '--is-ancestor', name, 'main']).ok;
}

function aheadOfMain(name) {
  const result = git(['rev-list', '--count', `main..${name}`]);
  return result.ok ? Number(result.out) : -1;
}

function stampFor(sha) {
  return existsSync(join(ROOT, '.gate', 'stamps', `${sha}.json`));
}

function printStatus() {
  const current = currentBranch();
  const head = git(['rev-parse', 'HEAD']).out;
  console.log(`当前分支  ${current || '(游离)'} · HEAD ${head.slice(0, 10)} · stamp ${stampFor(head) ? '有' : '缺'}`);
  console.log(`hooksPath ${git(['config', '--get', 'core.hooksPath']).out || '(未设置)'}`);
  const rows = branches().filter((branch) => branch.name !== 'main');
  const merged = rows.filter((branch) => isMerged(branch.name));
  console.log(`分支总数  ${rows.length}（已合并 ${merged.length} · 未合并 ${rows.length - merged.length}）`);
  for (const branch of rows) {
    const state = isMerged(branch.name) ? 'merged' : `+${aheadOfMain(branch.name)}`;
    console.log(`  ${branch.name.padEnd(40)} ${String(state).padEnd(8)} ${branch.ageDays}d ${stampFor(branch.sha) ? 'stamped' : ''} ${branch.upstream}`);
  }
}

function printPolicy() {
  const current = currentBranch();
  const head = git(['rev-parse', 'HEAD']).out;
  const missing = [];
  if (!stampFor(head)) missing.push(`HEAD ${head.slice(0, 10)} 缺 gate stamp`);
  if (!existsSync(join(ROOT, 'artifacts', 'receipts', `${head}.json`))) missing.push(`HEAD ${head.slice(0, 10)} 缺 receipt`);
  if (missing.length > 0) {
    console.error('策略未满足：\n  ' + missing.join('\n  '));
    console.error('运行 node tools/flow.mjs ship 会自动跑门禁、receipt、深检与推送。');
    process.exit(1);
  }
  const stale = branches()
    .filter((branch) => branch.name !== 'main' && branch.name !== current && !isMerged(branch.name))
    .filter((branch) => branch.ageDays > 14 || !stampFor(branch.sha));
  if (stale.length > 0) {
    console.error(`遗留分支（未合并且 >14 天或未盖章）：${stale.length} 个`);
    for (const branch of stale) console.error(`  - ${branch.name} (+ ${aheadOfMain(branch.name)} commits · ${branch.ageDays}d)`);
    console.error('先合并或删除；node tools/flow.mjs sweep 只删已合并分支。');
    process.exit(1);
  }
  console.log(`分支策略通过：${Math.max(0, branches().length - 1)} 个分支均已合并或带证据。`);
}

function sweep() {
  const current = currentBranch();
  const dryRun = flags.has('--dry-run');
  const merged = branches().filter((branch) => branch.name !== 'main' && branch.name !== current && isMerged(branch.name));
  let deleted = 0;
  for (const branch of merged) {
    if (dryRun) {
      console.log(`[dry-run] 将删除 ${branch.name}（已合并）`);
      continue;
    }
    // 已确认 merge 进 main 的分支，即使领先它自己的 upstream 也可安全删除；-D 在这里是受控的。
    let result = git(['branch', '-d', branch.name]);
    if (!result.ok) result = git(['branch', '-D', branch.name]);
    if (!result.ok) {
      console.error(`跳过 ${branch.name}：${result.err.split('\n').slice(-1)[0] ?? '未知'}`);
      continue;
    }
    deleted += 1;
    console.log(`删除 ${branch.name}（已合并）`);
    if (flags.has('--remote') && branch.upstream !== '') {
      const remote = git(['push', 'origin', '--delete', branch.name]);
      if (!remote.ok) console.error(`  远端删除失败：${remote.err.split('\n').slice(-1)[0] ?? '未知'}`);
    }
  }
  console.log(`清理完成：删除 ${deleted} 个已合并分支（保留 ${Math.max(0, branches().length - 1)} 个）。`);
}

function deepHead() {
  const path = join(ROOT, '.gate', 'deep-stamp.json');
  if (!existsSync(path)) return '';
  try {
    const record = JSON.parse(readFileSync(path, 'utf8'));
    return typeof record.head === 'string' ? record.head : '';
  } catch {
    return '';
  }
}

function ensureDeep() {
  const head = git(['rev-parse', 'HEAD']).out;
  if (!git(['rev-parse', '--verify', head]).ok) return false;
  const base = deepHead();
  const since = base.length === 40 ? Number(git(['rev-list', '--count', `${base}..HEAD`]).out || '0') : 0;
  const hasStamp = existsSync(join(ROOT, '.gate', 'stamps', `deep-${head}.json`));
  if (!deepDue(since, hasStamp)) return true;
  console.log(`[flow] 距上次深检 ${since} 个提交，自动跑深检…`);
  return runNode(['tools/deep-audit.mjs']).status === 0;
}

function mergeBranch(branch) {
  if (branch === 'main' || isMerged(branch)) return true;
  console.log(`[flow] ff-only 合并 ${branch} → main…`);
  if (!git(['checkout', 'main']).ok) return false;
  const merge = spawnSync('git', ['merge', '--ff-only', branch], { stdio: 'inherit' });
  if (merge.status === 0) return true;
  git(['checkout', branch]);
  console.error('[flow] ff-only 失败（main 已分叉）；先 rebase 再 ship。');
  return false;
}

function ship() {
  if (git(['status', '--porcelain', '--untracked-files=no']).out.length > 0) {
    console.error('拒绝交付：工作区有未提交改动。先提交，再 ship。');
    process.exit(1);
  }
  const branch = currentBranch();
  console.log(`[flow] 全量门禁（${branch}）…`);
  if (runNode(['tools/gate.mjs']).status !== 0) {
    console.error('[flow] 门禁失败，未推送。');
    process.exit(1);
  }
  if (runNode(['tools/receipt.mjs']).status !== 0) process.exit(1);
  if (!ensureDeep()) {
    console.error('[flow] 深检失败，未推送。');
    process.exit(1);
  }
  if (!mergeBranch(branch)) process.exit(1);
  const push = spawnSync('git', ['push', '--follow-tags', 'origin', 'main'], {
    stdio: 'inherit',
    env: { ...process.env, ALLOW_MAIN_PUSH: '1' },
  });
  if (push.status !== 0) {
    console.error('[flow] 推送失败。先看 node tools/push.mjs 的通道结论；不要 --no-verify。');
    process.exit(1);
  }
  if (branch !== 'main' && isMerged(branch)) {
    git(['branch', '-d', branch]);
    console.log(`[flow] 已删除合并后的 ${branch}`);
  }
  console.log('[flow] PASS：门禁、receipt、深检、推送全部完成。');
}

const commands = { status: printStatus, policy: printPolicy, sweep, ship };
const handler = commands[command];
if (handler === undefined) {
  console.error('用法：node tools/flow.mjs [status|policy|sweep|ship] [--remote] [--dry-run]');
  process.exit(2);
}
handler();
