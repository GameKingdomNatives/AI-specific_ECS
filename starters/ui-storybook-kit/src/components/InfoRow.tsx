export interface InfoItem {
  readonly label: string;
  readonly value: string | number;
}

export interface InfoRowProps {
  readonly items: readonly InfoItem[];
}

/**
 * 一行「名称 + 数值」的信息（例如「项目 12 · 成员 4」）。
 * items 为空时显示空状态，避免只画有数据的样子。
 */
export function InfoRow({ items }: InfoRowProps) {
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
