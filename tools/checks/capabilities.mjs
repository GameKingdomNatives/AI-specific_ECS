#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCENE_DIR = join(ROOT, 'apps', 'game', 'scenes');
const DEMO = join(SCENE_DIR, 'demo.scene.json');
const CAPS = join(ROOT, 'contracts', 'capabilities.json');
const errors = [];

if (!existsSync(DEMO)) errors.push('缺少 apps/game/scenes/demo.scene.json');
if (!existsSync(CAPS)) errors.push('缺少 contracts/capabilities.json');

/** 所有 scene 都参与校验：游戏场景与夹具场景并存，不能只认 demo。 */
const scenes = existsSync(SCENE_DIR)
  ? readdirSync(SCENE_DIR)
      .filter((file) => file.endsWith('.scene.json'))
      .map((file) => {
        const parsed = JSON.parse(readFileSync(join(SCENE_DIR, file), 'utf8'));
        return { file, systems: Array.isArray(parsed.systems) ? parsed.systems : [] };
      })
  : [];

let caps = [];
if (existsSync(CAPS)) {
  const parsed = JSON.parse(readFileSync(CAPS, 'utf8'));
  caps = Array.isArray(parsed.systems) ? parsed.systems : [];
}

const capById = new Map(caps.map((system) => [system.id, system]));
for (const scene of scenes) {
  for (const system of scene.systems) {
    const cap = capById.get(system.id);
    if (cap === undefined) {
      errors.push(`scene ${scene.file} 系统 ${system.id} 缺少能力条目`);
      continue;
    }
    if (cap.phase !== system.phase) {
      errors.push(`scene ${scene.file} ${system.id} phase=${system.phase} 与能力表 ${cap.phase} 不一致`);
    }
  }
}

for (const cap of caps) {
  const used = scenes.some((scene) => scene.systems.some((system) => system.id === cap.id));
  if (!used) errors.push(`能力条目 ${cap.id} 不在任何 scene 中`);
  const spec = cap.spec;
  if (spec === undefined || typeof spec !== 'object') {
    errors.push(`${cap.id} 缺少 spec`);
    continue;
  }
  for (const field of ['inputs', 'outputs', 'owns']) {
    if (!Array.isArray(spec[field]) || spec[field].length === 0) errors.push(`${cap.id} spec.${field} 必须是非空数组`);
  }
}

if (errors.length > 0) {
  console.error(`能力/场景一致性检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`能力/场景一致性通过：${caps.length} 个能力 / ${scenes.length} 个 scene`);
