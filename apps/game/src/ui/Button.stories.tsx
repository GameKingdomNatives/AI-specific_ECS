import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.js';

const meta = {
  title: '基础组件/按钮',
  component: Button,
  args: { label: '存档', onClick: () => undefined },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 默认: Story = {};

export const 主色: Story = { args: { tone: 'primary', label: '导出录制' } };

export const 禁用: Story = { args: { disabled: true } };

export const 长文案: Story = { args: { label: '导出当前这一局的完整录制文件' } };
