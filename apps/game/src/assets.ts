import { assetUrl, createAssetLoader, parseAssetManifest } from 'agent-specific_ecs/data';

/** 应用侧资源清单：启动时校验 manifest，失败回退到同名 PNG 约定。 */
export interface TextureUrls {
  readonly url: (name: string) => string;
  readonly issue: string | null;
  readonly count: number;
}

function fallback(issue: string | null): TextureUrls {
  return { url: (name) => `/assets/${name}.png`, issue, count: 0 };
}

export async function loadTextureUrls(loader = createAssetLoader()): Promise<TextureUrls> {
  const outcome = await loader.json('/assets/manifest.json');
  if (!outcome.ok) {
    return fallback(outcome.issue);
  }
  const parsed = parseAssetManifest(outcome.value);
  if (!parsed.ok) {
    return fallback(parsed.issues[0]?.message ?? 'manifest invalid');
  }
  const manifest = parsed.value;
  return {
    url: (name) => assetUrl(manifest, name) ?? '',
    issue: null,
    count: manifest.assets.length,
  };
}
