/** 固定步长时钟：逻辑永远按 stepMs 推进，渲染帧率与逻辑解耦。 */
export class FixedClock {
  readonly stepMs: number;
  private readonly maxStepsPerFrame: number;
  private accumulated = 0;
  private currentTick = 0;
  private paused = false;
  private scale = 1;

  constructor(stepMs = 1000 / 60, maxStepsPerFrame = 8) {
    this.stepMs = stepMs;
    this.maxStepsPerFrame = maxStepsPerFrame;
  }

  get tick(): number {
    return this.currentTick;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** 渲染插值系数：当前累计时间占一个逻辑步的比例（0..1）。 */
  get alpha(): number {
    if (this.paused) {
      return 0;
    }
    return Math.min(1, Math.max(0, this.accumulated / this.stepMs));
  }

  /** 返回本次应执行的逻辑步数；超过上限的部分直接丢弃，避免「死亡螺旋」。 */
  advance(realMs: number): number {
    if (this.paused) {
      return 0;
    }
    this.accumulated += Math.min(realMs, 250) * this.scale;
    let steps = 0;
    while (this.accumulated >= this.stepMs && steps < this.maxStepsPerFrame) {
      this.accumulated -= this.stepMs;
      this.currentTick += 1;
      steps += 1;
    }
    if (this.accumulated > this.stepMs * this.maxStepsPerFrame) {
      this.accumulated = 0;
    }
    return steps;
  }

  /** 调试单步：不依赖真实时间。 */
  stepOnce(): void {
    this.currentTick += 1;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.accumulated = 0;
  }

  setScale(scale: number): void {
    this.scale = Math.max(0, scale);
  }

  reset(): void {
    this.accumulated = 0;
    this.currentTick = 0;
    this.paused = false;
    this.scale = 1;
  }
}
