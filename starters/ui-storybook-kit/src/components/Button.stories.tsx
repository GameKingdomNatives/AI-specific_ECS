import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.js';

const meta = {
  title: '基础组件/Button',
  component: Button,
  args: { label: '存档', onClick: () => undefined },
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'primary'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 默认: Story = {};

export const 主色: Story = { args: { tone: 'primary', label: '开始' } };

export const 禁用: Story = { args: { disabled: true } };
