import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetLoader } from '../src/data/assets.js';
import type { AssetResponse } from '../src/data/assets.js';

function response(body: string, status = 200): AssetResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

test('成功结果被缓存，同一资源只取一次', async () => {
  let calls = 0;
  const loader = createAssetLoader(async () => {
    calls += 1;
    return response('hello');
  });
  assert.equal((await loader.text('/a.txt')).value, 'hello');
  assert.equal((await loader.text('/a.txt')).value, 'hello');
  assert.equal(calls, 1);
});

test('HTTP 失败返回问题而不是抛异常', async () => {
  const loader = createAssetLoader(async () => response('', 404));
  const outcome = await loader.text('/missing.txt');
  assert.equal(outcome.ok, false);
  assert.match(outcome.issue ?? '', /404/);
});

test('JSON 解析失败也被隔离', async () => {
  const loader = createAssetLoader(async () => response('{bad json'));
  const outcome = await loader.json('/bad.json');
  assert.equal(outcome.ok, false);
  assert.ok((outcome.issue ?? '').length > 0);
});

test('网络异常与 clear 行为', async () => {
  let calls = 0;
  const loader = createAssetLoader(async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error('network down');
    }
    return response('ok');
  });
  const failed = await loader.text('/x.txt');
  assert.equal(failed.ok, false);
  assert.match(failed.issue ?? '', /network down/);
  assert.equal((await loader.text('/x.txt')).value, 'ok');
  loader.clear();
  assert.equal((await loader.text('/x.txt')).value, 'ok');
  assert.equal(calls, 3);
});
