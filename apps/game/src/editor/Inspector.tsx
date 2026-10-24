import type { Scene, SceneNode } from 'agent-specific_ecs/scene';
import { coerceFieldValue } from 'agent-specific_ecs/scene';
import type { ComponentMeta } from 'agent-specific_ecs/scene';
import { COMPONENT_META } from './component-meta.js';

function AssetSelect(props: {
  label: string;
  slot: 'texture' | 'audio';
  node: SceneNode;
  resources: Readonly<Record<string, string>>;
  onAttach: (slot: 'texture' | 'audio', alias: string | null) => void;
}) {
  const current = props.node.assets?.[props.slot] ?? '';
  return (
    <label className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-neutral-500">{props.label}</span>
      <select
        value={current}
        onChange={(event) => props.onAttach(props.slot, event.target.value === '' ? null : event.target.value)}
        className="w-40 rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs"
      >
        <option value="">（无）</option>
        {Object.entries(props.resources).map(([alias, name]) => (
          <option key={alias} value={alias}>{alias} → {name}</option>
        ))}
      </select>
    </label>
  );
}

function ComponentFields(props: {
  meta: ComponentMeta;
  values: Readonly<Record<string, string | number | boolean>>;
  onField: (component: string, field: string, value: number | boolean) => void;
}) {
  return (
    <>
      {props.meta.fields.map((field) => (
        <label key={field.key} className="flex items-center justify-between gap-2 py-0.5">
          <span className="text-neutral-500">{field.label}</span>
          <input
            type={field.kind === 'boolean' ? 'checkbox' : 'number'}
            checked={field.kind === 'boolean' ? props.values[field.key] === true : undefined}
            value={field.kind === 'boolean' ? undefined : String(props.values[field.key] ?? field.defaultValue)}
            min={field.kind === 'number' ? field.min : undefined}
            max={field.kind === 'number' ? field.max : undefined}
            step={field.kind === 'number' ? field.step : undefined}
            onChange={(event) => props.onField(props.meta.name, field.key, coerceFieldValue(field, field.kind === 'boolean' ? event.target.checked : Number(event.target.value)))}
            className="w-24 rounded border border-neutral-300 px-1 py-0.5 text-xs"
          />
        </label>
      ))}
    </>
  );
}

function ComponentSection(props: {
  scene: Scene;
  node: SceneNode;
  onField: (component: string, field: string, value: number | boolean) => void;
  onAdd: (component: string) => void;
}) {
  const owned = props.node.components ?? {};
  const known = new Set(COMPONENT_META.map((meta) => meta.name));
  const unknown = Object.keys(owned).filter((name) => !known.has(name));
  return (
    <div className="mt-2 space-y-2">
      {COMPONENT_META.map((meta) => {
        const values = owned[meta.name];
        if (values === undefined) {
          return (
            <button key={meta.name} type="button" onClick={() => props.onAdd(meta.name)} className="mr-1 rounded border border-dashed border-neutral-300 px-1.5 py-0.5 text-[11px] text-neutral-500">
              + {meta.label}
            </button>
          );
        }
        return (
          <fieldset key={meta.name} className="rounded border border-neutral-200 p-1.5">
            <legend className="px-1 text-[11px] text-neutral-500">{meta.label} · {meta.name}</legend>
            <ComponentFields meta={meta} values={values} onField={props.onField} />
          </fieldset>
        );
      })}
      {unknown.length > 0 ? (
        <div className="rounded border border-dashed border-neutral-300 p-1.5 text-[10px] text-neutral-400">
          未登记组件（只读）：{unknown.join('、')}
        </div>
      ) : null}
    </div>
  );
}

export function Inspector(props: {
  scene: Scene;
  node: SceneNode;
  onRename: (name: string) => void;
  onMove: (parentId: string | null) => void;
  onField: (component: string, field: string, value: number | boolean) => void;
  onAddComp: (component: string) => void;
  onAttachAsset: (slot: 'texture' | 'audio', alias: string | null) => void;
}) {
  const resources = props.scene.resources ?? {};
  return (
    <section className="mt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">检查器 · {props.node.id}</h3>
      <label className="flex items-center justify-between gap-2 py-1">
        <span className="text-neutral-500">名称</span>
        <input value={props.node.name} onChange={(event) => props.onRename(event.target.value)} className="w-40 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
      </label>
      <label className="flex items-center justify-between gap-2 py-1">
        <span className="text-neutral-500">父节点</span>
        <select value={props.node.parentId ?? ''} onChange={(event) => props.onMove(event.target.value === '' ? null : event.target.value)} className="w-40 rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs">
          <option value="">（根）</option>
          {props.scene.nodes.filter((node) => node.id !== props.node.id).map((node) => (
            <option key={node.id} value={node.id}>{node.name}</option>
          ))}
        </select>
      </label>
      <AssetSelect label="贴图" slot="texture" node={props.node} resources={resources} onAttach={props.onAttachAsset} />
      <AssetSelect label="音频" slot="audio" node={props.node} resources={resources} onAttach={props.onAttachAsset} />
      <ComponentSection scene={props.scene} node={props.node} onField={props.onField} onAdd={props.onAddComp} />
    </section>
  );
}
