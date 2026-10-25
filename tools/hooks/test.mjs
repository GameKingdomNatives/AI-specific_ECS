#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deepDue, parsePushLines, tagPushes, verifyRefs, verifyStamp } from './push-guard.mjs';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

check('解析 pre-push stdin', () => {
  const pushes = parsePushLines('refs/heads/feat abc123 refs/heads/feat def456\nrefs/heads/main 111 refs/heads/main 222\n');
  assert.equal(pushes.length, 2);
  assert.equal(pushes[1].remoteRef, 'refs/heads/main');
});

check('缺少 stamp 拒绝', () => {
  const dir = mkdtempSync(join(tmpdir(), 'itb-hooks-'));
  try {
    assert.equal(verifyStamp(dir, 'abc'), false);
    mkdirSync(join(dir, '.gate', 'stamps'), { recursive: true });
    writeFileSync(join(dir, '.gate', 'stamps', 'abc.json'), JSON.stringify({ head: 'abc' }));
    assert.equal(verifyStamp(dir, 'abc'), true);
    assert.equal(verifyStamp(dir, 'other'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check('逐 ref 校验：main 与 feature 同规则', () => {
  const dir = mkdtempSync(join(tmpdir(), 'itb-hooks-'));
  try {
    mkdirSync(join(dir, '.gate', 'stamps'), { recursive: true });
    writeFileSync(join(dir, '.gate', 'stamps', 'aaa.json'), JSON.stringify({ head: 'aaa' }));
    const pushes = parsePushLines(
      'refs/heads/main aaa refs/heads/main 000\nrefs/heads/feat bbb refs/heads/feat 000\n',
    );
    const missing = verifyRefs(dir, pushes);
    assert.equal(missing.length, 1);
    assert.equal(missing[0].localSha, 'bbb');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check('删除 ref 不需要 stamp', () => {
  const dir = mkdtempSync(join(tmpdir(), 'itb-hooks-'));
  try {
    const pushes = parsePushLines('(delete) 0000000000000000000000000000000000000000 refs/heads/old 000\n');
    assert.equal(verifyRefs(dir, pushes).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check('tag 不要求 stamp，但会被单独识别', () => {
  const dir = mkdtempSync(join(tmpdir(), 'itb-hooks-'));
  try {
    const pushes = parsePushLines(
      'refs/tags/v1 aaa refs/tags/v1 000\nrefs/heads/main bbb refs/heads/main 000\n',
    );
    assert.equal(verifyRefs(dir, pushes).length, 1, '只有 main 缺 stamp 被拒');
    assert.equal(verifyRefs(dir, pushes)[0].remoteRef, 'refs/heads/main');
    assert.equal(tagPushes(pushes).length, 1);
    assert.equal(tagPushes(pushes)[0].remoteRef, 'refs/tags/v1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

check('第 5 次提交触发深检，深检 stamp 可抑制', () => {
  assert.equal(deepDue(4, false), false);
  assert.equal(deepDue(5, false), true);
  assert.equal(deepDue(5, true), false);
});

console.log(`\nhooks PASS: ${passed} 组`);
