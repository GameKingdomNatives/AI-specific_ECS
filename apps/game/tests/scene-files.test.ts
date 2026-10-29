import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parseScene } from 'agent-specific_ecs/scene';

/** 测试从仓库根运行（门禁即如此），场景目录按 cwd 定位，编译到 dist-ts 也不会跑偏。 */
const sceneDir = join(process.cwd(), 'apps', 'game', 'scenes');

function loadScenes() {
  return readdirSync(sceneDir)
    .filter((file) => file.endsWith('.scene.json'))
    .map((file) => ({ file, raw: JSON.parse(readFileSync(join(sceneDir, file), 'utf8')) }));
}

test('随仓库发布的每个场景文件都能通过 parseScene', () => {
  const scenes = loadScenes();
  assert.ok(scenes.length >= 2, '至少要有游戏场景与引擎夹具场景');
  for (const { file, raw } of scenes) {
    const parsed = parseScene(raw);
    const detail = parsed.ok ? '' : parsed.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ');
    assert.ok(parsed.ok, `${file} 解析失败：${detail}`);
  }
});

test('游戏场景仍然带玩家与僚机两个可操作实体', () => {
  const game = loadScenes().find((scene) => scene.file === 'flux-core.scene.json');
  assert.ok(game !== undefined, '缺少 flux-core.scene.json');
  const ids = game.raw.nodes.map((node: { id: string }) => node.id);
  assert.ok(ids.includes('player'), '缺少 player 节点');
  assert.ok(ids.includes('wingman'), '缺少 wingman 节点');
  const wingman = game.raw.nodes.find((node: { id: string }) => node.id === 'wingman');
  assert.ok(wingman.components.Wingman !== undefined, 'wingman 节点缺 Wingman 组件');
});
