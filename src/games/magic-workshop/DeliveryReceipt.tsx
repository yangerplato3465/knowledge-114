import { useEffect } from 'react';
import { CharacterPortrait } from './CharacterPortrait';
import { Artwork } from './Artwork';
import type { ArtKey } from './art';
import { RECEIPT_MS } from './motion';

export interface Receipt { art: ArtKey; name: string; version: number; dialogue: { thanks: string } }

/** Delivery never gates the reducer or the next puzzle's controls. */
export function DeliveryReceipt({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, RECEIPT_MS);
    const hide = () => { if (document.hidden) onDone(); };
    document.addEventListener('visibilitychange', hide);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', hide); };
  }, [receipt.version, onDone]);
  return <aside className="mw-receipt" data-speaker={receipt.art} aria-label="交付回饋">
    <div className="mw-receipt-art" aria-hidden="true"><CharacterPortrait art={receipt.art} happy />
      <Artwork art="gift" className="mw-delivery-potion" /><span className="mw-receipt-spark">✦</span></div>
    <p role="status"><strong>{receipt.name}收到了！</strong><span>{receipt.dialogue.thanks}</span></p>
    <button type="button" onClick={onDone} aria-label="略過收藥演出">×</button>
  </aside>;
}
