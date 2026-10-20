import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const BUDGET = JSON.parse(readFileSync(join(ROOT, 'tools/quality-budget.json'), 'utf8'));
const SCAN_DIRS = ['packages/engine/src', 'packages/engine/tests', 'apps/game/src'];
const SKIP_BUDGET_DIRS = ['packages/engine/tests'];
const findings = [];

function add(ruleId, file, line, column, message) {
  findings.push({ tool: 'registry', ruleId, severity: 'error', file, line, column, message });
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

function safeRelative(file) {
  return relative(ROOT, file).replaceAll('\\', '/');
}

function checkBudgets(file, relativePath) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n').length;
  if (lines > BUDGET.fileLines) {
    add('file-budget', relativePath, 1, 0, `文件 ${lines} 行，超过预算 ${BUDGET.fileLines}`);
  }
  if (SKIP_BUDGET_DIRS.some((dir) => relativePath.startsWith(dir))) return;
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isFunctionLike(node) && node.body !== undefined) {
      const start = parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line;
      const end = parsed.getLineAndCharacterOfPosition(node.getEnd()).line;
      const length = end - start + 1;
      if (length > BUDGET.functionLines) {
        const name = node.name?.getText(parsed) ?? '<anonymous>';
        add('function-budget', relativePath, start + 1, 0, `函数 ${name} ${length} 行，超过预算 ${BUDGET.functionLines}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
}

function checkBannedMarkers(files) {
  const markers = ['@ts-ignore', 'test.skip', 'test.todo'];
  for (const file of files) {
    const relativePath = safeRelative(file);
    if (relativePath.startsWith('packages/engine/tests')) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const marker of markers) {
        if (line.includes(marker)) add('banned-marker', relativePath, index + 1, 0, `出现禁用标记 ${marker}`);
      }
    });
  }
}

function portContractHash() {
  const file = join(ROOT, 'packages/engine/src/ports/index.ts');
  return createHash('sha256').update(readFileSync(file, 'utf8')).digest('hex');
}

function checkPortContract() {
  const target = join(ROOT, 'tools/port-contract.json');
  const current = portContractHash();
  if (!existsSync(target)) {
    writeFileSync(target, `${JSON.stringify({ sha256: current }, null, 2)}\n`);
    console.log('端口契约基线已写入 tools/port-contract.json');
    return;
  }
  const saved = JSON.parse(readFileSync(target, 'utf8')).sha256;
  if (saved !== current) {
    add('port-contract', 'packages/engine/src/ports/index.ts', 1, 0,
      '端口契约已变化：属 HARD 变更，需人工批准后运行 node tools/checks/registry.mjs --accept-ports');
  }
}

function checkSystemContractTests() {
  const systems = walk(join(ROOT, 'packages/engine/src/demo')).filter((file) => !file.endsWith('index.ts'));
  const tests = walk(join(ROOT, 'packages/engine/tests')).map(safeRelative);
  for (const system of systems) {
    const name = system.split(/[\\/]/).pop().replace('.ts', '');
    if (!tests.some((file) => file.includes(`${name}.contract.test`))) {
      add('system-contract-test', safeRelative(system), 1, 0, `系统文件 ${name} 缺少 ${name}.contract.test.ts`);
    }
  }
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
for (const file of files) checkBudgets(file, safeRelative(file));
checkBannedMarkers(files);
if (process.argv.includes('--accept-ports')) {
  writeFileSync(join(ROOT, 'tools/port-contract.json'), `${JSON.stringify({ sha256: portContractHash() }, null, 2)}\n`);
  console.log('端口契约基线已更新');
} else {
  checkPortContract();
}
checkSystemContractTests();

const runDir = process.env.GATE_RUN;
if (runDir !== undefined) {
  mkdirSync(join(ROOT, runDir), { recursive: true });
  writeFileSync(join(ROOT, runDir, 'registry.findings.json'), `${JSON.stringify(findings, null, 2)}\n`);
}

if (findings.length > 0) {
  console.error(`自定义校验失败（${findings.length} 项）：`);
  for (const finding of findings) {
    console.error(`  - ${finding.file}:${finding.line}  [${finding.ruleId}]  ${finding.message}`);
  }
  process.exit(1);
}
console.log(`自定义校验通过：${files.length} 个文件，预算 ${BUDGET.fileLines} 行／函数 ${BUDGET.functionLines} 行`);
