import { applyUpgrade, drawUpgrades, effectiveRoundTime, initialBattle, spawnEnemy, type BattleState } from './model';
import { resolveTurn, type Answer, type TurnCue } from './turn';

export type BattlePhase = 'question' | 'resolving' | 'upgrade' | 'victory' | 'defeat' | 'disposed';
export interface BattleSnapshot {
  state: BattleState;
  phase: BattlePhase;
  /** Pass this token back when answering; stale question callbacks are rejected. */
  questionId: number;
  deadline: number | null;
  offers: string[];
  cue: TurnCue | null;
  hit: { damage: number; critical: boolean; blocked: boolean } | null;
  paused?: boolean;
  selectedUpgrade?: string;
  nextDeadline?: number | null;
}
export interface BattleClock {
  now(): number;
  set(callback: () => void, delay: number): unknown;
  clear(handle: unknown): void;
}
const clock: BattleClock = {
  now: () => performance.now(),
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Owns answer deadlines and low-frequency turn events, never animation frames.
 * Create per mounted game; dispose on unmount. Snapshots are detached copies.
 */
export class BattleSession {
  private value: BattleSnapshot;
  private epoch = 0;
  private timers = new Map<unknown, { due: number; run: () => void }>();
  private suspended: { delay: number; run: () => void }[] | null = null;
  private remaining = 0;
  private nextRemaining = 0;
  private readonly clock: BattleClock;
  private readonly random: () => number;
  private readonly notify: (snapshot: BattleSnapshot) => void;

  constructor(options: { clock?: BattleClock; random?: () => number; onChange?: (snapshot: BattleSnapshot) => void } = {}) {
    this.clock = options.clock ?? clock;
    this.random = options.random ?? Math.random;
    this.notify = options.onChange ?? (() => {});
    this.value = { state: initialBattle(), phase: 'question', questionId: 0, deadline: null, offers: [], cue: null, hit: null };
    this.openQuestion();
  }

  getSnapshot(): BattleSnapshot { return structuredClone(this.value); }

  private cancel() {
    this.epoch++;
    for (const timer of this.timers.keys()) this.clock.clear(timer);
    this.timers.clear();
    this.suspended = null;
    this.value.paused = false;
  }

  private schedule(delay: number, run: () => void) {
    const epoch = this.epoch;
    const handle = this.clock.set(() => {
      this.timers.delete(handle);
      if (epoch !== this.epoch || this.value.phase === 'disposed') return;
      run();
    }, Math.max(0, delay));
    this.timers.set(handle, { due: this.clock.now() + Math.max(0, delay), run });
  }

  private emit() {
    try { this.notify(this.getSnapshot()); }
    catch (error) { this.dispose(); throw error; }
  }

  private openQuestion() {
    this.cancel();
    this.value.phase = 'question';
    this.value.questionId++;
    this.value.deadline = this.clock.now() + effectiveRoundTime(this.value.state) * 1000;
    this.value.offers = [];
    this.value.selectedUpgrade = undefined;
    this.value.nextDeadline = null;
    const id = this.value.questionId;
    this.schedule(this.value.deadline - this.clock.now(), () => this.answer('timeout', id));
  }

  answer(answer: Answer, questionId: number): boolean {
    if (this.value.paused || this.value.phase !== 'question' || questionId !== this.value.questionId) return false;
    // A late click cannot beat an overdue timeout merely because its callback ran first.
    if (this.clock.now() >= this.value.deadline!) answer = 'timeout';
    const plan = resolveTurn(this.value.state, answer, this.random);
    this.cancel();
    this.value.phase = 'resolving';
    this.value.deadline = null;
    this.value.cue = null;
    this.value.state = plan.immediate;
    this.value.hit = { damage: plan.damage, critical: plan.critical, blocked: plan.blocked };
    const next = plan.events.find(event => event.cue === 'next-question');
    this.value.nextDeadline = next ? this.clock.now() + next.at : null;
    for (const event of plan.events) this.schedule(event.at, () => {
      this.value.state = event.state;
      this.value.cue = event.cue;
      if (event.cue === 'next-question') this.openQuestion();
      if (event.cue === 'upgrade') {
        this.cancel();
        this.value.phase = 'upgrade';
        this.value.offers = drawUpgrades(this.value.state, this.random).map(upgrade => upgrade.title);
      }
      if (event.cue === 'victory' || event.cue === 'defeat') {
        this.cancel();
        this.value.phase = event.cue;
      }
      this.emit();
    });
    this.emit();
    return true;
  }

  chooseUpgrade(title: string, animated = false): boolean {
    if (this.value.paused || this.value.selectedUpgrade || this.value.phase !== 'upgrade' || !this.value.offers.includes(title)) return false;
    const apply = () => {
      this.value.state = spawnEnemy(applyUpgrade(this.value.state, title), this.value.state.enemyIndex + 1);
      this.value.cue = null;
      this.value.hit = null;
      this.openQuestion();
      this.emit();
    };
    if (!animated) { apply(); return true; }
    this.value.selectedUpgrade = title;
    this.schedule(1200, apply);
    this.emit();
    return true;
  }

  pause(): boolean {
    if (this.value.paused || ['disposed', 'victory', 'defeat'].includes(this.value.phase)) return false;
    const now = this.clock.now();
    const pending = [...this.timers.values()].map(item => ({ delay: Math.max(0, item.due - now), run: item.run }));
    this.remaining = Math.max(0, (this.value.deadline ?? now) - now);
    this.nextRemaining = Math.max(0, (this.value.nextDeadline ?? now) - now);
    this.cancel(); this.suspended = pending; this.value.paused = true;
    this.value.deadline = null; this.value.nextDeadline = null;
    this.emit(); return true;
  }

  resume(): boolean {
    if (!this.value.paused || !this.suspended) return false;
    const pending = this.suspended; this.suspended = null; this.value.paused = false;
    if (this.value.phase === 'question') this.value.deadline = this.clock.now() + this.remaining;
    if (this.nextRemaining > 0) this.value.nextDeadline = this.clock.now() + this.nextRemaining;
    for (const item of pending) this.schedule(item.delay, item.run);
    this.emit(); return true;
  }

  reset(): boolean {
    if (this.value.phase === 'disposed') return false;
    this.value.state = initialBattle();
    this.value.cue = null;
    this.value.hit = null;
    this.openQuestion();
    this.emit();
    return true;
  }

  dispose() {
    this.cancel();
    this.value.phase = 'disposed';
    this.value.deadline = null;
    this.value.offers = [];
  }
}
