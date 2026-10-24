import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RUN = process.argv[2] ?? join('artifacts', 'gate', 'manual');
const findings = [];
const errors = [];

function snippetOf(file, line) {
  const full = join(ROOT, file);
  if (!existsSync(full) || line < 1) return '';
  const lines = readFileSync(full, 'utf8').split('\n');
  const start = Math.max(0, line - 2);
  return lines
    .slice(start, line + 1)
    .map((text, index) => `${String(start + index + 1).padStart(4)} | ${text}`)
    .join('\n');
}

function lineOf(file, needle) {
  const full = join(ROOT, file);
  if (!existsSync(full)) return 0;
  const lines = readFileSync(full, 'utf8').split('\n');
  const index = lines.findIndex((text) => text.includes(needle));
  return index < 0 ? 0 : index + 1;
}

function ruleSourceFor(tool, ruleId) {
  if (tool === 'eslint') {
    const line = lineOf('eslint.config.mjs', `'${ruleId}'`);
    return { file: 'eslint.config.mjs', line, kind: '规则配置' };
  }
  if (tool === 'depcruise') {
    const line = lineOf('.dependency-cruiser.cjs', `name: '${ruleId}'`);
    return { file: '.dependency-cruiser.cjs', line, kind: '规则配置' };
  }
  if (tool === 'tsc') {
    return { file: 'tsconfig.base.json', line: 0, kind: '编译选项' };
  }
  return { file: 'tools/checks/registry.mjs', line: 0, kind: '自定义校验' };
}

function push(finding) {
  findings.push({
    ...finding,
    snippet: snippetOf(finding.file, finding.line),
    ruleSource: ruleSourceFor(finding.tool, finding.ruleId),
  });
}

function readJson(file, required) {
  const full = join(ROOT, file);
  if (!existsSync(full)) {
    if (required) errors.push(`缺少输入 ${file}，不能当作“没有诊断”`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    const raw = readFileSync(full, 'utf8');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        /* 落到下面的错误 */
      }
    }
    errors.push(`${file} 不是合法 JSON；解析失败必须判红，不能静默跳过`);
    return null;
  }
}

const fullGate = process.env.GATE_MODE !== 'fast';
const eslint = readJson(join(RUN, 'eslint.json'), true);
if (Array.isArray(eslint)) {
  for (const result of eslint) {
    for (const message of result.messages ?? []) {
      if (message.severity === 0) continue;
      push({
        tool: 'eslint',
        ruleId: message.ruleId ?? 'eslint',
        severity: message.severity === 2 ? 'error' : 'warning',
        file: relative(ROOT, result.filePath).replaceAll('\\', '/'),
        line: message.line ?? 0,
        column: message.column ?? 0,
        message: message.message,
      });
    }
  }
}

const depcruise = readJson(join(RUN, 'depcruise.json'), fullGate);
if (depcruise !== null && Array.isArray(depcruise.summary?.violations)) {
  for (const violation of depcruise.summary.violations) {
    push({
      tool: 'depcruise',
      ruleId: violation.rule?.name ?? 'dependency-rule',
      severity: violation.rule?.severity ?? 'error',
      file: String(violation.from ?? '').replaceAll('\\', '/'),
      line: 1,
      column: 0,
      message: `${violation.rule?.comment ?? ''} → ${violation.to ?? ''}`,
    });
  }
} else if (depcruise !== null) {
  errors.push(`${join(RUN, 'depcruise.json')} 缺少 summary.violations；不能当作零违规`);
}

const tscLog = join(ROOT, RUN, 'tsc.log');
if (existsSync(tscLog)) {
  for (const raw of readFileSync(tscLog, 'utf8').split('\n')) {
    const match = raw.match(/^(.+?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/);
    if (match === null) continue;
    push({
      tool: 'tsc',
      ruleId: match[5] ?? 'tsc',
      severity: match[4] ?? 'error',
      file: String(match[1]).replaceAll('\\', '/'),
      line: Number(match[2]),
      column: Number(match[3]),
      message: match[6] ?? '',
    });
  }
}

const registry = readJson(join(RUN, 'registry.findings.json'), true);
if (Array.isArray(registry)) {
  for (const finding of registry) {
    push({ ...finding, severity: finding.severity ?? 'error' });
  }
} else if (registry !== null) {
  errors.push(`${join(RUN, 'registry.findings.json')} 不是数组；不能当作零发现`);
}

writeFileSync(join(ROOT, RUN, 'findings.json'), `${JSON.stringify(findings, null, 2)}\n`);
console.log(`诊断条目：${findings.length}`);
for (const finding of findings.slice(0, 20)) {
  console.log(`  ${finding.file}:${finding.line}:${finding.column}  [${finding.ruleId}]  ${finding.message}`);
}
if (errors.length > 0) {
  console.error(`findings 输入失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
if (findings.length > 0) {
  console.error(`findings 非空：${findings.length} 条（warning 也算失败，禁止“警告通过”）`);
  process.exit(1);
}
console.log('findings 通过：0 条');
