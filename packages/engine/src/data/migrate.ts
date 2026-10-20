export interface ContentMigration {
  readonly from: number;
  readonly to: number;
  readonly migrate: (raw: Record<string, unknown>) => Record<string, unknown>;
}

export interface MigrationResult {
  readonly ok: boolean;
  readonly raw: unknown;
  readonly applied: readonly number[];
  readonly issue: string | null;
}

function versionOf(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const version = (raw as Record<string, unknown>).$schemaVersion;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}

/**
 * 数据迁移管线：只按 `from → to` 顺序前进，不做隐式跳版。
 * 缺一环、目标版本更低、或输入不是对象，都明确失败而不是猜。
 */
export function applyMigrations(
  raw: unknown,
  migrations: readonly ContentMigration[],
  targetVersion: number,
): MigrationResult {
  let current = raw;
  const version = versionOf(current);
  if (version === null) {
    return { ok: false, raw, applied: [], issue: '缺少合法的 $schemaVersion' };
  }
  if (version > targetVersion) {
    return { ok: false, raw, applied: [], issue: `数据版本 ${version} 高于目标 ${targetVersion}` };
  }
  const applied: number[] = [];
  let cursor = version;
  while (cursor < targetVersion) {
    const step = migrations.find((migration) => migration.from === cursor);
    if (step === undefined) {
      return { ok: false, raw, applied, issue: `缺少 v${cursor} → v${cursor + 1} 的迁移` };
    }
    if (step.to !== cursor + 1) {
      return { ok: false, raw, applied, issue: `迁移步进必须逐版：v${step.from} → v${step.to}` };
    }
    current = step.migrate(current as Record<string, unknown>);
    applied.push(cursor);
    cursor = step.to;
  }
  return { ok: true, raw: current, applied, issue: null };
}
