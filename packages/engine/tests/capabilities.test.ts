import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const SCENE_DIR = join(ROOT, 'apps', 'game', 'scenes');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

interface Capability {
  readonly id: string;
  readonly phase: string;
  readonly spec: Record<string, unknown>;
}

function readCapabilities(): Capability[] {
  const parsed = readJson('contracts/capabilities.json') as { systems: Capability[] };
  return parsed.systems;
}

function readScenes(): Array<{ file: string; systems: Array<{ id: string; phase: string }> }> {
  return readdirSync(SCENE_DIR)
    .filter((file) => file.endsWith('.scene.json'))
    .map((file) => {
      const scene = JSON.parse(readFileSync(join(SCENE_DIR, file), 'utf8')) as { systems?: Array<{ id: string; phase: string }> };
      return { file, systems: scene.systems ?? [] };
    });
}

test('capabilities：每个系统都有 spec 三字段', () => {
  const systems = readCapabilities();
  assert.ok(systems.length >= 9, `能力条目数 ${systems.length} 少于首个批次的 9`);
  for (const system of systems) {
    assert.equal(typeof system.id, 'string');
    for (const field of ['inputs', 'outputs', 'owns']) {
      const value = system.spec[field];
      assert.equal(Array.isArray(value), true, `${system.id}.${field}`);
      assert.ok((value as string[]).length > 0, `${system.id}.${field} 非空`);
    }
  }
});

test('scene：每个场景的系统 id/phase 与 capabilities 一致，且每条能力至少被一个场景使用', () => {
  const capabilities = readCapabilities();
  const byId = new Map(capabilities.map((system) => [system.id, system.phase]));
  const scenes = readScenes();
  assert.ok(scenes.length >= 1, '至少需要一个场景');
  for (const scene of scenes) {
    for (const system of scene.systems) {
      assert.equal(byId.get(system.id), system.phase, `${scene.file}:${system.id}`);
    }
  }
  for (const capability of capabilities) {
    const used = scenes.some((scene) => scene.systems.some((system) => system.id === capability.id));
    assert.equal(used, true, `能力 ${capability.id} 没有出现在任何场景中`);
  }
});
