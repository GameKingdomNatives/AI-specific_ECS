#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCENE = join(ROOT, 'apps', 'game', 'scenes', 'demo.scene.json');
const CAPS = join(ROOT, 'contracts', 'capabilities.json');
const errors = [];

if (!existsSync(SCENE)) errors.push('缺少 apps/game/scenes/demo.scene.json');
if (!existsSync(CAPS)) errors.push('缺少 contracts/capabilities.json');

let sceneSystems = [];
let caps = [];
if (existsSync(SCENE)) {
  const scene = JSON.parse(readFileSync(SCENE, 'utf8'));
  sceneSystems = Array.isArray(scene.systems) ? scene.systems : [];
}
if (existsSync(CAPS)) {
  const parsed = JSON.parse(readFileSync(CAPS, 'utf8'));
  caps = Array.isArray(parsed.systems) ? parsed.systems : [];
}

const capById = new Map(caps.map((system) => [system.id, system]));
const sceneById = new Map(sceneSystems.map((system) => [system.id, system]));
for (const system of sceneSystems) {
  const cap = capById.get(system.id);
  if (cap === undefined) {
    errors.push(`scene 系统 ${system.id} 缺少能力条目`);
    continue;
  }
  if (cap.phase !== system.phase) errors.push(`scene ${system.id} phase=${system.phase} 与能力表 ${cap.phase} 不一致`);
}
for (const cap of caps) {
  if (!sceneById.has(cap.id)) errors.push(`能力条目 ${cap.id} 不在 demo.scene.json 中`);
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
console.log(`能力/场景一致性通过：${caps.length} 个系统`);
