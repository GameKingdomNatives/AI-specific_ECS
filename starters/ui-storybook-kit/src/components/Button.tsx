export interface ButtonProps {
  readonly label: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly tone?: 'default' | 'primary';
}

const base = 'rounded-md border px-2.5 py-1 font-mono text-[13px] transition-colors';
const tones = {
  default: 'border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800',
  primary: 'border-orange-400/60 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25',
} as const;

/** 最小可复用按钮：三个状态（默认/主色/禁用）都能在 Storybook 里单独看。 */
export function Button({ label, onClick, disabled = false, tone = 'default' }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${tones[tone]} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );
}
