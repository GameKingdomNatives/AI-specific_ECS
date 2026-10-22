/** 收集启用系统的自绘命令；单个系统抛错只丢弃它的命令（泛型避免与调度器循环依赖）。 */
export interface DebugSystem<TContext> {
  readonly name: string;
  readonly debugDraw?: (ctx: TContext) => readonly string[];
}

export function collectDebugCommands<TContext>(
  systems: readonly DebugSystem<TContext>[],
  disabled: ReadonlySet<string>,
  ctx: TContext,
): readonly string[] {
  const out: string[] = [];
  for (const system of systems) {
    if (disabled.has(system.name) || system.debugDraw === undefined) {
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
