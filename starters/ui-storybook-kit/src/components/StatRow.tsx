export interface StatItem {
  readonly label: string;
  readonly value: string | number;
}

export interface StatRowProps {
  readonly items: readonly StatItem[];
}

/** 数值行：空数组时给出空状态，避免设计稿只画有数据的样子。 */
export function StatRow({ items }: StatRowProps) {
  if (items.length === 0) {
    return <span className="font-mono text-xs text-stone-500">暂无数据</span>;
  }
  return (
    <span className="font-mono text-xs text-stone-500">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 ? ' · ' : ''}
          {item.label} {item.value}
        </span>
      ))}
    </span>
  );
}
