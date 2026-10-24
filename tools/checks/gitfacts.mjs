import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RUN = process.argv[2] ?? join('artifacts', 'gate', 'manual');
const errors = [];
mkdirSync(join(ROOT, RUN), { recursive: true });

function gitToFile(args, target) {
  const fd = openSync(join(ROOT, target), 'w');
  const result = spawnSync('git', args, { cwd: ROOT, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  if (result.error !== undefined) {
    errors.push(`git ${args.join(' ')} 启动失败：${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

function gitLines(args, label) {
  const target = join(RUN, 'git-capture.txt');
  const code = gitToFile(args, target);
  if (code !== 0) {
    errors.push(`${label}：git ${args.join(' ')} 退出码 ${code}（不能当作“无待推送提交”）`);
    return [];
  }
  return readFileSync(join(ROOT, target), 'utf8').split('\n').filter(Boolean);
}

gitToFile(['status', '--porcelain'], join(RUN, 'git-status.txt'));
gitToFile(['rev-parse', 'HEAD'], join(RUN, 'head.txt'));

const hasHead = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: ROOT, stdio: 'ignore' }).status === 0;
const changed = [
  ...new Set([
    ...(hasHead ? gitLines(['diff', '--name-only', 'HEAD'], '工作区 diff 读取失败') : []),
    ...gitLines(['diff', '--cached', '--name-only'], '暂存区 diff 读取失败'),
  ]),
];

const PROTECTED = /^(tools\/|\.githooks\/|eslint\.config\.mjs|tsconfig.*\.json|\.dependency-cruiser\.cjs|package\.json|\.npmrc)/;
const touched = changed.filter((path) => PROTECTED.test(path));
if (touched.length > 0 && process.env.ALLOW_PROTECTED !== '1') {
  errors.push(`受保护路径被修改（需人工批准）：\n  ${touched.join('\n  ')}`);
}

const BANNED = ['@ts-ignore', 'test.skip', 'test.todo', '.only('];
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}
for (const file of [...walk('packages/engine/src'), ...walk('apps/game/src')]) {
  const source = readFileSync(file, 'utf8');
  for (const marker of BANNED) {
    if (source.includes(marker)) errors.push(`${relative(ROOT, file)}: 出现禁用标记 ${marker}`);
  }
}

const hasRemote = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, stdio: 'ignore' }).status === 0;
if (hasRemote) {
  const upstream = gitLines(['rev-parse', '--verify', 'origin/main'], '无法确定上游 origin/main');
  if (upstream.length === 0) {
    errors.push('无法确定上游 origin/main；拒绝把“未盖章提交”校验当成通过');
  } else {
    const base = upstream[0];
    const headLine = existsSync(join(ROOT, RUN, 'head.txt')) ? readFileSync(join(ROOT, RUN, 'head.txt'), 'utf8').trim() : '';
    const pending = gitLines(['rev-list', `${base}..HEAD`], '待推送提交读取失败');
    for (const sha of pending) {
      // 当前 HEAD 正在被这次 gate 校验；它的 stamp 由本次成功运行写入，不能先要求已有 stamp。
      if (sha === headLine) continue;
      if (!existsSync(join(ROOT, '.gate', 'stamps', `${sha}.json`))) {
        errors.push(`stamp 缺失：${sha} 没有通过全量门禁的记录`);
      }
    }
  }
} else {
  console.log('[stamp 链] 未配置远端，跳过待推送校验（记录在案，不假装已校验）');
}

if (errors.length > 0) {
  console.error(`git 事实检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
writeFileSync(join(ROOT, RUN, 'gitfacts.ok'), 'ok\n');
console.log('git 事实检查通过');
