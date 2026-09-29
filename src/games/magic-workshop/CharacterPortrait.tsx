import { useEffect, useRef, useState } from 'react';
import { Artwork } from './Artwork';
import { REACTIONS, type ArtKey } from './art';
import { createCharacterScene, type CharacterScene } from './character-scene';

export function CharacterPortrait({ art, happy = false }: { art: ArtKey; happy?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<CharacterScene | null>(null);
  const latestHappy = useRef(happy); latestHappy.current = happy;
  const [readyArt, setReadyArt] = useState<ArtKey | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => scene.current?.motion(media.matches);
    media.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    void createCharacterScene(host.current!, art, controller.signal).then(created => {
      if (controller.signal.aborted) { created.destroy(); return; }
      window.clearTimeout(timeout);
      scene.current = created;
      created.motion(media.matches);
      created.celebrate(latestHappy.current);
      setReadyArt(art);
    }).catch(() => { window.clearTimeout(timeout); });
    return () => {
      controller.abort(); window.clearTimeout(timeout);
      media.removeEventListener('change', refresh);
      document.removeEventListener('visibilitychange', refresh);
      scene.current?.destroy(); scene.current = null;
      setReadyArt(null);
    };
  }, [art]);
  useEffect(() => { scene.current?.celebrate(happy); }, [happy]);
  return <div className="mw-character" aria-hidden="true" data-character={art} data-animated={readyArt === art}>
    <Artwork art={happy ? REACTIONS[art] ?? art : art} fallbackArt={art} width={240} height={260} className="mw-character-fallback" />
    <div ref={host} className="mw-character-canvas" />
  </div>;
}
