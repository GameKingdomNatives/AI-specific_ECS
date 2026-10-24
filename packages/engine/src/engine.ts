import { FixedClock } from './core/clock.js';
import { CommandBuffer } from './core/commands.js';
import { EventBus } from './core/events.js';
import { Scheduler, type SystemDef } from './core/scheduler.js';
import type { SchedulerOptions } from './core/scheduler-types.js';
import { World } from './core/world.js';

export interface EngineOptions {
  readonly fixedStepMs?: number;
  readonly maxStepsPerFrame?: number;
  readonly scheduler?: SchedulerOptions;
  readonly systems?: readonly SystemDef[];
}

export interface Engine {
  readonly world: World;
  readonly events: EventBus;
  readonly commands: CommandBuffer;
  readonly scheduler: Scheduler;
  readonly clock: FixedClock;
  readonly running: boolean;
  add(system: SystemDef): this;
  step(): void;
  advance(realMs: number): number;
  start(): void;
  stop(): void;
  dispose(): void;
}

class EngineImpl implements Engine {
  readonly world = new World();
  readonly events = new EventBus();
  readonly commands = new CommandBuffer();
  readonly scheduler: Scheduler;
  readonly clock: FixedClock;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: EngineOptions) {
    this.clock = new FixedClock(options.fixedStepMs, options.maxStepsPerFrame);
    this.scheduler = new Scheduler(options.scheduler);
    for (const system of options.systems ?? []) this.scheduler.add(system);
    this.scheduler.build();
  }

  get running(): boolean {
    return this.timer !== null;
  }

  add(system: SystemDef): this {
    this.scheduler.add(system);
    this.scheduler.build();
    return this;
  }

  step(): void {
    this.clock.stepOnce();
    this.scheduler.run(this.world, this.events, this.commands, this.clock.tick);
  }

  advance(realMs: number): number {
    const first = this.clock.tick;
    const steps = this.clock.advance(realMs);
    for (let index = 0; index < steps; index += 1) {
      this.scheduler.run(this.world, this.events, this.commands, first + index + 1);
    }
    return steps;
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      this.advance(this.clock.stepMs);
    }, this.clock.stepMs);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  dispose(): void {
    this.stop();
    this.scheduler.dispose();
  }
}

/**
 * 单一入口：创建核心运行时（World/EventBus/CommandBuffer/Scheduler/FixedClock）。
 * 渲染、物理、输入等适配器由调用方按需接入，不在门面里绑定具体平台。
 */
export function createEngine(options: EngineOptions = {}): Engine {
  return new EngineImpl(options);
}
