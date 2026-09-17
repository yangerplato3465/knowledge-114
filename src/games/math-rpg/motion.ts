import type { BattleSnapshot } from './session';

export type Side = 'hero' | 'enemy';
export interface Pose { x: number; y: number; rotation: number; alpha: number; tint: number }
type Action = { kind: 'attack' | 'hurt' | 'die'; start: number };
const idle = (): Pose => ({ x: 0, y: 0, rotation: 0, alpha: 1, tint: 0xffffff });

/** Visual-only clock: no battle state writes or completion callbacks. */
export class BattleMotion {
  private actions: Partial<Record<Side, Action>> = {};
  private dead = new Set<Side>();
  private question = -1;
  private key = '';
  private reduced = false;
  private pausedAt: number | null = null;
  private offset = 0;
  constructor(private readonly now = () => performance.now()) {}
  time() { return (this.pausedAt ?? this.now()) - this.offset; }
  setPaused(paused: boolean) {
    if (paused && this.pausedAt === null) this.pausedAt = this.now();
    if (!paused && this.pausedAt !== null) { this.offset += this.now() - this.pausedAt; this.pausedAt = null; }
  }
  attackProgress(side: Side) {
    const action = this.actions[side];
    return !this.reduced && action?.kind === 'attack' ? Math.min(1, Math.max(0, (this.time() - action.start) / 520)) : 1;
  }
  reset() { this.actions = {}; this.dead.clear(); this.key = ''; }
  setReducedMotion(enabled: boolean) {
    this.reduced = enabled;
    // Do not resume interrupted decorations when the preference is switched back.
    if (enabled) this.actions = {};
  }
  update(snapshot: BattleSnapshot) {
    if (snapshot.questionId !== this.question) { this.reset(); this.question = snapshot.questionId; }
    const key = `${snapshot.questionId}:${snapshot.phase}:${snapshot.cue}`;
    if (key === this.key) return;
    this.key = key;
    const start = this.time();
    const act = (side: Side, kind: Action['kind']) => {
      if (kind === 'die') this.dead.add(side);
      if (!this.reduced) this.actions[side] = { kind, start };
    };
    if (snapshot.phase === 'resolving' && snapshot.cue === null) act(snapshot.state.combo > 0 ? 'hero' : 'enemy', 'attack');
    if (snapshot.cue === 'impact' && !snapshot.hit?.blocked) act(snapshot.state.combo > 0 ? 'enemy' : 'hero', 'hurt');
    if (snapshot.cue === 'player-defeated') act('hero', 'die');
    if (snapshot.cue === 'enemy-defeated') act('enemy', 'die');
    // Late renderer initialization must still show an already finished defeat.
    if (snapshot.phase === 'defeat') this.dead.add('hero');
    if (snapshot.phase === 'victory' || snapshot.phase === 'upgrade') this.dead.add('enemy');
  }
  pose(side: Side): Pose {
    const pose = idle();
    const action = this.actions[side];
    const direction = side === 'hero' ? 1 : -1;
    if (!action || this.reduced) {
      if (this.dead.has(side)) pose.alpha = .3;
      return pose;
    }
    const duration = action.kind === 'attack' ? 520 : action.kind === 'hurt' ? 320 : 700;
    const t = Math.max(0, Math.min(1, (this.time() - action.start) / duration));
    if (action.kind === 'attack') {
      pose.x = direction * Math.sin(Math.PI * t);
      pose.rotation = direction * .08 * Math.sin(Math.PI * t);
    } else if (action.kind === 'hurt') {
      pose.x = -direction * .35 * Math.sin(Math.PI * t);
      pose.tint = t < .5 ? 0xffb3a7 : 0xffffff;
    } else {
      pose.y = t * .12;
      pose.rotation = -direction * .3 * t;
      pose.alpha = 1 - .7 * t;
    }
    if (t === 1 && action.kind !== 'die') delete this.actions[side];
    return pose;
  }
}
