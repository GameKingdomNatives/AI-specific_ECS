import test from 'node:test';
import assert from 'node:assert/strict';
import { assetUrl, parseAssetManifest } from '../src/data/assets-manifest.js';

const VALID = {
  version: 1,
  generatedAt: '2026-10-20T00:00:00.000Z',
  assets: [
    { name: 'player', file: 'player.png', width: 48, height: 48 },
    { name: 'box', file: 'box.png', width: 24, height: 24 },
  ],
};

test('合法清单通过并可按名字取 URL', () => {
  const parsed = parseAssetManifest(VALID);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }
  assert.equal(assetUrl(parsed.value, 'box'), '/assets/box.png');
  assert.equal(assetUrl(parsed.value, 'missing'), null);
});

test('版本、尺寸与重复名被拒绝', () => {
  const badVersion = parseAssetManifest({ ...VALID, version: 2 });
  assert.equal(badVersion.ok, false);
  assert.ok(badVersion.issues.length > 0);
  const badSize = parseAssetManifest({ ...VALID, assets: [{ name: 'x', file: 'x.png', width: 0, height: 4 }] });
  assert.equal(badSize.ok, false);
  const duplicate = parseAssetManifest({ ...VALID, assets: [VALID.assets[0], VALID.assets[0]] });
  assert.equal(duplicate.ok, false);
  assert.ok(duplicate.issues.some((issue) => issue.message.includes('重复')));
});

test('空清单与非对象被拒绝', () => {
  assert.equal(parseAssetManifest({ ...VALID, assets: [] }).ok, false);
  assert.equal(parseAssetManifest(null).ok, false);
});
