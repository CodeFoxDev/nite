export class Once {
  hasRun = false;
  constructor() {}
  async run(cb: Function) {
    if (this.hasRun) return;
    await cb();
    this.hasRun = true;
  }
}
