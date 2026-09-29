import { applyAction, hasTarget } from './rules';
import { currentPuzzle, type GameEvent, type GameState } from './session';

export type SoundCue = 'fill' | 'pour' | 'empty' | 'success' | 'deliver';
type Note = readonly [frequency: number, start: number, duration: number, endFrequency?: number];
const NOTES: Record<SoundCue, readonly Note[]> = {
  fill: [[330, 0, .14, 510], [510, .09, .16, 760], [760, .19, .16, 990]],
  pour: [[640, 0, .12, 490], [540, .09, .12, 420], [620, .18, .14, 480]],
  empty: [[460, 0, .22, 170], [270, .12, .19, 100]],
  success: [[659, 0, .18], [831, .12, .18], [988, .24, .28]],
  deliver: [[784, 0, .15], [1047, .12, .24]],
};

/** Match the same accepted transition as the game; invalid actions are silent. */
export function soundCues(game: GameState, event: GameEvent): SoundCue[] {
  if (event.type === 'deliver') return game.screen === 'ready' ? ['deliver'] : [];
  if (event.type !== 'operate' || game.screen !== 'playing') return [];
  const puzzle = currentPuzzle(game);
  const after = applyAction(puzzle.capacities, game.amounts, event.action);
  return after ? [event.action.kind, ...(hasTarget(after, puzzle.target) ? ['success' as const] : [])] : [];
}

/** Short, quiet synthesized cues; no network assets, autoplay or background loop. */
export function createWorkshopAudio(factory: () => AudioContext = () => new AudioContext()) {
  let context: AudioContext | null = null;
  let generation = 0, disposed = false;
  const voices = new Map<OscillatorNode, GainNode>();
  const stop = () => {
    generation++;
    for (const [oscillator, gain] of voices) {
      oscillator.onended = null;
      try { oscillator.stop(); } catch { /* Already ended. */ }
      oscillator.disconnect(); gain.disconnect();
    }
    voices.clear();
  };
  const schedule = (cues: SoundCue[]) => {
    if (!context) return;
    let offset = .01;
    for (const cue of cues) {
      for (const [frequency, start, duration, endFrequency] of NOTES[cue]) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const at = context.currentTime + offset + start;
        oscillator.type = cue === 'empty' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, at);
        if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(.045, at + .012);
        gain.gain.exponentialRampToValueAtTime(.001, at + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        voices.set(oscillator, gain);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(oscillator); };
        oscillator.start(at); oscillator.stop(at + duration + .02);
      }
      offset += .38;
    }
  };
  return {
    play(cues: SoundCue[]) {
      if (disposed || !cues.length || document.hidden) return;
      stop();
      const version = generation;
      try {
        context ??= factory();
        if (context.state === 'running') schedule(cues);
        else void context.resume().then(() => {
          if (!disposed && version === generation && !document.hidden && context?.state === 'running') schedule(cues);
        }).catch(() => { if (version === generation) stop(); });
      } catch { stop(); }
    },
    stop,
    suspend() { stop(); if (context?.state === 'running') void context.suspend().catch(() => {}); },
    destroy() {
      disposed = true; stop();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      context = null;
    },
  };
}
