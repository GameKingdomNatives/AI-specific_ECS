/** 调试叠加层命令的纯解析器：line / circle / rect，可选 #rrggbb 颜色。 */
export interface DebugLine {
  readonly kind: 'line';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: number;
}

export interface DebugCircle {
  readonly kind: 'circle';
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: number;
}

export interface DebugRect {
  readonly kind: 'rect';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number;
}

export type DebugCommand = DebugLine | DebugCircle | DebugRect;

export const DEFAULT_DEBUG_COLOR = 0xff5a3c;

function parseColor(part: string | undefined): number {
  if (part === undefined || !/^#[0-9a-fA-F]{6}$/.test(part)) {
    return DEFAULT_DEBUG_COLOR;
  }
  return Number.parseInt(part.slice(1), 16);
}

function numbers(parts: readonly string[]): number[] | null {
  const values = parts.map((part) => Number(part));
  return values.every((value) => Number.isFinite(value)) ? values : null;
}

function parseLine(args: readonly string[], color: number): DebugLine | null {
  const values = args.length === 4 ? numbers(args) : null;
  if (values === null) return null;
  return { kind: 'line', x1: values[0] as number, y1: values[1] as number, x2: values[2] as number, y2: values[3] as number, color };
}

function parseCircle(args: readonly string[], color: number): DebugCircle | null {
  const values = args.length === 3 ? numbers(args) : null;
  if (values === null) return null;
  return { kind: 'circle', x: values[0] as number, y: values[1] as number, radius: values[2] as number, color };
}

function parseRect(args: readonly string[], color: number): DebugRect | null {
  const values = args.length === 4 ? numbers(args) : null;
  if (values === null) return null;
  return { kind: 'rect', x: values[0] as number, y: values[1] as number, width: values[2] as number, height: values[3] as number, color };
}

const PARSERS = { line: parseLine, circle: parseCircle, rect: parseRect } as const;

export function parseDebugCommand(command: string): DebugCommand | null {
  const tokens = command.trim().split(/\s+/);
  const kind = tokens[0] as keyof typeof PARSERS | undefined;
  const parser = kind === undefined ? null : PARSERS[kind] ?? null;
  if (parser === null) {
    return null;
  }
  return parser((tokens[1] ?? '').split(','), parseColor(tokens[2]));
}

export function parseDebugCommands(commands: readonly string[]): DebugCommand[] {
  const out: DebugCommand[] = [];
  for (const command of commands) {
    const parsed = parseDebugCommand(command);
    if (parsed !== null) {
      out.push(parsed);
    }
  }
  return out;
}
