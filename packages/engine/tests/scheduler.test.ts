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

test('systemTimings 记录每系统耗时，未运行不出现', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const scheduler = new Scheduler();
  scheduler.add(system('one', 'ai', { update: () => undefined }));
  scheduler.add(system('two', 'movement', { update: () => undefined }));
  assert.deepEqual(scheduler.systemTimings(), []);
  scheduler.run(world, bus, commands, 1);
  scheduler.run(world, bus, commands, 2);
  const timings = scheduler.systemTimings();
  assert.deepEqual(timings.map((entry) => entry.system), ['one', 'two']);
  for (const entry of timings) {
    assert.equal(entry.count, 2);
    assert.ok(entry.last >= 0);
    assert.ok(entry.avg >= 0);
  }
});

test('enforceWrites 拦截未声明的写入，合法声明放行', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  const errors: string[] = [];
  let rogueTicks = 0;
  let legalTicks = 0;
  const scheduler = new Scheduler({
    enforceWrites: true,
    maxConsecutiveFailures: 5,
    onSystemError: (name) => errors.push(name),
  });
  scheduler.add(
    system('rogue', 'ai', {
      update: (ctx) => {
        rogueTicks += 1;
        ctx.world.set(entity, Position, { x: 99, y: 99 });
      },
    }),
  );
  scheduler.add(
    system('legal', 'movement', {
      writes: [Position],
      update: (ctx) => {
        legalTicks += 1;
        ctx.world.set(entity, Position, { x: 1, y: 2 });
      },
    }),
  );
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(errors, ['rogue']);
  assert.equal(rogueTicks, 1);
  assert.equal(legalTicks, 1);
  assert.deepEqual(world.get(entity, Position), { x: 1, y: 2 });
});

test('collectDebug 只收集启用系统的命令，单个抛错不影响其它', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const scheduler = new Scheduler({ maxConsecutiveFailures: 1 });
  scheduler.add(
    system('aim', 'ai', {
      debugDraw: () => ['line 0,0,10,10'],
    }),
  );
  scheduler.add(
    system('broken', 'ai', {
      debugDraw: () => {
        throw new Error('debug failed');
      },
      update: () => {
        throw new Error('boom');
      },
    }),
  );
  scheduler.add(system('quiet', 'movement'));
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(scheduler.collectDebug(world, bus, commands, 1), ['line 0,0,10,10']);
  assert.deepEqual(scheduler.disabledSystems, ['broken']);
});

test('dispose 逆序调用并清空系统', () => {
  const calls: string[] = [];
  const scheduler = new Scheduler();
  scheduler.add(system('a', 'input', { dispose: () => calls.push('a') }));
  scheduler.add(system('b', 'movement', { dispose: () => calls.push('b') }));
  scheduler.build();
  scheduler.dispose();
  assert.deepEqual(calls, ['b', 'a']);
  assert.equal(scheduler.orderNames.length, 0);
});

test('dispose 抛错不阻断其余系统清理', () => {
  const calls: string[] = [];
  const scheduler = new Scheduler();
  scheduler.add(
    system('bad', 'input', {
      dispose: () => {
        throw new Error('dispose failed');
      },
    }),
  );
  scheduler.add(system('good', 'movement', { dispose: () => calls.push('good') }));
  scheduler.build();
  scheduler.dispose();
  assert.deepEqual(calls, ['good']);
  assert.equal(scheduler.orderNames.length, 0);
});

test('熔断后标记 invalid，其余系统继续运行', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  let healthy = 0;
  const scheduler = new Scheduler({ maxConsecutiveFailures: 2 });
  scheduler.add(
    system('broken', 'input', {
      update: () => {
        throw new Error('boom');
      },
    }),
  );
  scheduler.add(system('healthy', 'movement', { update: () => { healthy += 1; } }));
  scheduler.run(world, bus, commands, 1);
  assert.equal(scheduler.invalid, false);
  scheduler.run(world, bus, commands, 2);
  assert.equal(scheduler.invalid, true);
  assert.deepEqual(scheduler.disabledSystems, ['broken']);
  assert.equal(healthy, 2);
});
