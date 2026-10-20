import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoRow } from './InfoRow.js';

const meta = {
  title: '基础组件/信息行',
  component: InfoRow,
  args: {
    items: [
      { label: '项目', value: 12 },
      { label: '成员', value: 4 },
      { label: '本周更新', value: 37 },
    ],
  },
} satisfies Meta<typeof InfoRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 有数据: Story = {};

export const 空数据: Story = { args: { items: [] } };
