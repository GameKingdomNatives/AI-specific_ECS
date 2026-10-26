/**
 * UI 设计 token 的唯一事实源（本地、零成本）。
 * 组件用 Tailwind 类实现，本文件用于文档、评审与 story 展示；
 * 新增 token 必须先改这里与 docs/UI最终方案.md。
 */
export const tokens = {
  color: {
    background: '#111111',
    buttonBg: '#1c1917',
    buttonBorder: '#44403c',
    buttonHover: '#292524',
    text: '#e7e5e4',
    textMuted: '#a8a29e',
    textWeak: '#78716c',
    accent: '#fb923c',
  },
  font: {
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    sizeControl: 13,
    sizeStat: 12,
  },
  radius: {
    button: 6,
  },
  space: {
    grid: 4,
    gap: 8,
    paddingX: 10,
    paddingY: 5,
  },
} as const;

export type UiTokens = typeof tokens;
