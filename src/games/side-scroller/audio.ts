export type SideScrollerCue = 'jump' | 'land' | 'lamp' | 'gem' | 'fall' | 'exit';

const CUES: readonly SideScrollerCue[] = ['jump', 'land', 'lamp', 'gem', 'fall', 'exit'];
// Source files vary widely in loudness; balance each cue against the quiet music master.
const CUE_VOLUME: Record<SideScrollerCue, number> = {
  jump: 0.12, land: 0.11, lamp: 0.065, gem: 0.13, fall: 0.085, exit: 0.065,
};
const base = `${import.meta.env.BASE_URL}assets/audio/side-scroller/`;
const play = (sound: HTMLAudioElement) => {
  try { void sound.play().catch(() => {}); } catch { /* Audio failure must not interrupt the game. */ }
};

/** Audio is created only after a player gesture, independently of Pixi's scene loading. */
export function createSideScrollerAudio(factory: (src: string) => HTMLAudioElement = src => new Audio(src)) {
  let music: HTMLAudioElement | null = null;
  const sounds = new Map<SideScrollerCue, HTMLAudioElement>();
  let active = false, disposed = false, musicEnabled = true, effectsEnabled = true;
  const playMusic = () => {
    if (disposed || !active || !musicEnabled || document.hidden) return;
    if (!music) {
      music = factory(`${base}music/bgm.mp3`);
      music.preload = 'none';
      music.loop = true;
      music.volume = 0.65;
    }
    if (music.paused) play(music);
  };
  return {
    start() { active = true; playMusic(); },
    cue(name: SideScrollerCue) {
      if (disposed || !active || !effectsEnabled || document.hidden || !CUES.includes(name)) return;
      let sound = sounds.get(name);
      if (!sound) {
        sound = factory(`${base}sfx/${name}.ogg`);
        sound.preload = 'none';
        sound.volume = CUE_VOLUME[name];
        sounds.set(name, sound);
      }
      sound.currentTime = 0;
      play(sound);
    },
    setMusicEnabled(enabled: boolean) { musicEnabled = enabled; if (enabled) playMusic(); else music?.pause(); },
    setEffectsEnabled(enabled: boolean) { effectsEnabled = enabled; if (!enabled) sounds.forEach(sound => sound.pause()); },
    visibility() { if (document.hidden) { music?.pause(); sounds.forEach(sound => sound.pause()); } else playMusic(); },
    destroy() {
      disposed = true; active = false;
      for (const sound of [...sounds.values(), music].filter((item): item is HTMLAudioElement => Boolean(item))) {
        sound.pause(); sound.removeAttribute('src'); sound.load();
      }
      sounds.clear(); music = null;
    },
  };
}
