import test from 'node:test';
import assert from 'node:assert/strict';
import { createNullAudio, createWebAudio } from '../src/impl/audio.js';
import type { AudioContextLike, AudioNodeLike, BufferSourceLike } from '../src/impl/audio.js';

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

function fakeContext(): { context: AudioContextLike; started: () => number; stopped: () => number; decodes: () => number } {
  let starts = 0;
  let stops = 0;
  let decodes = 0;
  const destination: AudioNodeLike = { connect: () => destination };
  const context: AudioContextLike = {
    destination,
    currentTime: 0,
    createGain: () => ({ gain: { value: 1 }, connect: () => destination }),
    createBufferSource: () => {
      const source: BufferSourceLike = {
        buffer: null,
        connect: () => destination,
        start: () => {
          starts += 1;
        },
        stop: () => {
          stops += 1;
        },
      };
      return source;
    },
    decodeAudioData: async () => {
      decodes += 1;
      return { decoded: decodes };
    },
  };
  return { context, started: () => starts, stopped: () => stops, decodes: () => decodes };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

test('WebAudio：同一音效只解码一次，每次 play 都启动源', async () => {
  const fake = fakeContext();
  const audio = createWebAudio({
    contextFactory: () => fake.context,
    load: async () => new ArrayBuffer(8),
  });
  audio.play('shot');
  await settle();
  audio.play('shot');
  await settle();
  const stats = audio.stats();
  assert.equal(stats.plays, 2);
  assert.equal(stats.decoded, 1);
  assert.equal(stats.started, 2);
  assert.equal(fake.decodes(), 1);
  assert.equal(fake.started(), 2);
});

test('WebAudio：stop 停止活动源，音量被夹在 0..1', async () => {
  const fake = fakeContext();
  const audio = createWebAudio({
    contextFactory: () => fake.context,
    load: async () => new ArrayBuffer(8),
  });
  audio.play('shot');
  await settle();
  audio.stop('shot');
  audio.setVolume(5);
  assert.equal(audio.stats().stops, 1);
  assert.equal(audio.stats().volume, 1);
  assert.equal(fake.stopped(), 1);
  audio.setVolume(-2);
  assert.equal(audio.stats().volume, 0);
});

test('WebAudio：没有上下文时静音回退，不抛错也不计数', async () => {
  const audio = createWebAudio({ contextFactory: () => null });
  audio.play('shot');
  await settle();
  const stats = audio.stats();
  assert.equal(stats.enabled, false);
  assert.equal(stats.plays, 0);
  assert.equal(stats.started, 0);
});

test('WebAudio：加载失败只记 failures，不抛错', async () => {
  const fake = fakeContext();
  const audio = createWebAudio({
    contextFactory: () => fake.context,
    load: async () => null,
  });
  audio.play('missing');
  await settle();
  const stats = audio.stats();
  assert.equal(stats.failures, 1);
  assert.equal(stats.started, 0);
});
