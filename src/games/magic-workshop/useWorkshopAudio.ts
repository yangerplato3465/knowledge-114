import { useEffect, useRef } from 'react';
import { createWorkshopAudio, soundCues } from './workshop-audio';
import type { GameEvent, GameState } from './session';
import { createWorkshopMusic } from './workshop-music';

export function useWorkshopAudio() {
  const audio = useRef<ReturnType<typeof createWorkshopAudio> | null>(null);
  const music = useRef<ReturnType<typeof createWorkshopMusic> | null>(null);
  useEffect(() => {
    const player = createWorkshopAudio();
    audio.current = player;
    const background = createWorkshopMusic();
    music.current = background;
    const hide = () => { if (document.hidden) player.suspend(); background.visibility(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); player.destroy(); background.destroy(); audio.current = null; music.current = null; };
  }, []);
  // Called from click / keyboard / pointer-up to unlock audio in a user gesture.
  return (game: GameState, event: GameEvent) => {
    if (event.type === 'home') music.current?.stop();
    else if (event.type === 'start' || event.type === 'practice') music.current?.start();
    else music.current?.resume();
    if (['undo', 'restart', 'home', 'start', 'practice'].includes(event.type)) audio.current?.stop();
    else audio.current?.play(soundCues(game, event));
  };
}
