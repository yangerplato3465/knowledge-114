import type { GameCommand } from './game-events';

export interface GameController {
  mount(container: HTMLElement): Promise<void>;
  resize(): void;
  pause(): void;
  resume(): void;
  /** mount 完成後接收低頻指令；reduced motion 僅控制裝飾效果。 */
  dispatch(command: GameCommand): void;
  /** 清理已取得的資源；mount 失敗時也必須可呼叫。 */
  destroy(): void;
}
