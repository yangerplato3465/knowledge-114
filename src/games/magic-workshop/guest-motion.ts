/** Independent of bottle redraws: each visitor walks in, turns, then waits for delivery. */
export type GuestPhase = 'absent' | 'enter' | 'turn' | 'idle' | 'thanks' | 'leave-turn' | 'leave';
const duration: Record<GuestPhase, number> = { absent: Infinity, enter: 2100, turn: 480, idle: Infinity, thanks: 600, 'leave-turn': 400, leave: 1700 };
export class GuestMotion {
  index: number | null = null;
  desired: number | null = null;
  phase: GuestPhase = 'absent';
  elapsed = 0;
  clear() { this.desired=null;this.settle(); }
  request(index: number | null, immediate = false) {
    this.desired = index;
    if (immediate) { this.settle(); return; }
    if (this.index === null && index !== null) this.begin(index);
    else if (this.index !== index && !['thanks', 'leave-turn', 'leave'].includes(this.phase)) {
      this.phase = 'thanks'; this.elapsed = 0;
    }
  }
  private begin(index: number) { this.index = index; this.phase = 'enter'; this.elapsed = 0; }
  settle() { this.index = this.desired; this.phase = this.index === null ? 'absent' : 'idle'; this.elapsed = 0; }
  advance(ms: number) {
    this.elapsed += ms;
    while (this.elapsed >= duration[this.phase]) {
      this.elapsed -= duration[this.phase];
      if (this.phase === 'enter') this.phase = 'turn';
      else if (this.phase === 'turn') this.phase = 'idle';
      else if (this.phase === 'thanks') this.phase = 'leave-turn';
      else if (this.phase === 'leave-turn') this.phase = 'leave';
      else if (this.phase === 'leave') {
        const rest = this.elapsed;
        this.index = null; this.phase = 'absent';
        if (this.desired !== null) this.begin(this.desired);
        this.elapsed = rest;
      }
    }
  }
  pose() {
    const t = Math.min(1, this.elapsed / duration[this.phase]);
    const walking = this.phase === 'enter' || this.phase === 'leave';
    const frame = walking ? Math.floor(this.elapsed / 145) % 4 : this.phase === 'turn' || this.phase === 'leave-turn' ? 4 : 5;
    const x = this.phase === 'enter' ? 1.18 - .68 * (1 - (1-t) ** 1.3) : this.phase === 'leave' ? .5 + .68*t : .5;
    return { frame, x, facing: this.phase === 'leave' || this.phase === 'leave-turn' ? -1 : 1,
      bob: walking ? Math.sin(this.elapsed / 145 * Math.PI) * 2 : this.phase === 'thanks' ? -Math.sin(t * Math.PI) * 12 : 0,
      turnMix: this.phase === 'turn' ? Math.max(0, (t-.35)/.65) : this.phase === 'leave-turn' ? Math.max(0, 1-t*2) : this.phase === 'idle' || this.phase === 'thanks' ? 1 : 0,
      alpha: this.phase === 'enter' ? Math.min(1,t*6) : this.phase === 'leave' ? Math.min(1,(1-t)*6) : 1 };
  }
}
