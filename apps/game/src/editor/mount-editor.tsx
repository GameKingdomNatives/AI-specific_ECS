import { createRoot } from 'react-dom/client';
import { EditorPanelLive } from './EditorPanel.js';

/** 编辑器独立挂载点：只在 ?editor=1 时由 UI 层动态引入。 */
export function mountEditor(): void {
  const host = document.createElement('div');
  host.id = 'editor-root';
  document.body.appendChild(host);
  createRoot(host).render(<EditorPanelLive />);
}
