import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 校验程序化生成的贴图：签名、尺寸与清单一致，且不是空图。 */
const ROOT = process.cwd();
const OUT = join(ROOT, 'apps', 'game', 'public', 'assets');
const errors = [];

if (!existsSync(join(OUT, 'manifest.json'))) {
  console.error('缺少 manifest.json：先运行 node tools/gen-assets.mjs');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
  errors.push('manifest.assets 为空');
}

for (const asset of manifest.assets ?? []) {
  const file = join(OUT, asset.file);
  if (!existsSync(file)) {
    errors.push(`${asset.file} 不存在`);
    continue;
  }
  const buffer = readFileSync(file);
  const signature = [0x89, 0x50, 0x4e, 0x47];
  if (!signature.every((byte, index) => buffer[index] === byte)) {
    errors.push(`${asset.file} 不是合法 PNG`);
    continue;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== asset.width || height !== asset.height) {
    errors.push(`${asset.file} 尺寸 ${width}×${height} 与清单 ${asset.width}×${asset.height} 不一致`);
  }
  if (buffer.length < 100) {
    errors.push(`${asset.file} 只有 ${buffer.length} 字节，疑似空图`);
  }
}

if (errors.length > 0) {
  console.error(`贴图校验失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`贴图校验通过：${manifest.assets.length} 张（${manifest.assets.map((asset) => `${asset.name} ${asset.width}×${asset.height}`).join('，')}）`);
