import type { UiSnapshot } from './snapshot.js';
import { ControlBar } from './ControlBar.js';
import type { UiIntents } from './types.js';

export type { UiIntents } from './types.js';

/** 纯展示：只读快照 + 意图回调，不持有引擎对象，也不直接改世界。 */
export function App({ snapshot, intents }: { snapshot: UiSnapshot; intents: UiIntents }) {
  return (
    <div className="fixed left-4 top-3.5">
      <ControlBar snapshot={snapshot} intents={intents} />
    </div>
  );
}
