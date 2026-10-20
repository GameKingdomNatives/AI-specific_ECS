import type { Meta, StoryObj } from '@storybook/react-vite';
import { tokens } from '../tokens.js';

/** 颜色、字号、间距的「活文档」：改 tokens.ts，这里自动跟着变。 */
function TokensPage() {
  return (
    <div style={{ background: tokens.color.background, color: tokens.color.text, padding: 24, fontFamily: tokens.font.mono }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>颜色</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {Object.entries(tokens.color).map(([name, value]) => (
          <div key={name} style={{ width: 110 }}>
            <div style={{ background: value, height: 44, border: '1px solid rgba(255,255,255,.15)' }} />
            <div style={{ fontSize: 12, marginTop: 4 }}>{name}</div>
            <div style={{ fontSize: 11, color: tokens.color.textWeak }}>{value}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>字号 / 间距 / 圆角</h2>
      <div style={{ fontSize: 12, color: tokens.color.textMuted }}>
        <div>控制条 {tokens.font.sizeControl}px · 信息行 {tokens.font.sizeStat}px</div>
        <div>网格 {tokens.space.grid}px · 间距 {tokens.space.gap}px · 内边距 {tokens.space.paddingX}×{tokens.space.paddingY}px</div>
        <div>按钮圆角 {tokens.radius.button}px</div>
      </div>
    </div>
  );
}

const meta = {
  title: '设计/颜色与尺寸',
  component: TokensPage,
} satisfies Meta<typeof TokensPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 总览: Story = {};
