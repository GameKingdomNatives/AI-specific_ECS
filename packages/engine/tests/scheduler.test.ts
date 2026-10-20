import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CommandBuffer,
  defineComponent,
  EventBus,
  Scheduler,
  World,
} from '../src/core/index.js';
import type { SystemDef } from '../src/core/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });

function system(name: string, phase: SystemDef['phase'], extra: Partial<SystemDef> = {}): SystemDef {
  return {
    name,
    phase,
    reads: [],
    writes: [],
    update: () => undefined,
    ...extra,
  };
}

test('拓扑顺序遵守 before/after', () => {
  const scheduler = new Scheduler();
  scheduler.add(system('render', 'renderSync', { after: ['anim'] }));
  scheduler.add(system('anim', 'movement'));
  scheduler.add(system('input', 'input', { before: ['anim'] }));
  scheduler.build();
  const order = scheduler.orderNames;
  assert.ok(order.indexOf('input') < order.indexOf('anim'));
  assert.ok(order.indexOf('anim') < order.indexOf('render'));
});

test('环检测拒绝启动', () => {
  const scheduler = new Scheduler();
  scheduler.add(system('a', 'movement', { after: ['b'] }));
  scheduler.add(system('b', 'movement', { after: ['a'] }));
  assert.throws(() => scheduler.build(), /环/);
});

test('同阶段写冲突且未声明顺序时拒绝启动', () => {
  const scheduler = new Scheduler();
  scheduler.add(system('first', 'movement', { writes: [Position] }));
  scheduler.add(system('second', 'movement', { writes: [Position] }));
  assert.throws(() => scheduler.build(), /冲突/);
});

test('声明顺序后允许写冲突', () => {
  const scheduler = new Scheduler();
  scheduler.add(system('first', 'movement', { writes: [Position], before: ['second'] }));
  scheduler.add(system('second', 'movement', { writes: [Position] }));
  scheduler.build();
  assert.deepEqual(scheduler.orderNames, ['first', 'second']);
});

test('阶段内按顺序执行，阶段末统一 flush 命令', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const seen: string[] = [];
  const scheduler = new Scheduler();
  scheduler.add(
    system('spawner', 'ai', {
      update: (ctx) => {
        ctx.commands.spawn([[Position, { x: 1, y: 1 }]]);
        seen.push('spawner');
      },
    }),
  );
  scheduler.add(
    system('reader', 'movement', {
      reads: [Position],
      update: (ctx) => {
        seen.push(`reader:${ctx.world.query(Position).length}`);
      },
    }),
  );
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(seen, ['spawner', 'reader:1']);
  assert.equal(commands.size, 0);
});
