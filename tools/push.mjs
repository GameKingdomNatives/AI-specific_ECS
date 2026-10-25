#!/usr/bin/env node
import net from 'node:net';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { capture } from './checks/spawn-capture.mjs';

/**
 * 推送诊断与执行：把「分支保护放行了吗」和「网络通道通不通」分开判定。
 * 只做三件事：检查证据（stamp/干净）、探测通道（22/443）、按结果推或给出下一步。
 * 用法：node tools/push.mjs [--go]
 */
const ROOT = process.cwd();
const GO = process.argv.includes('--go');

function git(args) {
  const r = capture('git', args);
  return { ok: r.status === 0, status: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function tcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const finish = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(4000);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

const head = git(['rev-parse', 'HEAD']);
const short = git(['rev-parse', '--short', 'HEAD']);
const remote = git(['remote', 'get-url', 'origin']);
const branch = git(['branch', '--show-current']);
const status = git(['status', '--porcelain']);
const stamp = existsSync(join(ROOT, '.gate', 'stamps', `${head.out}.json`));

console.log(`HEAD      ${short.out || '(无)'}`);
console.log(`分支      ${branch.out || '(无)'}`);
console.log(`远端      ${remote.out || '(无)'}`);
console.log(`工作区    ${status.ok ? `${status.out.split('\n').filter(Boolean).length} 个未提交` : '读取失败'}`);
console.log(`stamp     ${stamp ? '有（门禁已放行）' : '缺失（先跑 node tools/gate.mjs）'}`);

const sshG = capture('ssh', ['-G', 'github.com']);
if (sshG.status === 0) {
  const host = /^hostname (.+)$/m.exec(sshG.stdout)?.[1]?.trim() ?? '?';
  const port = /^port (.+)$/m.exec(sshG.stdout)?.[1]?.trim() ?? '?';
  console.log(`ssh 配置  github.com → ${host}:${port}`);
} else {
  console.log('ssh 配置  读取失败（受限沙箱常见；请在普通终端复查 ~/.ssh/config）');
}

const [p22, p443] = await Promise.all([tcp('github.com', 22), tcp('ssh.github.com', 443)]);
console.log(`通道      github.com:22 ${p22 ? '通' : '不通'} · ssh.github.com:443 ${p443 ? '通' : '不通'}`);

if (!GO) {
  console.log('');
  console.log('下一步（按通道选择）：');
  console.log('  22 通    → git push --follow-tags（若 ~/.ssh/config 把 github.com 改到 443，用 -F NUL 绕过）');
  console.log('  仅 443 通 → ssh://git@ssh.github.com:443/GameKingdomNatives/AI-specific_ECS.git');
  console.log('  都不通    → 换网络/代理，或走 HTTPS + PAT，或用 git bundle 离线搬运');
  console.log('  执行      → node tools/push.mjs --go（要求工作区干净且 HEAD 有 stamp）');
  process.exit(0);
}

if (!status.ok || status.out.length > 0) {
  console.error('拒绝推送：工作区不干净。先提交或清理，再跑门禁。');
  process.exit(1);
}
if (!stamp) {
  console.error('拒绝推送：HEAD 没有 stamp。先跑 node tools/gate.mjs。');
  process.exit(1);
}

const push = capture('git', ['push', '--follow-tags', 'origin', branch.out || 'main']);
process.stdout.write(push.stdout);
process.stderr.write(push.stderr);
if (push.status === 0) {
  console.log('推送成功。');
  process.exit(0);
}
console.error(`推送失败（退出码 ${push.status}）。按上面的通道结论换路径；不要用 --no-verify 绕过。`);
process.exit(1);
