import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { capture } from './spawn-capture.mjs';

/**
 * 依赖边界检查包装器。
 * 坑：dependency-cruiser 用 `--output-type json` 时即使有违规也退出 0，
 * 直接看退出码会永远绿。这里解析 JSON 的 summary.violations 判定。
 * 解析失败（例如只打印了 Usage）同样算失败，不允许静默空转。
 */
const RUN = process.argv[2];
const ROOT = process.cwd();

const result = capture(process.execPath, [
  'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
  '--output-type',
  'json',
  '.',
]);

const output = result.stdout ?? '';
if (RUN !== undefined) {
  writeFileSync(join(ROOT, RUN, 'depcruise.json'), output);
}

let violations = -1;
try {
  const parsed = JSON.parse(output);
  if (Array.isArray(parsed.summary?.violations)) {
    violations = parsed.summary.violations.length;
  }
} catch {
  violations = -1;
}

if (violations < 0) {
  console.error('依赖边界检查没有产出可解析的 JSON（可能只打印了 Usage）——按失败处理');
  console.error((result.stderr ?? '').split('\n').slice(-6).join('\n'));
  process.exit(1);
}

if (violations > 0) {
  console.error(`依赖边界违规 ${violations} 项：`);
  try {
    for (const violation of JSON.parse(output).summary.violations.slice(0, 10)) {
      console.error(`  ${violation.rule?.name ?? '?'}: ${violation.from} → ${violation.to}`);
    }
  } catch {
    console.error('  （无法列出详情，见 depcruise.log）');
  }
  process.exit(1);
}

console.log('依赖边界检查通过（0 违规）');
process.exit(0);
