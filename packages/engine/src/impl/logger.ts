import type { ILogger } from '../ports/index.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly at: string;
}

export interface MemoryLoggerOptions {
  readonly max?: number;
  /** 可选外接（例如写入 dump 或面板），不传就只留内存。 */
  readonly sink?: (entry: LogEntry) => void;
}

export interface MemoryLogger extends ILogger {
  entries(): LogEntry[];
  clear(): void;
}

/** 日志端口的无依赖实现：环形保存在内存，可选转发给 sink。 */
export function createMemoryLogger(options: MemoryLoggerOptions = {}): MemoryLogger {
  const max = options.max ?? 100;
  const entries: LogEntry[] = [];

  const push = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    const entry: LogEntry = context === undefined
      ? { level, message, at: new Date().toISOString() }
      : { level, message, context, at: new Date().toISOString() };
    entries.push(entry);
    while (entries.length > max) {
      entries.shift();
    }
    options.sink?.(entry);
  };

  return {
    debug(message, context) { push('debug', message, context); },
    info(message, context) { push('info', message, context); },
    warn(message, context) { push('warn', message, context); },
    error(message, context) { push('error', message, context); },
    entries(): LogEntry[] {
      return [...entries];
    },
    clear(): void {
      entries.length = 0;
    },
  };
}
