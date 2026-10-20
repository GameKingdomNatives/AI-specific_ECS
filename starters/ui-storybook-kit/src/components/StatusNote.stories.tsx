import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusNote } from './StatusNote.js';

const meta = {
  title: '基础组件/StatusNote',
  component: StatusNote,
  args: { children: '就绪 · 按住左键射击' },
} satisfies Meta<typeof StatusNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 信息: Story = {};

export const 弱化: Story = { args: { tone: 'muted', children: '已导出录制 386 tick' } };

export const 错误: Story = { args: { tone: 'error', children: '读档失败：存档版本高于当前' } };
