import type { createDumpSink } from 'agent-specific_ecs/diagnostics';
import type { createMemoryLogger } from 'agent-specific_ecs/logger';
import type { IAudio } from 'agent-specific_ecs/ports';

export interface SystemErrorDeps {
  readonly logger: ReturnType<typeof createMemoryLogger>;
  readonly dumpSink: ReturnType<typeof createDumpSink>;
  readonly audio: IAudio;
}

/** 单系统崩溃处理：日志 / dump / 错误音。依赖晚绑定，创建时不必等音频与日志就绪。 */
export function createSystemErrorHandler(): {
  bind: (deps: SystemErrorDeps) => void;
  handle: (system: string, error: unknown, tick: number) => void;
} {
  let deps: SystemErrorDeps | undefined;
  return {
    bind(next) {
      deps = next;
    },
    handle(system, error, tick) {
      if (deps === undefined) return;
      const stack = error instanceof Error ? (error.stack ?? '') : '';
      deps.logger.error('system failed', { system, tick, message: String(error) });
      deps.dumpSink.record({ system, tick, message: String(error), stack });
      deps.dumpSink.persist();
      deps.audio.play('error');
    },
  };
}
