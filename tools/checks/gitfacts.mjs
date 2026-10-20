import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RUN = process.argv[2] ?? join('artifacts', 'gate', 'manual');
const errors = [];

function gitToFile(args, target) {
  const fd = openSync(join(ROOT, target), 'w');
  const result = spawnSync('git', args, { cwd: ROOT, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  return result.status ?? 1;
}

gitToFile(['status', '--porcelain'], join(RUN, 'git-status.txt'));
gitToFile(['rev-parse', 'HEAD'], join(RUN, 'head.txt'));

function gitList(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? (result.stdout ?? '').split('\n').filter(Boolean) : [];
}

const hasHead = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: ROOT, stdio: 'ignore' }).status === 0;
const changed = [
  ...new Set([
    ...(hasHead ? gitList(['diff', '--name-only', 'HEAD']) : []),
    ...gitList(['diff', '--cached', '--name-only']),
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
  const pending = spawnSync('git', ['rev-list', 'origin/HEAD..HEAD'], { cwd: ROOT, encoding: 'utf8' });
  const shas = (pending.stdout ?? '').split('\n').filter(Boolean);
  for (const sha of shas) {
    if (!existsSync(join(ROOT, '.gate', 'stamps', `${sha}.json`))) {
      errors.push(`stamp 缺失：${sha} 没有通过全量门禁的记录`);
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
