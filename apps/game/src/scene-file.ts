import type { Scene } from 'agent-specific_ecs/scene';

/** 游戏场景是默认入口；引擎夹具场景只用于引擎能力对照。 */
export const GAME_SCENE_FILE = 'flux-core.scene.json';
export const DEMO_SCENE_FILE = 'demo.scene.json';
export const DEFAULT_SCENE_FILE = GAME_SCENE_FILE;
const FILE_PATTERN = /^[A-Za-z0-9._-]+\.scene\.json$/;

export function isSceneFile(value: unknown): value is string {
  return typeof value === 'string' && FILE_PATTERN.test(value);
}

/**
 * URL `?scene=` 指定文件：整名（flux-core.scene.json）或省略后缀（flux-core）都认，
 * 这样手敲链接不会因为少写后缀掉回默认场景。非法/缺省用游戏场景。
 */
export function resolveSceneFile(search: string = location.search): string {
  const raw = new URLSearchParams(search).get('scene');
  const candidate = raw === null ? '' : raw.trim();
  if (candidate === '') return DEFAULT_SCENE_FILE;
  if (isSceneFile(candidate)) return candidate;
  const withSuffix = `${candidate}.scene.json`;
  return isSceneFile(withSuffix) ? withSuffix : DEFAULT_SCENE_FILE;
}

/** 运行时当前文件：编辑器打开/另存后写全局；否则按 URL。 */
export function currentSceneFile(): string {
  return isSceneFile(globalThis.__itbSceneFile) ? globalThis.__itbSceneFile : resolveSceneFile();
}

export function setCurrentSceneFile(file: string): void {
  if (isSceneFile(file)) globalThis.__itbSceneFile = file;
}

export function sceneUrl(file: string): string {
  return `/scenes/${encodeURIComponent(file)}`;
}

export interface SceneListResult {
  readonly ok: boolean;
  readonly files: readonly string[];
  readonly error?: string;
}

export async function fetchSceneList(): Promise<SceneListResult> {
  try {
    const response = await fetch('/__scene/list');
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) return { ok: false, files: [], error: '返回格式错误' };
    const record = payload as Record<string, unknown>;
    const files = Array.isArray(record.files) ? record.files.filter(isSceneFile) : [];
    return response.ok ? { ok: true, files } : { ok: false, files, error: typeof record.error === 'string' ? record.error : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, files: [], error: String(error) };
  }
}

export interface SaveSceneResult {
  readonly ok: boolean;
  readonly bytes?: number;
  readonly error?: string;
  readonly issues?: readonly string[];
}

/** 保存到指定 scene 文件；保存端点会再次 parseScene。 */
export async function saveScene(file: string, scene: Scene): Promise<SaveSceneResult> {
  try {
    const response = await fetch('/__scene/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file, scene }),
    });
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) return { ok: false, error: '返回格式错误' };
    const record = payload as Record<string, unknown>;
    const issues = Array.isArray(record.issues) ? record.issues.map(String) : undefined;
    return {
      ok: response.ok && record.ok === true,
      ...(typeof record.bytes === 'number' ? { bytes: record.bytes } : {}),
      ...(typeof record.error === 'string' ? { error: record.error } : {}),
      ...(issues !== undefined ? { issues } : {}),
    };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
