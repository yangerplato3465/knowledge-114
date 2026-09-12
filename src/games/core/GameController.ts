export interface GameController {
  mount(container: HTMLElement): Promise<void>;
  resize(): void;
  pause(): void;
  resume(): void;
  /** 清理已取得的資源；mount 失敗時也必須可呼叫。 */
  destroy(): void;
}
