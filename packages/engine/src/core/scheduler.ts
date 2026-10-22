import type { ComponentDef } from './types.js';
import type { World } from './world.js';
import type { CommandBuffer } from './commands.js';
import type { EventBus } from './events.js';
import type { SchedulerOptions } from './scheduler-types.js';

export const PHASES = ['input', 'ai', 'movement', 'collision', 'damage', 'cleanup', 'renderSync'] as const;

export type Phase = (typeof PHASES)[number];

export interface SystemContext {
  readonly world: World;
  readonly commands: CommandBuffer;
  readonly bus: EventBus;
  readonly tick: number;
}

export interface SystemDef {
  readonly name: string;
  readonly phase: Phase;
  readonly reads: readonly ComponentDef[];
  readonly writes: readonly ComponentDef[];
  readonly after?: readonly string[];
  readonly before?: readonly string[];
  readonly update: (ctx: SystemContext) => void;
  /** 自绘叠加层命令（`line x1,y1,x2,y2`），只在调试开关打开时被收集。 */
  readonly debugDraw?: (ctx: SystemContext) => readonly string[];
  /** 热替换或卸载时回收系统资源；调用方保证在停止 update 后执行。 */
  readonly dispose?: () => void;
}

/**
 * 调度器：依赖图 + 阶段。
 * 规则：只认显式 before/after；未声明顺序的两个系统若存在读写冲突，直接拒绝启动。
 */
export class Scheduler {
  private readonly systems = new Map<string, SystemDef>();
  private ordered: SystemDef[] = [];
  private ready = false;
  private readonly failures = new Map<string, number>();
  private readonly disabled = new Set<string>();
  private invalidGame = false;
  private readonly maxFailures: number;
  private readonly onError: SchedulerOptions['onSystemError'];
  private readonly enforceWrites: boolean;

  constructor(options: SchedulerOptions = {}) {
    this.maxFailures = options.maxConsecutiveFailures ?? 3;
    this.onError = options.onSystemError;
    this.enforceWrites = options.enforceWrites === true;
  }

  /** 已熔断的系统名：隔离发生在系统边界，其余系统照常运行。 */
  get disabledSystems(): readonly string[] {
    return [...this.disabled];
  }

  /** §9 脏局规则：任一系统熔断后整局标记 invalid（录制不再参与哈希回归）。 */
  get invalid(): boolean {
    return this.invalidGame;
  }

  /** 逆序回收系统资源并清空注册表；单个 dispose 抛错不阻断其余清理。 */
  dispose(): void {
    const list = this.ordered.length > 0 ? this.ordered : [...this.systems.values()];
    for (let index = list.length - 1; index >= 0; index -= 1) {
      try {
        list[index]?.dispose?.();
      } catch {
        // HMR/卸载路径不以 dispose 错误为致命错误，继续清理其余系统。
      }
    }
    this.systems.clear();
    this.ordered = [];
    this.ready = false;
    this.failures.clear();
    this.disabled.clear();
    this.invalidGame = false;
  }

  failureCount(systemName: string): number {
    return this.failures.get(systemName) ?? 0;
  }

  add(system: SystemDef): this {
    if (this.systems.has(system.name)) {
      throw new Error(`系统重名：${system.name}`);
    }
    this.systems.set(system.name, system);
    this.ready = false;
    return this;
  }

  build(): void {
    this.validateRefs();
    this.ordered = this.topologicalOrder();
    this.validateConflicts(this.ordered);
    this.ready = true;
  }

  get orderNames(): readonly string[] {
    return this.ordered.map((system) => system.name);
  }

  run(world: World, bus: EventBus, commands: CommandBuffer, tick: number): void {    if (!this.ready) {
      this.build();
    }
    bus.setTick(tick);
    const ctx: SystemContext = { world, commands, bus, tick };
    for (const phase of PHASES) {
      for (const system of this.ordered) {
        if (system.phase !== phase || this.disabled.has(system.name)) {
          continue;
        }
        if (this.enforceWrites) {
          world.beginWriteScope(system.writes);
        }
        try {
          system.update(ctx);
          this.failures.set(system.name, 0);
        } catch (error) {
          this.registerFailure(system, error, tick);
        } finally {
          if (this.enforceWrites) {
            world.endWriteScope();
          }
        }
      }
      commands.flush(world);
      bus.flushDeferred();
    }
  }

