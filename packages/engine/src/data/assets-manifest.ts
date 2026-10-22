import { z } from 'zod';

export const assetEntrySchema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const assetManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().optional(),
  assets: z.array(assetEntrySchema).min(1),
}).superRefine((manifest, ctx) => {
  const seen = new Set<string>();
  for (const [index, asset] of manifest.assets.entries()) {
    if (seen.has(asset.name)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assets', index, 'name'], message: `资源名重复：${asset.name}` });
    }
    seen.add(asset.name);
  }
});

export type AssetEntry = z.infer<typeof assetEntrySchema>;
export type AssetManifest = z.infer<typeof assetManifestSchema>;

export interface ManifestIssue {
  readonly path: string;
  readonly message: string;
}

export type ManifestResult =
  | { readonly ok: true; readonly value: AssetManifest; readonly issues: readonly [] }
  | { readonly ok: false; readonly value: null; readonly issues: readonly ManifestIssue[] };

/** 资源清单是唯一入口：非法清单返回问题清单，不抛异常。 */
export function parseAssetManifest(raw: unknown): ManifestResult {
  const parsed = assetManifestSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data, issues: [] };
  }
  return {
    ok: false,
    value: null,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.') || '$',
      message: issue.message,
    })),
  };
}

/** 清单内按名字解析资源 URL；未知名字返回 null。 */
export function assetUrl(manifest: AssetManifest, name: string): string | null {
  const asset = manifest.assets.find((entry) => entry.name === name);
  return asset === undefined ? null : `/assets/${asset.file}`;
}
