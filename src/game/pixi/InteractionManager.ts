export class InteractionManager {
  private disposers: Array<() => void> = [];

  add(disposer: () => void) {
    this.disposers.push(disposer);
  }

  destroy() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
  }
}
