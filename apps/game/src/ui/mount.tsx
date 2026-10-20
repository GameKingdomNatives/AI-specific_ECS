import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import type { UiIntents } from './App.js';
import type { UiStore } from './snapshot.js';

/** 挂载 React 覆盖层；返回卸载函数，供 HMR 或退出时清理。 */
export function mountUi(store: UiStore, intents: UiIntents): () => void {
  const element = document.getElementById('ui-root');
  if (element === null) {
    return () => undefined;
  }
  const root = createRoot(element);
  const render = (): void => {
    root.render(<App snapshot={store.get()} intents={intents} />);
  };
  const unsubscribe = store.subscribe(render);
  render();
  return () => {
    unsubscribe();
    root.unmount();
  };
}
