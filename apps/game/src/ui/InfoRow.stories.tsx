import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoRow } from './InfoRow.js';

const meta = {
  title: '基础组件/信息行',
  component: InfoRow,
  args: {
    items: [
      { label: 'tick', value: 1234 },
      { label: '实体', value: 65 },
      { label: '弹', value: 7 },
      { label: '击杀', value: 12 },
      { label: '刚体', value: 53 },
      { label: '诊断', value: 0 },
    ],
  },
} satisfies Meta<typeof InfoRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 有数据: Story = {};

export const 空数据: Story = { args: { items: [] } };
