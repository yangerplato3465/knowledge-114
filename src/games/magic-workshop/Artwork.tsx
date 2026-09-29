import { ART, artUrl, fitArt, type ArtKey } from './art';
import { useState } from 'react';

/** Full source canvas is positioned intact; only transparent padding extends outside the view. */
export function Artwork({ art, fallbackArt, className = '', width = 240, height = 240 }: { art: ArtKey; fallbackArt?: ArtKey; className?: string; width?: number; height?: number }) {
  const [failed, setFailed] = useState<ArtKey | null>(null);
  const spec = ART[failed === art && fallbackArt ? fallbackArt : art];
  const fit = fitArt(spec, width, height);
  return <svg className={`mw-art ${className}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
    <image href={artUrl(spec.file)} x={fit.x} y={fit.y} width={fit.size} height={fit.size} onError={() => { if (fallbackArt && failed !== art) setFailed(art); }} />
  </svg>;
}
