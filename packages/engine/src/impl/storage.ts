import type { IStorage } from '../ports/index.js';
import type { ContentMigration } from '../data/migrate.js';
import { applyMigrations } from '../data/migrate.js';

/** 内存实现：测试与 Node 端默认用；不依赖浏览器。 */
export function createMemoryStorage(seed: Record<string, string> = {}): IStorage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    get(key) {
      return map.get(key) ?? null;
    },
    set(key, value) {
      map.set(key, value);
    },
    delete(key) {
      map.delete(key);
    },
    keys() {
      return [...map.keys()];
    },
  };
}

/** 浏览器实现：命名空间前缀 + 不可用时可回退。 */
export function createLocalStorage(prefix = 'itb:', fallback?: IStorage): IStorage {
  const backend: Storage | undefined = typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage;
  if (backend === undefined) {
    return fallback ?? createMemoryStorage();
  }
  return {
    get(key) {
      return backend.getItem(prefix + key);
    },
    set(key, value) {
      backend.setItem(prefix + key, value);
    },
    delete(key) {
      backend.removeItem(prefix + key);
    },
    keys() {
      const out: string[] = [];
      for (let index = 0; index < backend.length; index += 1) {
        const key = backend.key(index);
        if (key !== null && key.startsWith(prefix)) {
          out.push(key.slice(prefix.length));
        }
      }
      return out.sort();
    },
  };
}

export interface SaveEnvelope {
  readonly $schemaVersion: number;
  readonly savedAt: string;
  readonly payload: unknown;
}

export interface SaveStoreOptions {
  readonly key: string;
  readonly targetVersion: number;
  readonly migrations?: readonly ContentMigration[];
}

export interface LoadOutcome<T> {
  readonly ok: boolean;
  readonly payload: T | null;
  readonly issue: string | null;
  /** 损坏数据被搬到的键；null 表示没有发生隔离。 */
  readonly quarantined: string | null;
}

export interface SaveStore<T> {
  save(payload: T): void;
  load(): LoadOutcome<T>;
  clear(): void;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 存档：版本与 schema 绑定；旧档逐版迁移；新档拒绝；损坏档隔离而不是抛异常。
 * 隔离 = 复制到 `<key>:quarantine:<时间戳>` 后删除原键，便于事后排查。
 */
export function createSaveStore<T>(storage: IStorage, options: SaveStoreOptions): SaveStore<T> {
  const quarantine = (raw: string): string => {
    const target = `${options.key}:quarantine:${Date.now()}`;
    storage.set(target, raw);
    storage.delete(options.key);
    return target;
  };

  return {
    save(payload: T): void {
      const envelope: SaveEnvelope = {
        $schemaVersion: options.targetVersion,
        savedAt: new Date().toISOString(),
        payload,
      };
      storage.set(options.key, JSON.stringify(envelope));
    },
    load(): LoadOutcome<T> {
      const raw = storage.get(options.key);
      if (raw === null) {
        return { ok: false, payload: null, issue: '没有存档', quarantined: null };
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, payload: null, issue: '存档不是合法 JSON', quarantined: quarantine(raw) };
      }
      if (!isObject(parsed)) {
        return { ok: false, payload: null, issue: '存档不是对象', quarantined: quarantine(raw) };
      }
      const migrated = applyMigrations(parsed, options.migrations ?? [], options.targetVersion);
      if (!migrated.ok) {
        return { ok: false, payload: null, issue: migrated.issue, quarantined: quarantine(raw) };
      }
      const payload = (migrated.raw as SaveEnvelope).payload;
      return { ok: true, payload: payload as T, issue: null, quarantined: null };
    },
    clear(): void {
      storage.delete(options.key);
    },
  };
}
