#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const TASK = 'AI-specific_ECS-Nightly';
const args = process.argv.slice(2);
if (args.includes('--remove')) {
  const result = spawnSync('schtasks', ['/Delete', '/F', '/TN', TASK], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

const wrapper = join(ROOT, 'tools', 'nightly.cmd');
const action = `cmd.exe /c "${wrapper}"`;
const result = spawnSync(
  'schtasks',
  ['/Create', '/F', '/SC', 'DAILY', '/ST', '20:00', '/TN', TASK, '/TR', action],
  { stdio: 'inherit' },
);
if (result.status !== 0) {
  console.error('[nightly-install] 注册失败；请用 GitBash/管理员终端手动运行：');
  console.error(`schtasks /Create /F /SC DAILY /ST 20:00 /TN "${TASK}" /TR "${action}"`);
  process.exit(result.status ?? 1);
}

const query = spawnSync('schtasks', ['/Query', '/TN', TASK, '/FO', 'LIST'], { stdio: 'inherit' });
process.exit(query.status ?? 0);
