export type ButtonTone = 'default' | 'primary';

export interface ButtonProps {
  readonly label: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly tone?: ButtonTone;
}

const base =
  'cursor-pointer rounded-md border px-2.5 py-1 font-mono text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-45';

const tones: Record<ButtonTone, string> = {
  default: 'border-stone-700 bg-stone-900 text-stone-200 hover:enabled:bg-stone-800',
  primary: 'border-orange-400/60 bg-orange-500/15 text-orange-100 hover:enabled:bg-orange-500/25',
};

/** 控制条按钮：纯展示，点击只回调意图，不直接改世界。 */
export function Button({ label, onClick, disabled = false, tone = 'default' }: ButtonProps) {
  return (
    <button type="button" className={`${base} ${tones[tone]}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
