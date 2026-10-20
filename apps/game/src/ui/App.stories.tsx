import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './App.js';
import type { UiSnapshot } from './snapshot.js';

const base: UiSnapshot = {
  tick: 1234,
  entities: 65,
  bullets: 7,
  kills: 12,
  bodies: 53,
  recordingTicks: 1234,
  dumps: 0,
  audioPlays: 3,
  hash: 'a1b2c3d4',
  dataStatus: 'data ok',
  mode: 'run',
  note: '就绪 · 按住左键射击',
};

const noop = (): void => undefined;
const intents = {
  save: noop,
  load: noop,
  clear: noop,
  exportRecording: noop,
  exportDumps: noop,
};

const meta = {
  title: '战斗 HUD/控制条',
  component: App,
  args: { snapshot: base, intents },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 就绪: Story = {};

export const 有诊断: Story = {
  args: { snapshot: { ...base, dumps: 2, note: '已导出诊断 2 条 · 隔离 0' }, intents },
};

export const 存档失败: Story = {
  args: {
    snapshot: { ...base, note: '读档失败：存档版本高于当前 · 隔离 1' },
    intents,
  },
};
