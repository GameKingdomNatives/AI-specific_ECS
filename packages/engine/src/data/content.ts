import { z } from 'zod';

export const boxSpecSchema = z.object({
  count: z.number().int().min(0).max(2000),
  minSize: z.number().positive(),
  maxSize: z.number().positive(),
  speed: z.number().positive(),
});

export const contentSchema = z.object({
  $schemaVersion: z.literal(1),
  boxes: boxSpecSchema,
});

export type BoxSpec = z.infer<typeof boxSpecSchema>;
export type ContentFile = z.infer<typeof contentSchema>;

export interface ContentIssue {
  readonly path: string;
  readonly message: string;
}

export interface ContentResult {
  readonly ok: boolean;
  readonly value: ContentFile | null;
  readonly issues: readonly ContentIssue[];
}

export interface ContentResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type Fetcher = (url: string) => Promise<ContentResponse>;

/** schema 校验是唯一入口：非法内容不抛异常，而是返回可展示的问题清单。 */
export function parseContent(raw: unknown): ContentResult {
  const parsed = contentSchema.safeParse(raw);
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

export async function loadContent(url: string, fetcher: Fetcher = (input) => fetch(input)): Promise<ContentResult> {
  try {
    const response = await fetcher(url);
    if (!response.ok) {
      return { ok: false, value: null, issues: [{ path: '$', message: `HTTP ${response.status}` }] };
    }
    return parseContent(await response.json());
  } catch (error) {
    return { ok: false, value: null, issues: [{ path: '$', message: String(error) }] };
  }
}

export const FALLBACK_BOXES: BoxSpec = { count: 64, minSize: 8, maxSize: 14, speed: 1 };
