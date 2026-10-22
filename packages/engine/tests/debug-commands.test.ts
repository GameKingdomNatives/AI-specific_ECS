import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDebugCommands } from '../src/impl/debug-commands.js';

test('解析 line / circle / rect 与颜色', () => {
  const ops = parseDebugCommands([
    'line 1,2,3,4',
    'circle 10,20,5 #00ff00',
    'rect -1,-2,30,40 #112233',
  ]);
  assert.deepEqual(ops, [
    { kind: 'line', x1: 1, y1: 2, x2: 3, y2: 4, color: 0xff5a3c },
    { kind: 'circle', x: 10, y: 20, radius: 5, color: 0x00ff00 },
    { kind: 'rect', x: -1, y: -2, width: 30, height: 40, color: 0x112233 },
  ]);
});

test('非法命令与非法参数被忽略', () => {
  assert.deepEqual(parseDebugCommands(['line 1,2', 'garbage', 'circle a,b,c']), []);
});

test('颜色缺省为红色，非法颜色回退缺省', () => {
  assert.equal(parseDebugCommands(['line 0,0,1,1'])[0]?.color, 0xff5a3c);
  assert.equal(parseDebugCommands(['line 0,0,1,1 #zzz'])[0]?.color, 0xff5a3c);
});
