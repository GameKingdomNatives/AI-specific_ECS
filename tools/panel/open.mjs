import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const file = resolve(join(process.cwd(), 'tools', 'panel', 'panel.html'));
if (!existsSync(file)) {
  console.error('缺少 tools/panel/panel.html');
  process.exit(1);
}
spawnSync('cmd', ['/c', 'start', '', file], { stdio: 'ignore', windowsHide: true, detached: true });
console.log(`已请求浏览器打开：${file}`);