  /** 收集启用系统的自绘命令；单个系统抛错只丢弃它的命令。 */
  collectDebug(world: World, bus: EventBus, commands: CommandBuffer, tick: number): readonly string[] {
    if (!this.ready) {
      this.build();
    }
    const ctx: SystemContext = { world, commands, bus, tick };
    const out: string[] = [];
    for (const system of this.ordered) {
      if (this.disabled.has(system.name) || system.debugDraw === undefined) {
        continue;
      }
      try {
        out.push(...system.debugDraw(ctx));
      } catch {
        // 调试绘制失败不影响运行与其它系统的叠加层。
      }
    }
    return out;
  }

  private registerFailure(system: SystemDef, error: unknown, tick: number): void {
    const count = (this.failures.get(system.name) ?? 0) + 1;
    this.failures.set(system.name, count);
    this.onError?.(system.name, error, tick);
    if (count >= this.maxFailures) {
      this.disabled.add(system.name);
      this.invalidGame = true;
    }
  }

  private validateRefs(): void {
    for (const system of this.systems.values()) {
      for (const ref of [...(system.after ?? []), ...(system.before ?? [])]) {
        if (!this.systems.has(ref)) {
          throw new Error(`系统 ${system.name} 声明了不存在的依赖：${ref}`);
        }
      }
    }
  }

  private topologicalOrder(): SystemDef[] {
    const { edges, indegree } = this.buildGraph();
    return this.kahn(edges, indegree);
  }

  private buildGraph(): { edges: Map<string, Set<string>>; indegree: Map<string, number> } {
    const edges = new Map<string, Set<string>>();
    const indegree = new Map<string, number>();
    for (const name of this.systems.keys()) {
      edges.set(name, new Set<string>());
      indegree.set(name, 0);
    }
    for (const system of this.systems.values()) {
      for (const dep of system.after ?? []) {
        this.connect(edges, indegree, dep, system.name);
      }
      for (const dep of system.before ?? []) {
        this.connect(edges, indegree, system.name, dep);
      }
    }
    return { edges, indegree };
  }

  private kahn(edges: Map<string, Set<string>>, indegree: Map<string, number>): SystemDef[] {
    const queue = [...this.systems.keys()].filter((name) => (indegree.get(name) ?? 0) === 0);
    const result: SystemDef[] = [];
    while (queue.length > 0) {
      const name = queue.shift() as string;
      const system = this.systems.get(name);
      if (system !== undefined) {
        result.push(system);
      }
      for (const next of edges.get(name) ?? []) {
        const value = (indegree.get(next) ?? 0) - 1;
        indegree.set(next, value);
        if (value === 0) {
          queue.push(next);
        }
      }
    }
    if (result.length !== this.systems.size) {
      throw new Error('系统依赖图存在环，无法排序');
    }
    return result;
  }

  private connect(
    edges: Map<string, Set<string>>,
    indegree: Map<string, number>,
    from: string,
    to: string,
  ): void {
    const set = edges.get(from);
    if (set === undefined || set.has(to)) {
      return;
    }
    set.add(to);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }

  private validateConflicts(order: SystemDef[]): void {
    for (let i = 0; i < order.length; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) {
        const a = order[i] as SystemDef;
        const b = order[j] as SystemDef;
        if (a.phase !== b.phase) {
          continue;
        }
        if (!this.conflicts(a, b)) {
          continue;
        }
        if (!this.hasPath(a.name, b.name)) {
          throw new Error(
            `系统 ${a.name} 与 ${b.name} 在同一阶段存在组件读写冲突，必须在 before/after 中显式声明顺序`,
          );
        }
      }
    }
  }

  private conflicts(a: SystemDef, b: SystemDef): boolean {
    const aWrite = new Set(a.writes.map((def) => def.name));
    const bWrite = new Set(b.writes.map((def) => def.name));
    for (const name of bWrite) {
      if (aWrite.has(name)) {
        return true;
      }
    }
    for (const def of b.reads) {
      if (aWrite.has(def.name)) {
        return true;
      }
    }
    for (const def of a.reads) {
      if (bWrite.has(def.name)) {
        return true;
      }
    }
    return false;
  }

  private hasPath(from: string, to: string): boolean {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (current === to) {
        return true;
      }
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
      const system = this.systems.get(current);
      for (const dep of system?.before ?? []) {
        stack.push(dep);
      }
      for (const [name, candidate] of this.systems) {
        if (candidate.after?.includes(current) === true) {
          stack.push(name);
        }
      }
    }
    return false;
  }
}
