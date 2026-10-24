import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FAST = process.argv.includes('--fast');
process.env.GATE_MODE = FAST ? 'fast' : 'full';
const RUN = join(
  'artifacts',
  'gate',
  `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z')}-${process.pid}-${Math.random().toString(36).slice(2, 7)}`,
);
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

function step(name, cmd, args, cwd = ROOT, env = process.env) {
  const logPath = join(ROOT, RUN, `${name}.log`);
  const fd = openSync(logPath, 'w');
  const result = spawnSync(cmd, args, { cwd, stdio: ['ignore', fd, fd], windowsHide: true, env });
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
  const dirs = [
    join(ROOT, 'packages', 'engine', 'dist', 'tests'),
    join(ROOT, 'packages', 'fixture', 'dist', 'tests'),
  ];
  const coverageDir = join(ROOT, RUN, 'coverage');
  mkdirSync(coverageDir, { recursive: true });
  const testEnv = { ...process.env, NODE_V8_COVERAGE: coverageDir };
  const entries = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.test.js'))) {
      entries.push({ dir, file });
    }
  }
  let failed = 0;
  for (const entry of entries) {
    const code = step(`test-${entry.file.replace('.test.js', '')}`, process.execPath, [join(entry.dir, entry.file)], ROOT, testEnv);
    if (code !== 0) failed += 1;
  }
  if (entries.length === 0) {
    codes.push({ name: 'tests', code: 1 });
    console.log('tests      FAIL 没有测试文件');
    return 1;
  }
  console.log(`tests      ${failed === 0 ? 'PASS' : 'FAIL'}（${entries.length} 个文件）`);
  return failed === 0 ? 0 : 1;
}

step('tsc', process.execPath, ['node_modules/typescript/bin/tsc', '-b']);
step('app-bootstrap', process.execPath, ['tools/checks/app-bootstrap.mjs']);
step('agent-contract', process.execPath, ['tools/checks/agent-contract.mjs']);
step('export-policy', process.execPath, ['tools/checks/export-policy.mjs']);
step('license', process.execPath, ['tools/checks/license.mjs']);
step('mcp-smoke', process.execPath, ['tools/checks/mcp-smoke.mjs']);
step('engine-standalone', process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'packages/engine/tsconfig.json', '--noEmit']);
step('api-surface', process.execPath, ['tools/checks/api-surface.mjs']);
step('package-surface', process.execPath, ['tools/checks/package-surface.mjs']);
step('pack-smoke', process.execPath, ['tools/checks/pack-smoke.mjs']);
step('eslint', process.execPath, ['node_modules/eslint/bin/eslint.js', '.', '-f', 'json', '-o', join(RUN, 'eslint.json')]);
step('registry', process.execPath, ['tools/checks/registry.mjs']);
step('harness', process.execPath, ['tools/checks/harness.mjs']);
step('capabilities', process.execPath, ['tools/checks/capabilities.mjs']);
step('system-structure', process.execPath, ['tools/checks/system-structure.mjs']);
step('hot-path', process.execPath, ['tools/checks/hot-path.mjs']);
step('perf-budget', process.execPath, ['tools/checks/perf-budget.mjs']);
runTests();
step('coverage', process.execPath, ['tools/coverage.mjs', join(RUN, 'coverage'), '0.7']);
step('replay', process.execPath, ['tools/replay.mjs', '--self-test', '--repeat', '3']);
step('gitfacts', process.execPath, ['tools/checks/gitfacts.mjs', RUN]);
if (!FAST) {
  step('depcruise', process.execPath, ['tools/checks/depcruise.mjs', RUN]);
  step('drill', process.execPath, ['tools/drill.mjs']);
}
step('findings', process.execPath, ['tools/checks/findings.mjs', RUN]);
step('build', process.execPath, [
  join(ROOT, 'node_modules/vite/bin/vite.js'),
  'build',
  '--logLevel',
  'warn',
], join(ROOT, 'apps', 'game'));
step('starter-smoke', process.execPath, ['tools/smoke/engine-starter.mjs']);
step('storybook', process.execPath, [
  join(ROOT, 'node_modules/storybook/dist/bin/dispatcher.js'),
  'build',
  '-o',
  join(ROOT, 'artifacts/storybook-static'),
  '--quiet',
], join(ROOT, 'apps', 'game'));
step('starter', process.execPath, [
  join(ROOT, 'node_modules/storybook/dist/bin/dispatcher.js'),
  'build',
  '-o',
  join(ROOT, 'artifacts/starter-storybook'),
  '--quiet',
], join(ROOT, 'starters', 'ui-storybook-kit'));
step('assets', process.execPath, ['tools/check-assets.mjs']);
step('bench', process.execPath, [
  'tools/bench.mjs',
  '--entities',
  '3000',
  '--ticks',
  '200',
  '--baseline',
  'tools/bench-baseline.json',
]);
step('render-bench', process.execPath, [
  'tools/render-bench.mjs',
  '--items',
  '10000',
  '--baseline',
  'tools/render-bench-baseline.json',
]);
step('submit-bench', process.execPath, [
  'tools/submit-bench.mjs',
  '--items',
  '3000',
  '--baseline',
  'tools/submit-bench-baseline.json',
]);

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
