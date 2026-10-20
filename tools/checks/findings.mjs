import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RUN = process.argv[2] ?? join('artifacts', 'gate', 'manual');
const findings = [];

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

function readJson(file) {
  const full = join(ROOT, file);
  if (!existsSync(full)) return null;
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

const eslint = readJson(join(RUN, 'eslint.json'));
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

const depcruise = readJson(join(RUN, 'depcruise.log'));
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

const registry = readJson(join(RUN, 'registry.findings.json'));
if (Array.isArray(registry)) {
  for (const finding of registry) {
    push({ ...finding, severity: finding.severity ?? 'error' });
  }
}

writeFileSync(join(ROOT, RUN, 'findings.json'), `${JSON.stringify(findings, null, 2)}\n`);
console.log(`诊断条目：${findings.length}`);
for (const finding of findings.slice(0, 20)) {
  console.log(`  ${finding.file}:${finding.line}:${finding.column}  [${finding.ruleId}]  ${finding.message}`);
}
