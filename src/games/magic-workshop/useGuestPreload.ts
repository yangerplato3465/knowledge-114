import { useEffect } from 'react';
import { ART, GUESTS, REACTIONS, artUrl } from './art';
import { loadCharacterImage } from './character-scene';
import type { GameState } from './session';

/** Only the next guest pair; no eager download of the entire cast. */
export function useGuestPreload(game: GameState) {
  const next = game.screen === 'playing' || game.screen === 'ready'
    ? game.practice ? GUESTS[0]?.art : GUESTS[game.index + 1]?.art ?? 'guide' : null;
  useEffect(() => {
    if (!next) return;
    const controller = new AbortController();
    const keys = [next, REACTIONS[next]].filter(key => key !== undefined);
    keys.forEach(key => { void loadCharacterImage(artUrl(ART[key].file), controller.signal).catch(() => {}); });
    return () => controller.abort();
  }, [next]);
}
