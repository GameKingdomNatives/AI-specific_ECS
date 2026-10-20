import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const BUDGET = JSON.parse(readFileSync(join(ROOT, 'tools/quality-budget.json'), 'utf8'));
const SCAN_DIRS = ['packages/engine/src', 'packages/engine/tests', 'apps/game/src'];
const SKIP_LINT_DIRS = ['packages/engine/tests'];
const errors = [];

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

function checkFile(file) {
  const source = readFileSync(file, 'utf8');
  const relativePath = relative(ROOT, file).replaceAll('\\', '/');
  const lines = source.split('\n').length;
  if (lines > BUDGET.fileLines) {
    errors.push(`${relativePath}: 文件 ${lines} 行，超过预算 ${BUDGET.fileLines}`);
  }
  if (SKIP_LINT_DIRS.some((dir) => relativePath.startsWith(dir))) return;
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isFunctionLike(node) && node.body !== undefined) {
      const start = parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line;
      const end = parsed.getLineAndCharacterOfPosition(node.getEnd()).line;
      const length = end - start + 1;
      if (length > BUDGET.functionLines) {
        errors.push(`${relativePath}: 函数 ${node.name?.getText(parsed) ?? '<anonymous>'} ${length} 行，超过预算 ${BUDGET.functionLines}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
}

function checkBannedMarkers(files) {
  for (const file of files) {
    const relativePath = relative(ROOT, file).replaceAll('\\', '/');
    if (relativePath.startsWith('packages/engine/tests')) continue;
    const source = readFileSync(file, 'utf8');
    for (const marker of ['@ts-ignore', 'test.skip', 'test.todo']) {
      if (source.includes(marker)) errors.push(`${relativePath}: 出现禁用标记 ${marker}`);
    }
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
    errors.push('端口契约已变化：修改端口属 HARD，需人工批准后运行 `node tools/checks/registry.mjs --accept-ports`');
  }
}

function checkSystemContractTests() {
  const systems = walk(join(ROOT, 'packages/engine/src/demo'));
  const tests = walk(join(ROOT, 'packages/engine/tests')).map((file) => file.replaceAll('\\', '/'));
  for (const system of systems) {
    const name = system.split(/[\\/]/).pop().replace('.ts', '');
    if (name === 'index') continue;
    const hasContract = tests.some((file) => file.includes(`${name}.contract.test`));
    if (!hasContract) {
      errors.push(`系统文件 ${name} 缺少对应的 ${name}.contract.test.ts`);
    }
  }
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
for (const file of files) checkFile(file);
checkBannedMarkers(files);
if (process.argv.includes('--accept-ports')) {
  writeFileSync(join(ROOT, 'tools/port-contract.json'), `${JSON.stringify({ sha256: portContractHash() }, null, 2)}\n`);
  console.log('端口契约基线已更新');
} else {
  checkPortContract();
}
checkSystemContractTests();

if (errors.length > 0) {
  console.error(`自定义校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
mkdirSync(join(ROOT, 'artifacts'), { recursive: true });
console.log(`自定义校验通过：${files.length} 个文件，预算 ${BUDGET.fileLines} 行／函数 ${BUDGET.functionLines} 行`);
