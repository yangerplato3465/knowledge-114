const root = `${import.meta.env.BASE_URL}assets/images/side-scroller/`;
const decoded = new Map<string, HTMLImageElement>();
let generation = 0;
export const WORLD_IMAGES = ['background_clouds', 'background_fade_hills', 'background_fade_trees',
  'terrain_sand_block_top', 'terrain_sand_block_center', 'terrain_sand_horizontal_left',
  'terrain_sand_horizontal_middle', 'terrain_sand_horizontal_right',
  'terrain_stone_block_top', 'terrain_stone_block_center', 'terrain_stone_horizontal_left',
  'terrain_stone_horizontal_middle', 'terrain_stone_horizontal_right', 'block_red', 'block_blue',
  'gem_yellow', 'gem_green', 'gem_red', 'gem_blue'] as const;

export const imageUrl = (path: string) => `${root}${path}`;
export function worldImageUrl(name: string) {
  const folder = name.startsWith('background_') ? 'world/backgrounds'
    : name.startsWith('terrain_') ? 'world/terrain'
    : name.startsWith('block_') ? 'world/obstacles' : 'collectibles';
  return imageUrl(`${folder}/${name}.webp`);
}

/** Reuse decoded images across levels and handbook pages, never Pixi textures. */
export function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  signal.throwIfAborted();
  const cached = decoded.get(url);
  if (cached) return Promise.resolve(cached);
  const version = generation;
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => { image.onload = image.onerror = null; signal.removeEventListener('abort', aborted); };
    const aborted = () => { cleanup(); image.src = ''; reject(signal.reason); };
    image.onload = () => { cleanup(); if (version === generation) decoded.set(url, image); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error(`素材載入失敗：${url}`)); };
    signal.addEventListener('abort', aborted, { once: true }); image.src = url;
  });
}

export function clearImageCache() { generation++; decoded.clear(); }
