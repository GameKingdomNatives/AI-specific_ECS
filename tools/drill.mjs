import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';

/**
 * 违规演练：故意制造「绕过门禁」的现场，确认门禁真的会红。
 * 全部在 finally 里清理，不把脏文件留在工作区。
 */
const GATE = 'tools/gate.mjs';
const GATE_ORIGINAL = readFileSync(GATE, 'utf8');
const TEST = 'packages/engine/tests/hit.contract.test.ts';
const HIDDEN_TEST = 'packages/engine/tests/__drill_hidden.ts.bak';
const DRILL_RUN = 'artifacts/gate/__drill';

const DRILLS = [
  {
    name: '越界 import：core → impl',
    file: 'packages/engine/src/core/__drill_violation.ts',
    content: "import { PhysicsWorld } from '../impl/physics.js';\n\nexport const drill = PhysicsWorld;\n",
    command: ['tools/checks/depcruise.mjs', DRILL_RUN],
    expect: '依赖边界',
  },
  {
    name: '文件超预算：>300 行',
    file: 'packages/engine/src/demo/__drill_long.ts',
    content: `${'// drill padding\n'.repeat(310)}export const drill = true;\n`,
    command: ['tools/checks/registry.mjs'],
    expect: '预算',
  },
  {
    name: '类型逃逸：as any',
    file: 'packages/engine/src/demo/__drill_any.ts',
    content: 'export const drill = (value: unknown): unknown => value as any;\n',
    command: ['node_modules/eslint/bin/eslint.js', 'packages/engine/src/demo/__drill_any.ts'],
    expect: 'no-explicit-any',
  },
  {
    name: '删测试：移走契约测试',
    mutate: () => {
      renameSync(TEST, HIDDEN_TEST);
    },
    restore: () => {
      if (existsSync(HIDDEN_TEST)) {
        renameSync(HIDDEN_TEST, TEST);
      }
    },
    command: ['tools/checks/registry.mjs'],
    expect: '少于基线',
  },
  {
    name: '改阈值：动受保护脚本',
    mutate: () => {
      mkdirSync(DRILL_RUN, { recursive: true });
      writeFileSync(GATE, `${GATE_ORIGINAL}\n// drill threshold\n`);
    },
    restore: () => {
      writeFileSync(GATE, GATE_ORIGINAL);
    },
    command: ['tools/checks/gitfacts.mjs', DRILL_RUN],
    expect: '受保护路径',
  },
];

const results = [];
const env = { ...process.env };
delete env.GATE_RUN;
delete env.ALLOW_PROTECTED;
for (const drill of DRILLS) {
  const existed = drill.file === undefined ? false : existsSync(drill.file);
  try {
    if (drill.mutate === undefined) {
      writeFileSync(drill.file, drill.content);
    } else {
      drill.mutate();
    }
    const run = spawnSync(process.execPath, drill.command, { encoding: 'utf8', env });
    const started = run.error === undefined && run.status !== null;
    results.push({
      name: drill.name,
      started,
      caught: started && run.status !== 0,
      expect: drill.expect,
      text: `${run.stdout ?? ''}${run.stderr ?? ''}`,
    });
  } finally {
    if (drill.restore !== undefined) {
      drill.restore();
    } else if (drill.file !== undefined && existsSync(drill.file) && !existed) {
      unlinkSync(drill.file);
    }
  }
}

for (const result of results) {
  const matched = result.started && result.caught && result.text.includes(result.expect);
  const label = !result.started ? '没跑起来 FAIL' : matched ? '拦住了 PASS' : '漏过去了 FAIL';
  console.log(`${result.name.padEnd(28)} ${label}（命中「${result.expect}」=${matched}）`);
}
process.exit(results.every((result) => result.started && result.caught && result.text.includes(result.expect)) ? 0 : 1);
