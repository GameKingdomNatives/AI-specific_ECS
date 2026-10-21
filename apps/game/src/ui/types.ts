/** UI 意图：组件只回调，不持有引擎对象。 */
export interface UiIntents {
  readonly save: () => void;
  readonly load: () => void;
  readonly clear: () => void;
  readonly exportRecording: () => void;
  readonly exportDumps: () => void;
}
