import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

test('capabilities：9 个系统都有 spec 三字段', () => {
  const parsed = readJson('contracts/capabilities.json') as { systems: Array<{ id: string; spec: Record<string, unknown> }> };
  assert.equal(parsed.systems.length, 9);
  for (const system of parsed.systems) {
    assert.equal(typeof system.id, 'string');
    for (const field of ['inputs', 'outputs', 'owns']) {
      const value = system.spec[field];
      assert.equal(Array.isArray(value), true, `${system.id}.${field}`);
      assert.ok((value as string[]).length > 0, `${system.id}.${field} 非空`);
    }
  }
});

test('scene：系统 id/phase 与 capabilities 一致', () => {
  const scene = readJson('apps/game/scenes/demo.scene.json') as { systems: Array<{ id: string; phase: string }> };
  const parsed = readJson('contracts/capabilities.json') as { systems: Array<{ id: string; phase: string }> };
  const caps = new Map(parsed.systems.map((system) => [system.id, system.phase]));
  assert.equal(scene.systems.length, parsed.systems.length);
  for (const system of scene.systems) {
    assert.equal(caps.get(system.id), system.phase, system.id);
  }
});
