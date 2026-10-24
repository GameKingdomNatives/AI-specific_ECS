#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TEMP = join(ROOT, 'artifacts', 'pack-smoke');
const ENGINE = join(ROOT, 'packages', 'engine');
const errors = [];

rmSync(TEMP, { recursive: true, force: true });
mkdirSync(TEMP, { recursive: true });

const pack = spawnSync('npm', ['pack', '--pack-destination', TEMP, '--silent'], {
  cwd: ENGINE,
  encoding: 'utf8',
  shell: true,
});
if (pack.status !== 0) {
  console.error(`pack smoke 失败：npm pack 退出码 ${pack.status ?? 1}`);
  process.exit(1);
}
const tarball = readdirSync(TEMP).find((file) => file.endsWith('.tgz'));
if (tarball === undefined) {
  console.error('pack smoke 失败：没有产出 tgz');
  process.exit(1);
}

const pkgDir = join(TEMP, 'node_modules', '@itb', 'engine');
mkdirSync(pkgDir, { recursive: true });
const extract = spawnSync('tar', ['-xzf', tarball, '-C', 'node_modules/@itb/engine', '--strip-components=1'], {
  cwd: TEMP,
  encoding: 'utf8',
});
if (extract.status !== 0) {
  console.error(`pack smoke 失败：解包退出码 ${extract.status ?? 1}`);
  console.error((extract.stderr ?? '').slice(-500));
  process.exit(1);
}

writeFileSync(join(TEMP, 'package.json'), '{"type":"module"}\n');
writeFileSync(
  join(TEMP, 'smoke.mjs'),
  [
    "import { createEngine } from '@itb/engine';",
    'const engine = createEngine({ fixedStepMs: 10 });',
    'let ticks = 0;',
    "engine.add({ name: 'pack', phase: 'movement', reads: [], writes: [], update: () => { ticks += 1; } });",
    'engine.step();',
    'if (engine.clock.tick !== 1 || ticks !== 1) throw new Error(`bad state ${engine.clock.tick}/${ticks}`);',
    'engine.advance(20);',
    'if (engine.clock.tick < 3) throw new Error(`advance failed ${engine.clock.tick}`);',
    'engine.dispose();',
    "console.log('pack smoke PASS');",
    '',
  ].join('\n'),
);

const run = spawnSync(process.execPath, [join(TEMP, 'smoke.mjs')], { cwd: TEMP, encoding: 'utf8' });
if (run.status !== 0) errors.push(`consumer 退出码 ${run.status ?? 1}：${(run.stderr ?? run.stdout ?? '').slice(0, 500)}`);
if (!(run.stdout ?? '').includes('pack smoke PASS')) errors.push('consumer 没有打印 PASS');
for (const path of ['package.json', 'dist/src/index.js', 'dist/src/engine.js']) {
  if (!existsSync(join(pkgDir, path))) errors.push(`解包后缺少 ${path}`);
}
rmSync(TEMP, { recursive: true, force: true });

if (errors.length > 0) {
  console.error(`pack smoke 失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`pack smoke PASS：${tarball} 从 tarball 解包后可消费`);
