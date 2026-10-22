import { useCallback, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import type { UiIntents } from './App.js';
import type { UiStore } from './snapshot.js';

/** React 外部 store 桥：UiSnapshot 只读，更新由引擎降频推送。 */
function UiRoot(props: { store: UiStore; intents: UiIntents }) {
  const subscribe = useCallback((listener: () => void) => props.store.subscribe(listener), [props.store]);
  const snapshot = useSyncExternalStore(subscribe, props.store.get, props.store.get);
  return <App snapshot={snapshot} intents={props.intents} />;
}

/** 挂载 React 覆盖层；返回卸载函数，供 HMR 或退出时清理。 */
export function mountUi(store: UiStore, intents: UiIntents): () => void {
  const element = document.getElementById('ui-root');
  if (element === null) {
    return () => undefined;
  }
  const root = createRoot(element);
  root.render(<UiRoot store={store} intents={intents} />);
  if (new URLSearchParams(location.search).has('editor')) {
    void import('../editor/mount-editor.js').then((module) => module.mountEditor());
  }
  return () => root.unmount();
}
