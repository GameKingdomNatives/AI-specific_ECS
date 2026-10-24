import { createWebAudio } from 'agent-specific_ecs/audio';
import type { EventBus } from 'agent-specific_ecs/core';

/** 临时 CC0 音效（来源见 apps/game/public/audio/CREDITS.md）。 */
const SOURCES = {
  shoot: '/audio/laser.ogg',
  impact: '/audio/impact.ogg',
  explosion: '/audio/explosion.ogg',
  click: '/audio/click.ogg',
  error: '/audio/error.ogg',
  confirm: '/audio/confirm.ogg',
};

/** 建音频后端并接上世界事件与首次交互（浏览器要求用户手势后才出声）。 */
export function createGameAudio(bus: EventBus, canvas: HTMLCanvasElement) {
  const audio = createWebAudio({
    contextFactory: () => (typeof AudioContext === 'undefined' ? null : new AudioContext()),
    sources: SOURCES,
  });
  audio.setVolume(0.5);
  bus.on('demo.hit', () => audio.play('impact'));
  canvas.addEventListener('pointerdown', () => audio.play('shoot'));
  return audio;
}
