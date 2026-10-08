export const COVER_ART = {
  background: { file: 'background-v2.webp' },
  liwei: { file: 'liwei-standing-v1.webp', bounds: [104, 103, 957, 1432], foot: 1432 },
  heen: { file: 'heen-standing-v1.webp', bounds: [40, 93, 1009, 1449], foot: 1449 },
} as const;
export const coverArtUrl = (file: string) => `${import.meta.env.BASE_URL}assets/images/math-rpg/cover/${file}`;
