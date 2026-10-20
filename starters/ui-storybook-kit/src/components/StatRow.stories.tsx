import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatRow } from './StatRow.js';

const meta = {
  title: '基础组件/StatRow',
  component: StatRow,
  args: {
    items: [
      { label: 'tick', value: 390 },
      { label: '实体', value: 65 },
      { label: '击杀', value: 12 },
    ],
  },
} satisfies Meta<typeof StatRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 有数据: Story = {};

export const 空状态: Story = { args: { items: [] } };
