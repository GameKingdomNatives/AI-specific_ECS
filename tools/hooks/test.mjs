#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deepDue, hasDirectMainPush, parsePushLines, verifyStamp } from './push-guard.mjs';

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

check('直接 push main 被拒', () => {
  const pushes = parsePushLines('refs/heads/main abc refs/heads/main def\n');
  assert.equal(hasDirectMainPush(pushes, false), true);
  assert.equal(hasDirectMainPush(pushes, true), false);
});

check('feature push 允许', () => {
  const pushes = parsePushLines('refs/heads/feat abc refs/heads/feat def\n');
  assert.equal(hasDirectMainPush(pushes, false), false);
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

check('第 5 次提交触发深检，深检 stamp 可抑制', () => {
  assert.equal(deepDue(4, false), false);
  assert.equal(deepDue(5, false), true);
  assert.equal(deepDue(5, true), false);
});

console.log(`\nhooks PASS: ${passed} 组`);
