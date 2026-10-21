import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';

/**
 * 违规演练：故意制造三种「绕过门禁」的现场，确认门禁真的会红。
 * 全部在 finally 里清理，不把脏文件留在工作区。
 */
const DRILLS = [
  {
    name: '越界 import：core → impl',
    file: 'packages/engine/src/core/__drill_violation.ts',
    content: "import { PhysicsWorld } from '../impl/physics.js';\n\nexport const drill = PhysicsWorld;\n",
    command: [
      'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs',
      '-T',
      'err',
      '.',
    ],
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
];

const results = [];
const env = { ...process.env };
delete env.GATE_RUN;
for (const drill of DRILLS) {
  const existed = existsSync(drill.file);
  try {
    writeFileSync(drill.file, drill.content);
    const run = spawnSync(process.execPath, drill.command, { encoding: 'utf8', env });
    const caught = run.status !== 0;
    results.push({ name: drill.name, caught, exit: run.status });
  } finally {
    if (existsSync(drill.file) && !existed) {
      unlinkSync(drill.file);
    }
  }
}

for (const result of results) {
  console.log(`${result.name.padEnd(28)} ${result.caught ? '拦住了 PASS' : '漏过去了 FAIL'}（exit=${result.exit}）`);
}
process.exit(results.every((result) => result.caught) ? 0 : 1);
