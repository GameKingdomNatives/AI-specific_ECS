import type { ReactNode } from 'react';

export type StatusTone = 'info' | 'muted' | 'error';

export interface StatusNoteProps {
  readonly tone?: StatusTone;
  readonly children: ReactNode;
}

const tones: Record<StatusTone, string> = {
  info: 'text-stone-300',
  muted: 'text-stone-500',
  error: 'text-red-300',
};

/** 状态行：info / muted / error 三种语气，对应设计稿里的三种文案状态。 */
export function StatusNote({ tone = 'info', children }: StatusNoteProps) {
  return <span className={`font-mono text-[13px] ${tones[tone]}`}>{children}</span>;
}
