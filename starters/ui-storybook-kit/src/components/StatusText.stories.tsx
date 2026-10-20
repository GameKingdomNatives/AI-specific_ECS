import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusText } from './StatusText.js';

const meta = {
  title: '基础组件/状态文字',
  component: StatusText,
  args: { children: '已保存 · 2 秒前' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'muted', 'error'] },
  },
} satisfies Meta<typeof StatusText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 普通: Story = {};

export const 弱化: Story = { args: { tone: 'muted', children: '自动保存已关闭' } };

export const 报错: Story = { args: { tone: 'error', children: '保存失败：网络不可用' } };
