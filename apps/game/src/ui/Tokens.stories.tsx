import type { Meta, StoryObj } from '@storybook/react-vite';
import { tokens } from './tokens.js';

/** 设计评审用的 token 总览：颜色、字号、间距、圆角。 */
function TokensPage() {
  return (
    <div style={{ background: tokens.color.background, color: tokens.color.text, padding: 24, fontFamily: tokens.font.mono }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>颜色</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {Object.entries(tokens.color).map(([name, value]) => (
          <div key={name} style={{ width: 120 }}>
            <div style={{ background: value, height: 48, border: '1px solid rgba(255,255,255,.15)' }} />
            <div style={{ fontSize: 12, marginTop: 4 }}>{name}</div>
            <div style={{ fontSize: 11, color: tokens.color.textWeak }}>{value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>字号</h2>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: tokens.font.sizeControl }}>控制条 {tokens.font.sizeControl}px</div>
        <div style={{ fontSize: tokens.font.sizeStat, color: tokens.color.textMuted }}>统计行 {tokens.font.sizeStat}px</div>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>间距与圆角</h2>
      <div style={{ fontSize: 12, color: tokens.color.textMuted }}>
        <div>grid {tokens.space.grid}px · gap {tokens.space.gap}px · padding {tokens.space.paddingX}×{tokens.space.paddingY}px</div>
        <div>按钮圆角 {tokens.radius.button}px</div>
      </div>
    </div>
  );
}

const meta = {
  title: '设计 token/总览',
  component: TokensPage,
} satisfies Meta<typeof TokensPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 总览: Story = {};
