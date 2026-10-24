import { useState } from 'react';
import { PHASES } from 'agent-specific_ecs/core';
import type { Phase } from 'agent-specific_ecs/core';
import type { ParamField, Scene } from 'agent-specific_ecs/scene';
import { coerceParamValue } from 'agent-specific_ecs/scene';
import type { ScheduleActions } from './schedule-actions.js';
import { SYSTEM_META_BY_ID } from './system-meta.js';

function coerceParam(raw: string, previous: number | string | boolean | undefined): number | string | boolean {
  if (typeof previous === 'number' || (previous === undefined && /^-?\d+(\.\d+)?$/.test(raw))) {
    return Number(raw);
  }
  if (typeof previous === 'boolean') return raw === 'true';
  return raw;
}

function MetaParamRow(props: { id: string; field: ParamField; current: number | string | boolean | undefined; actions: ScheduleActions }) {
  const { field } = props;
  const value = props.current ?? field.defaultValue;
  const change = (raw: string | boolean): void => props.actions.setParam(props.id, field.key, coerceParamValue(field, raw));
  return (
    <div className="flex items-center gap-1 py-0.5" title={field.key}>
      <span className="w-20 truncate text-neutral-500">{field.label}</span>
      {field.kind === 'boolean'
        ? <input type="checkbox" checked={value === true} onChange={(event) => change(event.target.checked)} />
        : <input type={field.kind === 'number' ? 'number' : 'text'} value={String(value)} min={field.min} max={field.max} step={field.step}
            onChange={(event) => change(event.target.value)} className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-0.5 text-xs" />}
      <span className="w-6 text-right text-[9px] text-neutral-300">{field.kind}</span>
    </div>
  );
}

function MetaParamRows(props: { id: string; meta: NonNullable<ReturnType<typeof SYSTEM_META_BY_ID.get>>; params: Readonly<Record<string, number | string | boolean>>; actions: ScheduleActions }) {
  return (
    <div className="mt-1 rounded border border-neutral-200 p-1">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">params · schema</div>
      {props.meta.params.map((field) => (
        <MetaParamRow key={field.key} id={props.id} field={field} current={props.params[field.key]} actions={props.actions} />
      ))}
    </div>
  );
}

function ParamRows(props: { scene: Scene; id: string; actions: ScheduleActions }) {
  const system = props.scene.systems?.find((entry) => entry.id === props.id);
  const meta = SYSTEM_META_BY_ID.get(props.id);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  if (meta !== undefined) {
    return <MetaParamRows id={props.id} meta={meta} params={system?.params ?? {}} actions={props.actions} />;
  }
  const params = Object.entries(system?.params ?? {});
  return (
    <div className="mt-1 rounded border border-neutral-200 p-1">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">params · 未登记 schema</div>
      {params.map(([name, current]) => (
        <div key={name} className="flex items-center gap-1 py-0.5">
          <span className="w-20 truncate text-neutral-500">{name}</span>
          <input
            value={String(current)}
            onChange={(event) => props.actions.setParam(props.id, name, coerceParam(event.target.value, current))}
            className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-0.5 text-xs"
          />
          <button type="button" onClick={() => props.actions.setParam(props.id, name, null)} className="rounded border border-red-300 px-1 text-[10px] text-red-600">×</button>
        </div>
      ))}
      <div className="mt-1 flex items-center gap-1">
        <input value={key} onChange={(event) => setKey(event.target.value)} placeholder="key" className="w-20 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="value" className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
        <button
          type="button"
          onClick={() => { if (key.length > 0) { props.actions.setParam(props.id, key, coerceParam(value, undefined)); setKey(''); setValue(''); } }}
          className="rounded border border-neutral-300 px-1 text-[10px]"
        >+</button>
      </div>
    </div>
  );
}

function SystemCard(props: { scene: Scene; system: NonNullable<Scene['systems']>[number]; selected: boolean; onSelect: () => void }) {
  const { system } = props;
  return (
    <button type="button" onClick={props.onSelect} className={`mb-1 w-full rounded border p-1 text-left text-xs ${props.selected ? 'border-amber-400 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
      <span className="flex items-center justify-between gap-1">
        <span className="truncate font-medium text-neutral-800">{system.id}</span>
        <span className="text-[10px] text-neutral-400">{system.phase}</span>
      </span>
      <span className="mt-0.5 block text-[10px] text-neutral-500">
        {system.enabled === false ? '已禁用 · ' : ''}after: {system.after?.join(', ') || '—'}
      </span>
    </button>
  );
}

function AddSystemForm(props: { onAdd: (id: string, phase: Phase) => void }) {
  const [id, setId] = useState('');
  const [phase, setPhase] = useState<Phase>('ai');
  return (
    <div className="mt-1 flex items-center gap-1">
      <input value={id} onChange={(event) => setId(event.target.value)} placeholder="system.id" className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
      <select value={phase} onChange={(event) => setPhase(event.target.value as Phase)} className="w-24 rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs">
        {PHASES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
      </select>
      <button
        type="button"
        onClick={() => { if (id.length > 0) { props.onAdd(id, phase); setId(''); } }}
        className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px]"
      >+</button>
    </div>
  );
}

export function ScheduleEditor(props: { scene: Scene; actions: ScheduleActions }) {
  const [selected, setSelected] = useState<string | null>(null);
  const system = props.scene.systems?.find((entry) => entry.id === selected) ?? null;
  return (
    <section className="mt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">调度图 · {props.scene.systems?.length ?? 0} 系统</h3>
      <AddSystemForm onAdd={(id, phase) => props.actions.add(id, phase)} />
      <div className="mt-2 max-h-56 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-1">
        {PHASES.map((phase) => (
          <div key={phase} className="mb-1">
            <div className="mb-0.5 text-[10px] uppercase tracking-wide text-neutral-400">{phase}</div>
            {(props.scene.systems ?? []).filter((entry) => entry.phase === phase).map((entry) => (
              <SystemCard key={entry.id} scene={props.scene} system={entry} selected={entry.id === selected} onSelect={() => setSelected(entry.id)} />
            ))}
          </div>
        ))}
      </div>
      {system !== null ? (
        <div className="mt-2 rounded border border-neutral-200 bg-white p-1.5">
          <div className="flex items-center justify-between gap-1">
            <strong className="truncate text-xs text-neutral-800">{system.id}</strong>
            <button type="button" onClick={() => { props.actions.remove(system.id); setSelected(null); }} className="rounded border border-red-300 px-1 text-[10px] text-red-600">删除</button>
          </div>
          <label className="mt-1 flex items-center justify-between gap-2 py-0.5">
            <span className="text-neutral-500">阶段</span>
            <select value={system.phase} onChange={(event) => props.actions.setPhase(system.id, event.target.value as Phase)} className="w-32 rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs">
              {PHASES.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-neutral-500">启用</span>
            <input type="checkbox" checked={system.enabled !== false} onChange={(event) => props.actions.setEnabled(system.id, event.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-neutral-500">after</span>
            <input defaultValue={system.after?.join(', ') ?? ''} onBlur={(event) => props.actions.setAfter(system.id, event.target.value)} placeholder="a, b" className="w-40 rounded border border-neutral-300 px-1 py-0.5 text-xs" />
          </label>
          <ParamRows scene={props.scene} id={system.id} actions={props.actions} />
        </div>
      ) : null}
    </section>
  );
}
