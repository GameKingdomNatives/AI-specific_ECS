import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Scene, SceneNode } from '@itb/engine/scene';
import type { AssetEntry } from '@itb/engine/data';
import { SceneTree } from './SceneTree.js';
import { Inspector } from './Inspector.js';
import { ScheduleEditor } from './ScheduleEditor.js';
import { AssetBrowser } from './AssetBrowser.js';
import { EditorPanel } from './EditorPanel.js';
import type { EditorApi } from './use-editor.js';

const scene: Scene = {
  schemaVersion: 1,
  name: 'demo',
  resources: { playerTex: 'player', boxTex: 'box' },
  nodes: [
    { id: 'root', name: 'root' },
    { id: 'spawner', name: 'ambient spawner', parentId: 'root', components: { BoxSpawner: { count: 64, minSize: 8, maxSize: 14, speed: 1 } } },
    { id: 'player', name: 'player', parentId: 'root', assets: { texture: 'playerTex' }, components: { Position: { x: 960, y: 540 }, Box: { size: 22 } } },
  ],
  systems: [
    { id: 'scene.spawner', phase: 'ai' },
    { id: 'demo.movement', phase: 'movement' },
  ],
};

const entries: readonly AssetEntry[] = [
  { name: 'player', file: 'player.png', width: 48, height: 48 },
  { name: 'box', file: 'box.png', width: 24, height: 24 },
];

const noop = (): void => undefined;

const scheduleActions = {
  add: noop,
  remove: noop,
  setPhase: noop,
  setEnabled: noop,
  setAfter: noop,
  setParam: noop,
};

const inspectorNode: SceneNode = {
  id: 'player',
  name: 'player',
  parentId: 'root',
  assets: { texture: 'playerTex' },
  components: { Position: { x: 960, y: 540 }, Box: { size: 22 } },
};

const fakeEditor: EditorApi = {
  scene,
  selected: 'player',
  issue: null,
  select: noop,
  getScene: () => scene,
  addChild: noop,
  removeSelected: noop,
  renameSelected: noop,
  moveSelected: noop,
  setField: noop,
  addComp: noop,
  attach: noop,
  schedule: scheduleActions,
  preview: true,
  setPreview: noop,
  applyNow: () => ({ ok: true, issues: [] }),
  reload: noop,
};

const meta = {
  title: 'Editor/场景编辑器部件',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

export const SceneTreeView: StoryObj<typeof meta> = {
  name: '场景树',
  render: () => <div className="w-80"><SceneTree scene={scene} selected="player" onSelect={noop} onAdd={noop} onRemove={noop} /></div>,
};

export const InspectorView: StoryObj<typeof meta> = {
  name: '检查器（元数据表单）',
  render: () => (
    <div className="w-80">
      <Inspector scene={scene} node={inspectorNode} onRename={noop} onMove={noop} onField={noop} onAddComp={noop} onAttachAsset={noop} />
    </div>
  ),
};

export const ScheduleEditorView: StoryObj<typeof meta> = {
  name: '调度图',
  render: () => <div className="w-80"><ScheduleEditor scene={scene} actions={scheduleActions} /></div>,
};

export const AssetBrowserView: StoryObj<typeof meta> = {
  name: '资源浏览器',
  render: () => <div className="w-80"><AssetBrowser entries={entries} onAttach={noop} /></div>,
};

export const FullPanelView: StoryObj<typeof meta> = {
  name: '完整编辑器面板',
  render: () => <div className="h-[760px] w-[400px]"><EditorPanel editor={fakeEditor} entries={entries} /></div>,
};
