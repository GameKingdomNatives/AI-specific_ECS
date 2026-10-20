export interface AssetResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export type AssetFetcher = (url: string) => Promise<AssetResponse>;

export interface AssetOutcome<T> {
  readonly ok: boolean;
  readonly value: T | null;
  readonly issue: string | null;
}

export interface AssetLoader {
  text(url: string): Promise<AssetOutcome<string>>;
  json(url: string): Promise<AssetOutcome<unknown>>;
  /** 清空缓存（热加载或换关卡时用）。 */
  clear(): void;
}

/**
 * 资源加载：成功结果缓存，失败不抛异常——返回问题清单由调用方决定降级方式。
 * 缓存键带类型前缀，避免同名 url 的 text 与 json 互相污染。
 */
export function createAssetLoader(fetcher: AssetFetcher = (url) => fetch(url)): AssetLoader {
  const cache = new Map<string, unknown>();

  async function load<T>(url: string, kind: 'text' | 'json'): Promise<AssetOutcome<T>> {
    const key = `${kind}:${url}`;
    if (cache.has(key)) {
      return { ok: true, value: cache.get(key) as T, issue: null };
    }
    try {
      const response = await fetcher(url);
      if (!response.ok) {
        return { ok: false, value: null, issue: `HTTP ${response.status}` };
      }
      const value: unknown = kind === 'text' ? await response.text() : await response.json();
      cache.set(key, value);
      return { ok: true, value: value as T, issue: null };
    } catch (error) {
      return { ok: false, value: null, issue: String(error) };
    }
  }

  return {
    text: (url) => load<string>(url, 'text'),
    json: (url) => load<unknown>(url, 'json'),
    clear(): void {
      cache.clear();
    },
  };
}
