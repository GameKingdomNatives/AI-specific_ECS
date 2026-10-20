import test from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_BOXES, loadContent, parseContent } from '../src/data/content.js';

const valid = {
  $schemaVersion: 1,
  boxes: { count: 64, minSize: 8, maxSize: 14, speed: 1 },
};

test('合法内容通过校验并给出类型化结果', () => {
  const result = parseContent(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value?.boxes.count, 64);
  assert.deepEqual(result.issues, []);
});

test('版本不符会被拒绝并指出字段', () => {
  const result = parseContent({ ...valid, $schemaVersion: 2 });
  assert.equal(result.ok, false);
  assert.equal(result.value, null);
  assert.ok(result.issues.some((issue) => issue.path.includes('$schemaVersion')));
});

test('越界与缺失字段都报出可读问题', () => {
  const tooMany = parseContent({ ...valid, boxes: { ...valid.boxes, count: 5000 } });
  assert.equal(tooMany.ok, false);
  assert.ok(tooMany.issues.some((issue) => issue.path === 'boxes.count'));
  const missing = parseContent({ $schemaVersion: 1 });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some((issue) => issue.path === 'boxes'));
});

test('加载失败不抛异常，返回问题清单', async () => {
  const failed = await loadContent('/missing.json', async () => ({
    ok: false,
    status: 404,
    json: async () => ({}),
  }));
  assert.equal(failed.ok, false);
  assert.ok(failed.issues.some((issue) => issue.message.includes('404')));

  const thrown = await loadContent('/boom.json', async () => {
    throw new Error('network down');
  });
  assert.equal(thrown.ok, false);
  assert.ok(thrown.issues.length > 0);
});

test('成功后返回解析后的内容，回退值合法', async () => {
  const loaded = await loadContent('/content.json', async () => ({
    ok: true,
    status: 200,
    json: async () => valid,
  }));
  assert.equal(loaded.ok, true);
  assert.equal(loaded.value?.boxes.speed, 1);
  assert.equal(FALLBACK_BOXES.count, 64);
});
