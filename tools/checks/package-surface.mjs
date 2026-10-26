#!/usr/bin/env node
import { capture } from './spawn-capture.mjs';

const ROOT = process.cwd();
const errors = [];

const packed = capture('npm.cmd', ['pack', '--dry-run', '--json'], {
  cwd: `${ROOT}/packages/engine`,
  shell: true,
});
if (packed.status !== 0) {
  console.error(`包面检查失败：npm pack 退出码 ${packed.status ?? 1}`);
  console.error((packed.stderr || packed.stdout || '').split('\n').slice(-5).join('\n'));
  process.exit(1);
}
let report;
try {
  const parsed = JSON.parse(packed.stdout);
  report = Array.isArray(parsed) ? parsed[0] : parsed;
} catch {
  console.error('包面检查失败：npm pack 没有输出可解析 JSON');
  console.error((packed.stdout || '').slice(-500));
  process.exit(1);
}
const files = report.files.map((entry) => entry.path);
const required = ['package.json', 'dist/src/index.js', 'dist/src/index.d.ts', 'dist/src/engine.js', 'docs/索引.md', 'docs/en/README.md', 'docs/zh/索引.md'];
for (const path of required) if (!files.includes(path)) errors.push(`缺少发布入口 ${path}`);
for (const path of files) {
  if (path.startsWith('src/') || path.startsWith('tests/') || path.startsWith('dist/tests/') || path === 'tsconfig.json') {
    errors.push(`发布包不应包含 ${path}`);
  }
}
if (errors.length > 0) {
  console.error(`包面检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`包面检查通过：${files.length} 个文件，dist/src + docs(en/zh) + package.json/README`);
