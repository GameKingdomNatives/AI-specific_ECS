import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusText } from './StatusText.js';

const meta = {
  title: '基础组件/状态文字',
  component: StatusText,
  args: { children: '就绪 · 按住左键射击' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'muted', 'error'] },
  },
} satisfies Meta<typeof StatusText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 就绪: Story = {};

export const 弱化: Story = { args: { tone: 'muted', children: '自动保存已关闭' } };

export const 报错: Story = { args: { tone: 'error', children: '读档失败：存档版本高于当前' } };

export const 空文案: Story = { args: { children: '' } };
