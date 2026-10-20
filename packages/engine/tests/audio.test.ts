import test from 'node:test';
import assert from 'node:assert/strict';
import { createNullAudio } from '../src/impl/audio.js';

test('默认静音：play 不计数，也不抛错', () => {
  const audio = createNullAudio();
  audio.play('shot');
  audio.stop('shot');
  const stats = audio.stats();
  assert.equal(stats.enabled, false);
  assert.equal(stats.plays, 0);
  assert.equal(stats.stops, 1);
});

test('开启后记录播放次数，音量被夹在 0..1', () => {
  const audio = createNullAudio({ enabled: true });
  audio.play('shot');
  audio.play('shot');
  audio.stop('shot');
  audio.setVolume(3);
  assert.equal(audio.stats().plays, 2);
  assert.equal(audio.stats().volume, 1);
  audio.setVolume(-1);
  assert.equal(audio.stats().volume, 0);
});
