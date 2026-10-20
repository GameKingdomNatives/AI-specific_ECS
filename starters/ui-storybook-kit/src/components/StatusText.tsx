import type { ReactNode } from 'react';

export type StatusTone = 'info' | 'muted' | 'error';

export interface StatusTextProps {
  readonly tone?: StatusTone;
  readonly children: ReactNode;
}

const tones: Record<StatusTone, string> = {
  info: 'text-stone-300',
  muted: 'text-stone-500',
  error: 'text-red-300',
};

/**
 * 一行状态文字（例如「已保存」「保存失败」）。
 * tone 决定语气：info 普通、muted 弱化、error 报错。
 */
export function StatusText({ tone = 'info', children }: StatusTextProps) {
  return <span className={`font-mono text-[13px] ${tones[tone]}`}>{children}</span>;
}
