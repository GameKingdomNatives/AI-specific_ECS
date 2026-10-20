import type { IStorage } from '../ports/index.js';

export interface DumpRecord {
  readonly system: string;
  readonly tick: number;
  readonly message: string;
  readonly stack: string;
  readonly at: string;
}

export interface DumpSinkOptions {
  readonly storage: IStorage;
  readonly key?: string;
  readonly max?: number;
}

export interface DumpSink {
  record(entry: { system: string; tick: number; message: string; stack: string }): DumpRecord;
  list(): DumpRecord[];
  /** 序列化为可落盘的 JSON 文本。 */
  toJson(): string;
  /** 写入存储（浏览器 localStorage 或 Node 内存实现）。 */
  persist(): void;
  /** 从存储恢复；损坏时返回空列表而不是抛错。 */
  restore(): DumpRecord[];
  clear(): void;
}

function parse(raw: string | null): DumpRecord[] {
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { dumps?: unknown }).dumps)
        ? (parsed as { dumps: unknown[] }).dumps
        : [];
    return list.filter((item): item is DumpRecord => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const record = item as Record<string, unknown>;
      return typeof record.system === 'string' && typeof record.tick === 'number' && typeof record.message === 'string';
    });
  } catch {
    return [];
  }
}

/** 故障 dump：内存环形 + 可持久化 + 可导出 JSON，供取证与面板读取。 */
export function createDumpSink(options: DumpSinkOptions): DumpSink {
  const key = options.key ?? 'dumps';
  const max = options.max ?? 20;
  const entries: DumpRecord[] = [];

  return {
    record(entry): DumpRecord {
      const record: DumpRecord = { ...entry, at: new Date().toISOString() };
      entries.push(record);
      while (entries.length > max) {
        entries.shift();
      }
      return record;
    },
    list(): DumpRecord[] {
      return [...entries];
    },
    toJson(): string {
      return JSON.stringify({ version: 1, dumps: entries }, null, 2);
    },
    persist(): void {
      options.storage.set(key, this.toJson());
    },
    restore(): DumpRecord[] {
      entries.length = 0;
      entries.push(...parse(options.storage.get(key)));
      return [...entries];
    },
    clear(): void {
      entries.length = 0;
      options.storage.delete(key);
    },
  };
}
