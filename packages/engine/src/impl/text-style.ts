/** 文本视图的纯逻辑：默认字体/字号与池键，便于单测（不依赖 Pixi）。 */
export interface TextStyleSpec {
  readonly font: string;
  readonly size: number;
}

export const DEFAULT_TEXT_FONT = 'monospace';
export const DEFAULT_TEXT_SIZE = 16;

export function resolveTextStyle(font: string | undefined, fontSize: number | undefined): TextStyleSpec {
  return {
    font: font ?? DEFAULT_TEXT_FONT,
    size: Math.max(1, Math.floor(fontSize ?? DEFAULT_TEXT_SIZE)),
  };
}

/** 文本视图按「内容 + 字体 + 字号 + 颜色」复用；任一变化都需要重建纹理。 */
export function textKey(text: string, font: string | undefined, fontSize: number | undefined, tint: number): string {
  const style = resolveTextStyle(font, fontSize);
  return `text:${tint}:${style.size}:${style.font}:${text}`;
}
