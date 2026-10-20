import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FAST = process.argv.includes('--fast');
const RUN = join('artifacts', 'gate', new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z'));
mkdirSync(join(ROOT, RUN), { recursive: true });
mkdirSync(join(ROOT, '.gate', 'stamps'), { recursive: true });
process.env.GATE_RUN = RUN;

const codes = [];

function execute(cmd, args) {
  const logPath = join(ROOT, RUN, 'tmp.log');
  const fd = openSync(logPath, 'w');
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  return { code: result.status ?? 1, text: readFileSync(logPath, 'utf8') };
}

function step(name, cmd, args, cwd = ROOT) {
  const logPath = join(ROOT, RUN, `${name}.log`);
  const fd = openSync(logPath, 'w');
  const result = spawnSync(cmd, args, { cwd, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  const code = result.status ?? 1;
  codes.push({ name, code });
  console.log(`${name.padEnd(10)} ${code === 0 ? 'PASS' : 'FAIL'}`);
  if (code !== 0) {
    const text = readFileSync(logPath, 'utf8').split('\n').slice(-12).join('\n');
    console.log(text);
  }
  return code;
}

function runTests() {
  const dir = join(ROOT, 'packages', 'engine', 'dist', 'tests');
  if (!existsSync(dir)) {
    codes.push({ name: 'tests', code: 1 });
    console.log('tests      FAIL 未找到编译后的测试目录');
    return 1;
  }
  const files = readdirSync(dir).filter((file) => file.endsWith('.test.js'));
  let failed = 0;
  for (const file of files) {
    const code = step(`test-${file.replace('.test.js', '')}`, process.execPath, [join(dir, file)]);
    if (code !== 0) failed += 1;
  }
  if (files.length === 0) {
    codes.push({ name: 'tests', code: 1 });
    console.log('tests      FAIL 没有测试文件');
    return 1;
  }
  console.log(`tests      ${failed === 0 ? 'PASS' : 'FAIL'}（${files.length} 个文件）`);
  return failed === 0 ? 0 : 1;
}

step('tsc', process.execPath, ['node_modules/typescript/bin/tsc', '-b']);
step('eslint', process.execPath, ['node_modules/eslint/bin/eslint.js', '.', '-f', 'json', '-o', join(RUN, 'eslint.json')]);
step('registry', process.execPath, ['tools/checks/registry.mjs']);
runTests();
step('gitfacts', process.execPath, ['tools/checks/gitfacts.mjs', RUN]);
if (!FAST) {
  step('depcruise', process.execPath, [
    'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
    '--output-type',
    'json',
  ]);
}
step('findings', process.execPath, ['tools/checks/findings.mjs', RUN]);
step('build', process.execPath, [
  join(ROOT, 'node_modules/vite/bin/vite.js'),
  'build',
  '--logLevel',
  'warn',
], join(ROOT, 'apps', 'game'));
step('bench', process.execPath, ['tools/bench.mjs', '--entities', '3000', '--ticks', '200']);

writeFileSync(join(ROOT, RUN, 'codes.txt'), `${codes.map((c) => `${c.name} ${c.code}`).join('\n')}\n`);
const report = execute(process.execPath, ['tools/report.mjs', RUN]);
process.stdout.write(report.text);
const ok = codes.every((c) => c.code === 0) && report.code === 0;

if (ok && !FAST) {
  const head = execute('git', ['rev-parse', '--verify', 'HEAD']);
  const raw = head.text.trim();
  const sha = /^[0-9a-f]{40}$/.test(raw) ? raw : 'uncommitted';
  writeFileSync(
    join(ROOT, '.gate', 'stamps', `${sha}.json`),
    `${JSON.stringify({ head: sha, run: RUN, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log(`stamp 已写入 .gate/stamps/${sha}.json`);
}

process.exit(ok ? 0 : 1);
