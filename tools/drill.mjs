import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';

/**
 * 违规演练：故意制造「绕过门禁」的现场，确认门禁真的会红。
 * 全部在 finally 里清理，不把脏文件留在工作区。
 */
const GATE = 'tools/gate.mjs';
const GATE_ORIGINAL = readFileSync(GATE, 'utf8');
const HARNESS = 'contracts/harness.json';
const HARNESS_ORIGINAL = readFileSync(HARNESS, 'utf8');
const MAIN = 'apps/game/src/main.ts';
const MAIN_ORIGINAL = readFileSync(MAIN, 'utf8');
const API_DECL = 'packages/engine/dist/src/index.d.ts';
const API_DECL_ORIGINAL = readFileSync(API_DECL, 'utf8');
const CAPS = 'contracts/capabilities.json';
const CAPS_ORIGINAL = readFileSync(CAPS, 'utf8');
const LOCK = 'package-lock.json';
const LOCK_ORIGINAL = readFileSync(LOCK, 'utf8');
const AGENT = 'contracts/agent.json';
const AGENT_ORIGINAL = readFileSync(AGENT, 'utf8');
const EXPORT = 'contracts/export-policy.json';
const EXPORT_ORIGINAL = readFileSync(EXPORT, 'utf8');
const ENGINE_JS = 'packages/engine/dist/src/engine.js';
const ENGINE_JS_ORIGINAL = readFileSync(ENGINE_JS, 'utf8');
const TEST = 'packages/fixture/tests/hit.contract.test.ts';
const HIDDEN_TEST = 'packages/fixture/tests/__drill_hidden.ts.bak';
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
    file: 'packages/fixture/src/__drill_long.ts',
    content: `${'// drill padding\n'.repeat(310)}export const drill = true;\n`,
    command: ['tools/checks/registry.mjs'],
    expect: '预算',
  },
  {
    name: '类型逃逸：as any',
    file: 'packages/fixture/src/__drill_any.ts',
    content: 'export const drill = (value: unknown): unknown => value as any;\n',
    command: ['node_modules/eslint/bin/eslint.js', 'packages/fixture/src/__drill_any.ts'],
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
    name: '系统直改结构',
    file: 'packages/fixture/src/__drill_structure.ts',
    content: 'export const drill = (ctx: { world: { spawn: () => void } }): void => {\n  ctx.world.spawn();\n};\n',
    command: ['tools/checks/system-structure.mjs'],
    expect: '结构变更',
  },
  {
    name: '删系统卡',
    mutate: () => {
      renameSync('docs/systems/demo-hit.md', 'docs/systems/__drill_card.bak');
    },
    restore: () => {
      if (existsSync('docs/systems/__drill_card.bak')) {
        renameSync('docs/systems/__drill_card.bak', 'docs/systems/demo-hit.md');
      }
    },
    command: ['tools/checks/harness.mjs'],
    expect: '系统卡不存在',
  },
  {
    name: '删规则字段',
    mutate: () => {
      const table = JSON.parse(HARNESS_ORIGINAL);
      delete table.rules[0].negativeTest;
      writeFileSync(HARNESS, `${JSON.stringify(table, null, 2)}\n`);
    },
    restore: () => {
      writeFileSync(HARNESS, HARNESS_ORIGINAL);
    },
    command: ['tools/checks/harness.mjs'],
    expect: '缺少字段 negativeTest',
  },
  {
    name: '热路径发事件',
    file: 'packages/fixture/src/__drill_hot.ts',
    content: 'export function createMovementSystem(): void {\n  ctx.bus.emit("drill", {});\n}\n',
    command: ['tools/checks/hot-path.mjs'],
    expect: '热路径系统',
  },
  {
    name: '删预算告警',
    mutate: () => {
      writeFileSync(MAIN, MAIN_ORIGINAL.replaceAll('findBudgetBreach', 'removedBudgetCheck'));
    },
    restore: () => {
      writeFileSync(MAIN, MAIN_ORIGINAL);
    },
    command: ['tools/checks/perf-budget.mjs'],
    expect: '预算告警',
  },
  {
    name: '改API声明',
    mutate: () => {
      writeFileSync(API_DECL, `${API_DECL_ORIGINAL}\n// drill api drift\n`);
    },
    restore: () => {
      writeFileSync(API_DECL, API_DECL_ORIGINAL);
    },
    command: ['tools/checks/api-surface.mjs'],
    expect: 'API surface changed',
  },
  {
    name: '删能力条目',
    mutate: () => {
      const table = JSON.parse(CAPS_ORIGINAL);
      table.systems = table.systems.filter((system) => system.id !== 'demo.hit');
      writeFileSync(CAPS, `${JSON.stringify(table, null, 2)}\n`);
    },
    restore: () => {
      writeFileSync(CAPS, CAPS_ORIGINAL);
    },
    command: ['tools/checks/capabilities.mjs'],
    expect: '缺少能力条目',
  },
  {
    name: '删系统Spec',
    mutate: () => {
      const table = JSON.parse(CAPS_ORIGINAL);
      delete table.systems[0].spec;
      writeFileSync(CAPS, `${JSON.stringify(table, null, 2)}\n`);
    },
    restore: () => {
      writeFileSync(CAPS, CAPS_ORIGINAL);
    },
    command: ['tools/checks/capabilities.mjs'],
    expect: '缺少 spec',
  },
  {
    name: '删发布入口',
    mutate: () => {
      unlinkSync(ENGINE_JS);
    },
    restore: () => {
      writeFileSync(ENGINE_JS, ENGINE_JS_ORIGINAL);
    },
    command: ['tools/checks/package-surface.mjs'],
    expect: '缺少发布入口',
  },
  {
    name: '改依赖锁',
    mutate: () => {
      writeFileSync(LOCK, `${LOCK_ORIGINAL}\n`);
    },
    restore: () => {
      writeFileSync(LOCK, LOCK_ORIGINAL);
    },
    command: ['tools/checks/gitfacts.mjs', DRILL_RUN],
    expect: '受保护路径',
  },
  {
    name: '回退手写五件套',
    mutate: () => {
      writeFileSync(MAIN, `${MAIN_ORIGINAL}\nconst rollback = new World();\n`);
    },
    restore: () => {
      writeFileSync(MAIN, MAIN_ORIGINAL);
    },
    command: ['tools/checks/app-bootstrap.mjs'],
    expect: '禁止',
  },
  {
    name: '删Agent入口',
    mutate: () => {
      const contract = JSON.parse(AGENT_ORIGINAL);
      delete contract.entrypoints;
      writeFileSync(AGENT, `${JSON.stringify(contract, null, 2)}\n`);
    },
    restore: () => {
      writeFileSync(AGENT, AGENT_ORIGINAL);
    },
    command: ['tools/checks/agent-contract.mjs'],
    expect: '缺少 entrypoints',
  },
  {
    name: '删导出策略',
    mutate: () => {
      const policy = JSON.parse(EXPORT_ORIGINAL);
      delete policy.runtimeKernel;
      writeFileSync(EXPORT, `${JSON.stringify(policy, null, 2)}\n`);
    },
    restore: () => {
      writeFileSync(EXPORT, EXPORT_ORIGINAL);
    },
    command: ['tools/checks/export-policy.mjs'],
    expect: '缺少 runtimeKernel',
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
