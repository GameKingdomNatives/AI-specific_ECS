import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.js';

const meta = {
  title: '基础组件/按钮',
  component: Button,
  args: { label: '提交', onClick: () => undefined },
  argTypes: {
    tone: { control: 'inline-radio', options: ['default', 'primary'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 最普通的样子。 */
export const 默认: Story = {};

/** 主要操作（一屏最多一个）。 */
export const 主色: Story = { args: { tone: 'primary', label: '确认' } };

/** 不可点击：鼠标放上去也不会有反应。 */
export const 禁用: Story = { args: { disabled: true } };
