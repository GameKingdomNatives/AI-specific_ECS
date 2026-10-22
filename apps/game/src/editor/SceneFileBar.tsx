import { useEffect, useState } from 'react';
import type { Scene } from '@itb/engine/scene';
import { currentSceneFile, fetchSceneList, isSceneFile, saveScene } from '../scene-file.js';

function navigateTo(file: string): void {
  const params = new URLSearchParams(location.search);
  params.set('scene', file);
  params.set('editor', '1');
  location.search = params.toString();
}

/** 场景文件选择/另存：打开用 URL 导航（运行时与编辑器同源加载），另存写盘后跳转。 */
export function SceneFileBar(props: { getScene: () => Scene | null }) {
  const [files, setFiles] = useState<readonly string[]>([]);
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void fetchSceneList().then((result) => {
      setFiles(result.files);
      if (!result.ok) setError(result.error ?? null);
    });
  }, []);
  const saveAs = async (): Promise<void> => {
    const scene = props.getScene();
    if (scene === null) return;
    if (!isSceneFile(target)) {
      setError('文件名须为 <name>.scene.json，且只含字母/数字/._-');
      return;
    }
    const result = await saveScene(target, scene);
    if (!result.ok) {
      setError(result.error ?? '另存失败');
      return;
    }
    navigateTo(target);
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 rounded border border-neutral-200 bg-white p-1 text-[10px]">
      <span className="text-neutral-400">scene</span>
      <select value={currentSceneFile()} onChange={(event) => navigateTo(event.target.value)} className="max-w-36 rounded border border-neutral-300 px-1 py-0.5">
        {files.length === 0 ? <option value={currentSceneFile()}>{currentSceneFile()}</option> : null}
        {files.map((file) => <option key={file} value={file}>{file}</option>)}
      </select>
      <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="new.scene.json" className="w-28 rounded border border-neutral-300 px-1 py-0.5" />
      <button type="button" onClick={() => void saveAs()} className="rounded border border-neutral-300 px-1.5 py-0.5">另存为</button>
      {error !== null ? <span className="text-red-600" title={error}>保存失败</span> : null}
    </div>
  );
}
