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

/** 一行状态文字：info 普通、muted 弱化、error 同时作为 alert 播报。 */
export function StatusText({ tone = 'info', children }: StatusTextProps) {
  return (
    <span role={tone === 'error' ? 'alert' : 'status'} className={`font-mono text-[13px] ${tones[tone]}`}>
      {children}
    </span>
  );
}
