// Reviewed source defects: neighboring-frame fragments already exist inside these cells.
// Keep the original 128px canvas and anchor; only narrow the sampled rectangle.
const BOUNDS: Record<string, Record<number, readonly [number, number]>> = {
  'armored-beast-hurt-v1': { 1: [15, 128] },
  'lizard-attack-v1': { 0: [0, 110], 2: [15, 128] },
  'lizard-defeat-v1': { 1: [18, 128] },
  'colossus-attack-v1': { 0: [0, 115], 2: [16, 128] },
  'colossus-hurt-v1': { 1: [15, 128], 2: [14, 128] },
  'storm-dragon-charge-v1': { 1: [17, 128] },
  'void-king-attack-v1': { 2: [21, 128] },
};
export function frameBounds(path: string, index: number) {
  const [left, right] = BOUNDS[path.split('/').at(-1)!]?.[index] ?? [0, 128];
  return { left, width: right - left };
}
