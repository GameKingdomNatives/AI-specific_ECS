/** 设计 token 的唯一事实源；本工程独立使用，可按需自行扩展。 */
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
    error: '#fca5a5',
  },
  font: { mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', sizeControl: 13, sizeStat: 12 },
  radius: { button: 6 },
  space: { grid: 4, gap: 8, paddingX: 10, paddingY: 5 },
} as const;
