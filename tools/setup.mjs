import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const RAW = process.versions.node.split('.').map(Number);
if ((RAW[0] ?? 0) < 22) {
  console.error(`需要 Node >= 22，当前 ${process.versions.node}`);
  process.exit(1);
}

const ls = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit', windowsHide: true });
for (const dir of ['artifacts/gate', 'artifacts/panel', '.gate/stamps', 'docs/adr']) {
  mkdirSync(dir, { recursive: true });
}

console.log(`Node      ${process.versions.node}`);
console.log(`钩子路径  ${spawnSync('git', ['config', 'core.hooksPath'], { encoding: 'utf8' }).stdout?.trim() ?? '-'}`);
console.log('');
console.log('下一步：');
console.log('  node tools/gate.mjs          全量门禁（首次会生成端口契约基线）');
console.log('  node tools/status.mjs        看当前状态');
console.log('  node tools/panel/collect.mjs 采集并生成治理面板数据');
void ls;
