export type WorldColor = 'red' | 'blue' | 'purple';
export type ColorButton = 'red' | 'blue';
export function isLightOn(color: WorldColor | null, button: ColorButton): boolean { return color === button || color === 'purple'; }
export function toggleColor(color: WorldColor | null, button: ColorButton): WorldColor | null {
  const red = button === 'red' ? !isLightOn(color, 'red') : isLightOn(color, 'red');
  const blue = button === 'blue' ? !isLightOn(color, 'blue') : isLightOn(color, 'blue');
  return red && blue ? 'purple' : red ? 'red' : blue ? 'blue' : null;
}
export interface Platform { x: number; y: number; w: number; h: number; kind: 'ground' | 'bridge'; endY?: number; color?: WorldColor }
export interface Obstacle { x: number; y: number; w: number; h: number; color: WorldColor }
export const GEM_COLORS = ['yellow', 'green', 'red', 'blue'] as const;
export type GemColor = typeof GEM_COLORS[number];
export const GEM_NAMES: Record<GemColor, string> = { yellow: '黃', green: '綠', red: '紅', blue: '藍' };
export interface Gem { color: GemColor; x: number; y: number }
export const GEM_RADIUS = 18;
export interface Input { jump: boolean; color?: WorldColor | null }
export type Difficulty = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface Level {
  id: 'intro' | 'platforms' | 'missing-page' | 'book-spine' | 'lower-crossing' | 'late-bridges' | 'fusion' | 'color-seam' | 'folded-slope' | 'lower-seam' | 'late-seam' | 'challenge' | 'upper-bridge' | 'valley-bridge' | 'middle-bridge' | 'slope-bridge' | 'crossroads' | 'gauntlet';
  name: string; difficulty: Difficulty; focus?: string;
  width: number; platforms: readonly Platform[]; checkpoints: readonly number[];
  terrain?: 'stone'; obstacles?: readonly Obstacle[];
  gems: readonly Gem[];
  exit: { x: number; y: number; radius: number };
}
export const BODY = { half: 19, height: 60 };
export const PHYSICS = { speed: 280, gravity: 1800, jump: 680, maxFall: 1000, grace: 0.1, buffer: 0.12, step: 1 / 120 };
export const GHOST_ALPHA = 0.32;
export const OBSTACLE_GHOST_ALPHA = 0.3;
export function blocksPath(obstacle: Obstacle, color: WorldColor | null): boolean { return obstacle.color !== color; }
export function obstacleAlpha(obstacle: Obstacle, color: WorldColor | null): number { return blocksPath(obstacle, color) ? 1 : OBSTACLE_GHOST_ALPHA; }
const ground = (x: number, y: number, w: number, endY = y, color?: WorldColor): Platform => ({ x, y, w, endY, color, h: 672 - y, kind: 'ground' });
const bridge = (x: number, y: number, w: number, color?: WorldColor): Platform => ({ x, y, w, color, h: 32, kind: 'bridge' });
export const LEVEL_THREE: Level = {
  id: 'challenge', name: '斷谷高臺', difficulty: 3, focus: '跨過斷谷，登上高臺', width: 13632,
  checkpoints: [160, 2624, 5056, 7488, 11136], exit: { x: 13408, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1900, y: 382 }, { color: 'green', x: 4890, y: 386 }, { color: 'red', x: 8300, y: 478 }, { color: 'blue', x: 11880, y: 450 }],
  platforms: [
  // Easy opening: isolated red floors, normal ground between them, and one small gap.
  ground(0, 480, 640), ground(640, 480, 256, 480, 'red'), ground(896, 480, 128), ground(1152, 480, 384), ground(1536, 480, 512, 384),
  ground(2048, 384, 256, 384, 'red'), ground(2304, 384, 128), ground(2432, 544, 448),
  ground(2880, 544, 320, 544, 'red'), ground(3200, 544, 384),
  // Introduce blue in the ravine without midair color changes; normal platforms separate it.
  bridge(3712, 480, 192, 'blue'), bridge(4032, 480, 192), bridge(4352, 416, 192, 'blue'), bridge(4672, 416, 192),
  ground(4864, 416, 640),
  // Introduce purple after a normal landing platform, with a broad summit to recover.
  bridge(5632, 352, 192, 'blue'), bridge(5952, 288, 192), bridge(6272, 224, 192, 'purple'),
  ground(6528, 224, 384), ground(6912, 224, 256, 224, 'purple'),
  // A 320 px drop, safe landing, then one isolated blue floor before the final climb.
  ground(7296, 544, 512), ground(7808, 544, 256, 544, 'blue'), ground(8064, 544, 128), ground(8192, 544, 384, 416),
  // Hard section: adjoining colors with longer approach/landing room before the next jump.
  ground(8576, 416, 256, 416, 'red'), ground(8832, 416, 256, 416, 'purple'),
  // Continuous airborne color changes alternate descent and ascent, with real gaps.
  bridge(9152, 352, 192, 'blue'), bridge(9472, 416, 192, 'purple'), bridge(9792, 352, 192, 'red'),
  bridge(10112, 288, 192, 'purple'), bridge(10432, 352, 192, 'blue'), bridge(10752, 416, 192, 'purple'),
  ground(10944, 416, 320), ground(11264, 416, 512, 480), ground(11776, 480, 256, 480, 'blue'),
  ground(12160, 480, 192), ground(12352, 480, 256, 480, 'red'), ground(12608, 480, 192, 480, 'purple'),
  // A quiet, neutral approach after the last color change; no input is needed to reach the exit.
  ground(12800, 480, 832),
  ],
};
// Reorder proven third-star passages. Every section keeps its internal gaps and
// platform spacing; the short neutral connectors make each new junction readable.
function thirdSection(from: number, to: number, start: number, rise = 0): Platform[] {
  return LEVEL_THREE.platforms.filter(p => p.x >= from && p.x < to).map(p => ({
    ...p, x: p.x - from + start, y: p.y + rise,
    endY: p.endY === undefined ? undefined : p.endY + rise,
    h: p.kind === 'ground' ? 672 - p.y - rise : p.h,
  }));
}
function exchangeThirdLights(platforms: Platform[]): Platform[] {
  return platforms.map(p => ({ ...p, color: p.color === 'red' ? 'blue' : p.color === 'blue' ? 'red' : p.color }));
}
const thirdOpening = () => thirdSection(0, 3584, 0);
const thirdHome = () => thirdSection(11264, 13632, 11264);
export const LEVEL_THREE_UPPER: Level = {
  id: 'upper-bridge', name: '高坡後橋', difficulty: 3, focus: '先登高臺，再穿過橋群', width: 13632,
  checkpoints: [160, 2624, 4800, 7488, 11136], exit: { x: 13408, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1900, y: 382 }, { color: 'green', x: 4890, y: 322 }, { color: 'red', x: 8300, y: 478 }, { color: 'blue', x: 11880, y: 450 }],
  platforms: [
    ...thirdOpening(), ...thirdSection(5504, 7296, 3584, 128),
    ground(5248, 352, 128), ...thirdSection(3584, 5504, 5376, -64),
    ...thirdSection(7296, 8576, 7296), ...thirdSection(8576, 11264, 8576), ...thirdHome(),
  ],
};
export const LEVEL_THREE_VALLEY: Level = {
  id: 'valley-bridge', name: '谷底長橋', difficulty: 3, focus: '先落入低地，再一路登高', width: 13632,
  checkpoints: [160, 2624, 6336, 7808, 11136], exit: { x: 13408, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1900, y: 382 }, { color: 'green', x: 5350, y: 450 }, { color: 'red', x: 8300, y: 194 }, { color: 'blue', x: 11880, y: 450 }],
  platforms: exchangeThirdLights([
    ...thirdOpening(), ...thirdSection(7296, 8576, 3584),
    ...thirdSection(3584, 5504, 4864), ...thirdSection(5504, 7296, 6784),
    ground(8448, 224, 128), ...thirdSection(8576, 11264, 8576), ...thirdHome(),
  ]),
};
export const LEVEL_THREE_MIDDLE: Level = {
  id: 'middle-bridge', name: '半途連橋', difficulty: 3, focus: '中段連跳換燈，後段再登高', width: 13632,
  checkpoints: [160, 2624, 5056, 8000, 11136], exit: { x: 13408, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1900, y: 382 }, { color: 'green', x: 4890, y: 386 }, { color: 'red', x: 9350, y: 194 }, { color: 'blue', x: 11880, y: 450 }],
  platforms: exchangeThirdLights([
    ...thirdOpening(), ...thirdSection(3584, 5504, 3584),
    ...thirdSection(8576, 11264, 5504), ...thirdSection(5504, 7296, 8192),
    ...thirdSection(7296, 8576, 9984), ...thirdHome(),
  ]),
};
export const LEVEL_THREE_SLOPE: Level = {
  id: 'slope-bridge', name: '坡下橋群', difficulty: 3, focus: '先登坡後落谷，再過橋群', width: 13632,
  checkpoints: [160, 2624, 4800, 8064, 11136], exit: { x: 13408, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1900, y: 382 }, { color: 'green', x: 4890, y: 322 }, { color: 'red', x: 8300, y: 386 }, { color: 'blue', x: 11880, y: 450 }],
  platforms: [
    ...thirdOpening(), ...thirdSection(5504, 7296, 3584, 128),
    ...thirdSection(7296, 8576, 5376), ...thirdSection(3584, 5504, 6656),
    ...thirdSection(8576, 11264, 8576), ...thirdHome(),
  ],
};
export const LEVEL_ZERO: Level = {
  id: 'intro', name: '點燈起步', difficulty: 0, width: 8832,
  checkpoints: [160, 1984, 4480, 6912], exit: { x: 8608, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1980, y: 450 }, { color: 'green', x: 3300, y: 386 }, { color: 'red', x: 5500, y: 450 }, { color: 'blue', x: 7600, y: 450 }],
  platforms: [
    // Long normal approaches teach single colors before any combined light.
    ground(0, 480, 1024), ground(1024, 480, 256, 480, 'red'), ground(1280, 480, 448),
    // A small, independent jump; changing lights is not required during the jump.
    ground(1824, 480, 352), ground(2176, 480, 256, 480, 'blue'),
    ground(2432, 480, 512, 416), ground(2944, 416, 576), ground(3520, 416, 256, 416, 'red'),
    ground(3776, 416, 512, 480), ground(4288, 480, 512),
    // Purple starts in the second half. Every colored section has normal ground on both sides.
    ground(4800, 480, 256, 480, 'purple'), ground(5056, 480, 1024),
    ground(6080, 480, 256, 480, 'blue'), ground(6336, 480, 192),
    ground(6624, 480, 736), ground(7360, 480, 256, 480, 'purple'),
    // Quiet finish with no further jump or color change.
    ground(7616, 480, 1216),
  ],
};
export const LEVEL_ONE: Level = {
  id: 'platforms', name: '浮空書徑', difficulty: 1, focus: '跨過浮空平台', width: 10112,
  checkpoints: [160, 2656, 4864, 6976, 9408], exit: { x: 9888, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1840, y: 450 }, { color: 'green', x: 3880, y: 450 }, { color: 'red', x: 6000, y: 322 }, { color: 'blue', x: 8500, y: 450 }],
  platforms: [
    // Shorter normal intervals increase light decisions without adjoining colored floors.
    ground(0, 480, 704), ground(704, 480, 256, 480, 'red'), ground(960, 480, 448),
    ground(1408, 480, 256, 480, 'blue'), ground(1664, 480, 320),
    ground(1984, 480, 256, 480, 'red'), ground(2240, 480, 192),
    // One small gap, followed by a safe approach to the platform lesson.
    ground(2528, 480, 352), ground(2880, 480, 256, 480, 'blue'), ground(3136, 480, 512),
    ground(3648, 480, 256, 480, 'blue'), ground(3904, 480, 128),
    // These two platforms are needed to cross the ravine and climb. Keep blue on throughout.
    bridge(4160, 416, 192, 'blue'), bridge(4480, 352, 192), ground(4672, 352, 576),
    // Introduce purple after a wide, normal landing in the second half.
    ground(5248, 352, 256, 352, 'purple'), ground(5504, 352, 320),
    ground(5824, 352, 256, 352, 'red'), ground(6080, 352, 512, 480),
    ground(6592, 480, 256, 480, 'blue'), ground(6848, 480, 448),
    ground(7296, 480, 256, 480, 'purple'), ground(7552, 480, 320),
    ground(7872, 480, 256, 480, 'red'), ground(8128, 480, 448),
    ground(8576, 480, 256, 480, 'purple'), ground(8832, 480, 192),
    ground(9024, 480, 256, 480, 'blue'), ground(9280, 480, 832),
  ],
};
export const LEVEL_ONE_BRIDGE: Level = {
  id: 'missing-page', name: '斷頁橋', difficulty: 1, focus: '在缺口間找落腳處', width: 10112,
  checkpoints: [160, 2304, 4736, 6912, 9280], exit: { x: 9888, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1840, y: 450 }, { color: 'green', x: 3740, y: 386 }, { color: 'red', x: 6460, y: 450 }, { color: 'blue', x: 8520, y: 450 }],
  platforms: [
    ground(0, 480, 640), ground(640, 480, 256, 480, 'blue'), ground(896, 480, 448),
    ground(1344, 480, 256, 480, 'red'), ground(1600, 480, 384),
    ground(1984, 480, 320, 416, 'red'), ground(2304, 416, 256),
    ground(2560, 416, 256, 416, 'blue'), ground(2816, 416, 256),
    // The first small gap leads to a raised two-step bridge rather than a flat repeat.
    ground(3168, 416, 256), ground(3424, 416, 256, 416, 'red'), ground(3680, 416, 288),
    bridge(3968, 352, 192, 'red'), bridge(4288, 288, 192),
    ground(4480, 288, 256, 288, 'blue'), ground(4736, 288, 512),
    ground(5248, 288, 256, 288, 'purple'), ground(5504, 288, 256),
    ground(5760, 288, 576, 480, 'red'), ground(6336, 480, 320),
    ground(6656, 480, 256, 480, 'blue'), ground(6912, 480, 384),
    ground(7296, 480, 256, 480, 'purple'), ground(7552, 480, 320),
    ground(7872, 480, 256, 480, 'red'), ground(8128, 480, 320),
    ground(8448, 480, 256, 480, 'purple'), ground(8704, 480, 320),
    ground(9024, 480, 256, 480, 'blue'), ground(9280, 480, 832),
  ],
};
export const LEVEL_ONE_RIDGE: Level = {
  id: 'book-spine', name: '高低書脊', difficulty: 1, focus: '沿坡道登上高臺', width: 10112,
  checkpoints: [160, 2304, 4160, 6400, 9024], exit: { x: 9888, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1800, y: 417 }, { color: 'green', x: 4200, y: 450 }, { color: 'red', x: 6848, y: 370 }, { color: 'blue', x: 8800, y: 450 }],
  platforms: [
    ground(0, 480, 512), ground(512, 480, 256, 480, 'red'), ground(768, 480, 512),
    ground(1280, 480, 256, 480, 'blue'), ground(1536, 480, 512, 416),
    ground(2048, 416, 256, 416, 'red'), ground(2304, 416, 320),
    ground(2752, 416, 384), ground(3136, 416, 256, 416, 'blue'),
    ground(3392, 416, 512, 480), ground(3904, 480, 256, 480, 'red'), ground(4160, 480, 448),
    // The bridge arrives later than in the original one-star route.
    bridge(4672, 416, 192, 'blue'), bridge(4864, 480, 128), bridge(4992, 352, 192), ground(5184, 352, 384),
    ground(5568, 352, 256, 352, 'purple'), ground(5824, 352, 320),
    ground(6144, 352, 256, 352, 'blue'), ground(6400, 352, 256),
    ground(6656, 352, 512, 480), ground(7168, 480, 256, 480, 'red'),
    ground(7424, 480, 256), ground(7680, 480, 256, 480, 'purple'),
    ground(7936, 480, 320), ground(8256, 480, 256, 480, 'blue'),
    ground(8512, 480, 256), ground(8768, 480, 256, 480, 'purple'),
    ground(9024, 480, 256), ground(9280, 480, 256, 480, 'red'), ground(9536, 480, 576),
  ],
};
export const LEVEL_ONE_LOWER: Level = {
  id: 'lower-crossing', name: '低谷浮橋', difficulty: 1, focus: '先過浮橋，再走下坡', width: 10112,
  checkpoints: [160, 3008, 5184, 7360, 9344], exit: { x: 9888, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1800, y: 450 }, { color: 'green', x: 3860, y: 322 }, { color: 'red', x: 6450, y: 450 }, { color: 'blue', x: 8500, y: 450 }],
  platforms: [
    ground(0, 480, 640), ground(640, 480, 256, 480, 'red'), ground(896, 480, 384),
    ground(1280, 480, 256, 480, 'blue'), ground(1536, 480, 320),
    ground(1856, 480, 256, 480, 'red'), ground(2112, 480, 256),
    // Two early rising bridges; the rest of the map is a broad descending shelf.
    bridge(2496, 416, 192, 'blue'), bridge(2816, 352, 192), ground(3008, 352, 512),
    ground(3520, 352, 256, 352, 'purple'), ground(3776, 352, 512),
    ground(4288, 352, 256, 352, 'red'), ground(4544, 352, 448),
    ground(4992, 352, 512, 480), ground(5504, 480, 256, 480, 'blue'), ground(5760, 480, 320),
    ground(6208, 480, 192), ground(6400, 480, 256, 480, 'red'), ground(6656, 480, 384),
    ground(7040, 480, 256, 480, 'purple'), ground(7296, 480, 512),
    ground(7808, 480, 256, 480, 'blue'), ground(8064, 480, 512),
    ground(8576, 480, 256, 480, 'red'), ground(8832, 480, 256),
    ground(9088, 480, 256, 480, 'purple'), ground(9344, 480, 768),
  ],
};
export const LEVEL_ONE_LATE: Level = {
  id: 'late-bridges', name: '坡頂三橋', difficulty: 1, focus: '先上坡，再跨三座橋', width: 10112,
  checkpoints: [160, 2304, 5056, 6784, 9280], exit: { x: 9888, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1780, y: 450 }, { color: 'green', x: 4000, y: 322 }, { color: 'red', x: 6650, y: 386 }, { color: 'blue', x: 8540, y: 450 }],
  platforms: [
    ground(0, 480, 576), ground(576, 480, 256, 480, 'blue'), ground(832, 480, 448),
    ground(1280, 480, 256, 480, 'red'), ground(1536, 480, 512),
    ground(2048, 480, 256, 480, 'purple'), ground(2304, 480, 448, 416),
    ground(2752, 416, 256, 416, 'blue'), ground(3008, 416, 384),
    ground(3392, 416, 384, 352), ground(3776, 352, 256, 352, 'red'), ground(4032, 352, 512),
    ground(4544, 352, 256, 352, 'purple'), ground(4800, 352, 384),
    ground(5184, 352, 512, 416), ground(5696, 416, 256, 416, 'red'), ground(5952, 416, 512),
    ground(6464, 416, 256, 416, 'blue'), ground(6720, 416, 256),
    // The bridge sequence arrives late and descends to the final low shelf.
    bridge(7104, 352, 192), bridge(7424, 416, 192, 'purple'), bridge(7744, 480, 192),
    ground(7936, 480, 256, 480, 'red'), ground(8192, 480, 320),
    ground(8512, 480, 256, 480, 'blue'), ground(8768, 480, 256),
    ground(9024, 480, 256, 480, 'purple'), ground(9280, 480, 256),
    ground(9536, 480, 576),
  ],
};
export const LEVEL_TWO: Level = {
  id: 'fusion', name: '雙光迴廊', difficulty: 2, focus: '跨過兩處相鄰色塊', width: 12160,
  checkpoints: [160, 2656, 4864, 7072, 10208], exit: { x: 11936, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1840, y: 450 }, { color: 'green', x: 5000, y: 322 }, { color: 'red', x: 7800, y: 450 }, { color: 'blue', x: 10450, y: 450 }],
  platforms: [
    // Keep the opening and platform lesson familiar, with one-star color frequency.
    ground(0, 480, 704), ground(704, 480, 256, 480, 'red'), ground(960, 480, 448),
    ground(1408, 480, 256, 480, 'blue'), ground(1664, 480, 320),
    ground(1984, 480, 256, 480, 'red'), ground(2240, 480, 192),
    ground(2528, 480, 352), ground(2880, 480, 256, 480, 'blue'), ground(3136, 480, 512),
    ground(3648, 480, 256, 480, 'blue'), ground(3904, 480, 128),
    bridge(4160, 416, 192, 'blue'), bridge(4480, 352, 192), ground(4672, 352, 1088),
    // Pair 1: blue -> purple. Jump before the seam, then turn the red lamp on.
    ground(5760, 352, 256, 352, 'blue'), ground(6016, 352, 256, 352, 'purple'),
    ground(6272, 352, 320), ground(6592, 352, 256, 352, 'red'), ground(6848, 352, 512, 480),
    ground(7360, 480, 256, 480, 'blue'), ground(7616, 480, 512),
    ground(8128, 480, 256, 480, 'purple'), ground(8384, 480, 384),
    ground(8768, 480, 256, 480, 'blue'), ground(9024, 480, 256),
    // Pair 2: purple -> red. Jump before the seam, then turn the blue lamp off.
    ground(9280, 480, 256, 480, 'purple'), ground(9536, 480, 256, 480, 'red'),
    ground(9792, 480, 576), ground(10368, 480, 256, 480, 'blue'), ground(10624, 480, 448),
    ground(11072, 480, 256, 480, 'red'), ground(11328, 480, 832),
  ],
};
export const LEVEL_TWO_SEAM: Level = {
  id: 'color-seam', name: '雙色接縫', difficulty: 2, focus: '在接縫處跳起換燈', width: 12160,
  checkpoints: [160, 2304, 4736, 6592, 9664], exit: { x: 11936, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1840, y: 450 }, { color: 'green', x: 3740, y: 386 }, { color: 'red', x: 7350, y: 450 }, { color: 'blue', x: 10270, y: 450 }],
  platforms: [
    ...LEVEL_ONE_BRIDGE.platforms.filter(p => p.x < 5248),
    // Blue to purple on the high shelf; purple to red on the low shelf.
    ground(5248, 288, 256, 288, 'blue'), ground(5504, 288, 256, 288, 'purple'),
    ground(5760, 288, 256), ground(6016, 288, 576, 480), ground(6592, 480, 320),
    ground(6912, 480, 256, 480, 'red'), ground(7168, 480, 384),
    ground(7552, 480, 256, 480, 'blue'), ground(7808, 480, 448),
    ground(8256, 480, 256, 480, 'purple'), ground(8512, 480, 256, 480, 'red'),
    ground(8768, 480, 640), ground(9408, 480, 256, 480, 'blue'),
    ground(9664, 480, 384), ground(10048, 480, 256, 480, 'purple'),
    ground(10304, 480, 448), ground(10752, 480, 256, 480, 'red'),
    ground(11008, 480, 1152),
  ],
};
export const LEVEL_TWO_SLOPE: Level = {
  id: 'folded-slope', name: '折頁坡道', difficulty: 2, focus: '上坡後接連換燈', width: 12160,
  checkpoints: [160, 2304, 4160, 6080, 8704], exit: { x: 11936, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1800, y: 417 }, { color: 'green', x: 4400, y: 450 }, { color: 'red', x: 7750, y: 450 }, { color: 'blue', x: 10300, y: 450 }],
  platforms: [
    ...LEVEL_ONE_RIDGE.platforms.filter(p => p.x < 5568),
    ground(5568, 352, 256, 352, 'red'), ground(5824, 352, 256, 352, 'purple'),
    ground(6080, 352, 320), ground(6400, 352, 256, 352, 'blue'),
    ground(6656, 352, 512, 480), ground(7168, 480, 256, 480, 'purple'),
    ground(7424, 480, 384), ground(7808, 480, 256, 480, 'red'),
    ground(8064, 480, 384), ground(8448, 480, 256, 480, 'blue'),
    ground(8704, 480, 320), ground(9024, 480, 256, 480, 'purple'),
    ground(9280, 480, 256, 480, 'blue'), ground(9536, 480, 512),
    ground(10048, 480, 256, 480, 'red'), ground(10304, 480, 448),
    ground(10752, 480, 256, 480, 'purple'), ground(11008, 480, 1152),
  ],
};
export const LEVEL_TWO_LOWER: Level = {
  id: 'lower-seam', name: '下坡換燈', difficulty: 2, focus: '過橋後在高低兩處換燈', width: 12160,
  checkpoints: [160, 3008, 5184, 7360, 9728, 11264], exit: { x: 11936, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1800, y: 450 }, { color: 'green', x: 3860, y: 322 }, { color: 'red', x: 7600, y: 450 }, { color: 'blue', x: 10400, y: 450 }],
  platforms: [
    ...LEVEL_ONE_LOWER.platforms.filter(p => p.x < 4288),
    // First adjoining colors are high up; the second pair follows the descent.
    ground(4288, 352, 256, 352, 'red'), ground(4544, 352, 256, 352, 'purple'),
    ground(4800, 352, 384), ground(5184, 352, 512, 480),
    ground(5696, 480, 256, 480, 'blue'), ground(5952, 480, 320),
    ground(6400, 480, 256), ground(6656, 480, 256, 480, 'red'), ground(6912, 480, 192),
    ground(7104, 480, 256, 480, 'purple'), ground(7360, 480, 448),
    ground(7808, 480, 256, 480, 'blue'), ground(8064, 480, 512),
    ground(8576, 480, 256, 480, 'red'), ground(8832, 480, 384),
    ground(9216, 480, 256, 480, 'blue'), ground(9472, 480, 256, 480, 'purple'),
    ground(9728, 480, 576), ground(10304, 480, 256, 480, 'red'), ground(10560, 480, 448),
    ground(11008, 480, 256, 480, 'blue'), ground(11264, 480, 896),
  ],
};
export const LEVEL_TWO_LATE: Level = {
  id: 'late-seam', name: '三橋換燈', difficulty: 2, focus: '先在坡頂換燈，再過三橋', width: 12160,
  checkpoints: [160, 2304, 5056, 6912, 9664, 11072], exit: { x: 11936, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1780, y: 450 }, { color: 'green', x: 4000, y: 322 }, { color: 'red', x: 6650, y: 386 }, { color: 'blue', x: 10480, y: 450 }],
  platforms: [
    ...LEVEL_ONE_LATE.platforms.filter(p => p.x < 4544),
    ground(4544, 352, 256, 352, 'purple'), ground(4800, 352, 256, 352, 'red'),
    ground(5056, 352, 384), ground(5440, 352, 512, 416),
    ground(5952, 416, 256, 416, 'blue'), ground(6208, 416, 448),
    ground(6656, 416, 256, 416, 'purple'), ground(6912, 416, 640),
    // Three descending bridges postpone the platform sequence until after the first seam.
    bridge(7680, 352, 192), bridge(8000, 416, 192, 'blue'), bridge(8320, 480, 192),
    ground(8512, 480, 256, 480, 'red'), ground(8768, 480, 384),
    ground(9152, 480, 256, 480, 'blue'), ground(9408, 480, 256, 480, 'purple'),
    ground(9664, 480, 512), ground(10176, 480, 256, 480, 'red'), ground(10432, 480, 384),
    ground(10816, 480, 256, 480, 'blue'), ground(11072, 480, 1088),
  ],
};
export const LEVEL_FOUR: Level = {
  id: 'crossroads', name: '石橋岔路', difficulty: 4, terrain: 'stone', width: 14336,
  checkpoints: [160, 1376, 3296, 5760, 7360, 10752, 12640], exit: { x: 14144, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1800, y: 450 }, { color: 'green', x: 4608, y: 274 }, { color: 'red', x: 8928, y: 274 }, { color: 'blue', x: 12672, y: 450 }],
  platforms: [
    // Three isolated wall crossings teach the inverse rule on neutral landings.
    ground(0, 480, 1024), ground(1216, 480, 768), ground(2176, 480, 768), ground(3136, 480, 704),
    // Lower route: broad neutral platforms. Upper route: short, alternating-color steps.
    bridge(3840, 480, 448), bridge(4416, 480, 448),
    bridge(3840, 368, 192), bridge(4160, 304, 192, 'blue'),
    bridge(4480, 304, 192, 'purple'), bridge(4800, 368, 192, 'blue'),
    ground(4992, 480, 1408), ground(6400, 480, 256, 480, 'red'), ground(6656, 480, 320),
    ground(7168, 480, 704), ground(7872, 480, 512, 416), ground(8384, 416, 448),
    // Second choice is higher in the scenery, with the same reachable two-lane spacing.
    bridge(8832, 416, 448), bridge(9408, 416, 448),
    bridge(8832, 304, 192), bridge(9152, 240, 192, 'red'),
    bridge(9472, 240, 192, 'purple'), bridge(9792, 304, 192, 'red'),
    ground(9984, 416, 1280), ground(11264, 416, 512, 480), ground(11776, 480, 256, 480, 'blue'), ground(12032, 480, 256),
    // Final red/blue/purple wall sequence, then a quiet neutral approach to the portal.
    ground(12480, 480, 384), ground(13056, 480, 384), ground(13632, 480, 704),
  ],
  obstacles: [
    { x: 1088, y: 224, w: 64, h: 256, color: 'red' },
    { x: 2048, y: 224, w: 64, h: 256, color: 'blue' },
    { x: 3008, y: 224, w: 64, h: 256, color: 'purple' },
    { x: 4320, y: 352, w: 64, h: 192, color: 'red' },
    { x: 4896, y: 352, w: 64, h: 192, color: 'blue' },
    { x: 7040, y: 224, w: 64, h: 256, color: 'purple' },
    { x: 9312, y: 288, w: 64, h: 192, color: 'purple' },
    { x: 9888, y: 288, w: 64, h: 192, color: 'red' },
    { x: 12352, y: 224, w: 64, h: 256, color: 'red' },
    { x: 12928, y: 224, w: 64, h: 256, color: 'blue' },
    { x: 13504, y: 224, w: 64, h: 256, color: 'purple' },
  ],
};
export const LEVEL_FIVE: Level = {
  id: 'gauntlet', name: '燈牆連跳', difficulty: 5, terrain: 'stone', width: 15232,
  checkpoints: [160, 1792, 3296, 5760, 7360, 10752, 12640, 14848], exit: { x: 15040, y: 408, radius: 54 },
  gems: [{ color: 'yellow', x: 1820, y: 450 }, { color: 'green', x: 4608, y: 274 }, { color: 'red', x: 8928, y: 274 }, { color: 'blue', x: 13300, y: 450 }],
  platforms: [
    // The same wall lesson now leads into adjoining floors that require an extra jump and lamp change.
    ground(0, 480, 576), ground(576, 480, 192, 480, 'blue'), ground(768, 480, 256),
    ground(1216, 480, 256, 480, 'red'), ground(1472, 480, 256, 480, 'blue'), ground(1728, 480, 256),
    ground(2176, 480, 256, 480, 'blue'), ground(2432, 480, 256, 480, 'purple'), ground(2688, 480, 256),
    ground(3136, 480, 704),
    // Preserve the short, independently selectable two-lane sections from the four-star course.
    bridge(3840, 480, 448), bridge(4416, 480, 448),
    bridge(3840, 368, 192), bridge(4160, 304, 192, 'blue'),
    bridge(4480, 304, 192, 'purple'), bridge(4800, 368, 192, 'blue'),
    // Shorter neutral runs increase the frequency of wall crossings without changing forward speed.
    ground(4992, 480, 384), ground(5568, 480, 384), ground(6144, 480, 256),
    ground(6400, 480, 256, 480, 'red'), ground(6656, 480, 320),
    ground(7168, 480, 320), ground(7488, 480, 256, 480, 'red'), ground(7744, 480, 128),
    ground(7872, 480, 512, 416), ground(8384, 416, 448),
    bridge(8832, 416, 448), bridge(9408, 416, 448),
    bridge(8832, 304, 192), bridge(9152, 240, 192, 'red'),
    bridge(9472, 240, 192, 'purple'), bridge(9792, 304, 192, 'red'),
    ground(9984, 416, 448), ground(10624, 416, 384), ground(11200, 416, 64),
    ground(11264, 416, 512, 480), ground(11776, 480, 256, 480, 'blue'), ground(12032, 480, 256),
    ground(12480, 480, 384), ground(13056, 480, 384), ground(13632, 480, 320),
    ground(14144, 480, 384), ground(14720, 480, 512),
  ],
  obstacles: [
    ...LEVEL_FOUR.obstacles!,
    { x: 5440, y: 224, w: 64, h: 256, color: 'red' },
    { x: 6016, y: 224, w: 64, h: 256, color: 'blue' },
    { x: 10496, y: 160, w: 64, h: 256, color: 'blue' },
    { x: 11072, y: 160, w: 64, h: 256, color: 'purple' },
    { x: 14016, y: 224, w: 64, h: 256, color: 'blue' },
    { x: 14592, y: 224, w: 64, h: 256, color: 'red' },
  ],
};
export const LEVEL_TIERS: readonly (readonly Level[])[] = [
  [LEVEL_ZERO], [LEVEL_ONE, LEVEL_ONE_BRIDGE, LEVEL_ONE_RIDGE, LEVEL_ONE_LOWER, LEVEL_ONE_LATE],
  [LEVEL_TWO, LEVEL_TWO_SEAM, LEVEL_TWO_SLOPE, LEVEL_TWO_LOWER, LEVEL_TWO_LATE],
  [LEVEL_THREE, LEVEL_THREE_UPPER, LEVEL_THREE_VALLEY, LEVEL_THREE_MIDDLE, LEVEL_THREE_SLOPE], [LEVEL_FOUR], [LEVEL_FIVE],
];
export const LEVEL_TIER_NAMES: readonly string[] = [
  LEVEL_ZERO.name, '跳臺書架', '換燈書架', LEVEL_THREE.name, LEVEL_FOUR.name, LEVEL_FIVE.name,
];
export const LEVELS: readonly Level[] = LEVEL_TIERS.flat();
export const levelSeconds = (level: Level) => (level.exit.x - level.checkpoints[0]) / PHYSICS.speed;
// The existing three-star course remains the default for callers without an explicit level.
export const WORLD_WIDTH = LEVEL_THREE.width, PLATFORMS = LEVEL_THREE.platforms, CHECKPOINTS = LEVEL_THREE.checkpoints;
export const EXIT = LEVEL_THREE.exit, GOAL = EXIT.x, LEVEL_SECONDS = levelSeconds(LEVEL_THREE);
export function touchesExit(state: Pick<State, 'x' | 'y'>, level: Level = LEVEL_THREE): boolean {
  const EXIT = level.exit;
  const nearestX = Math.max(state.x - BODY.half, Math.min(EXIT.x, state.x + BODY.half));
  const nearestY = Math.max(state.y - BODY.height, Math.min(EXIT.y, state.y));
  return (nearestX - EXIT.x) ** 2 + (nearestY - EXIT.y) ** 2 <= EXIT.radius ** 2;
}
export function checkpointY(index: number, level: Level = LEVEL_THREE): number {
  const x = level.checkpoints[index];
  const p = level.platforms.find(p => p.kind === 'ground' && x >= p.x && x < p.x + p.w)!;
  return surfaceY(p, x);
}
export interface State {
  x: number; y: number; vx: number; vy: number; grounded: boolean;
  coyote: number; buffer: number; jumpHeld: boolean; checkpoint: number;
  completed: boolean; falls: number; color: WorldColor | null;
  knockedDown: boolean;
  collectedGems: readonly GemColor[];
}
export function surfaceY(p: Platform, x: number): number {
  return p.y + ((p.endY ?? p.y) - p.y) * Math.max(0, Math.min(1, (x - p.x) / p.w));
}
export function initialState(level: Level = LEVEL_THREE): State {
  return { x: level.checkpoints[0], y: checkpointY(0, level), vx: PHYSICS.speed, vy: 0, grounded: true,
    coyote: PHYSICS.grace, buffer: 0, jumpHeld: false, checkpoint: 0, completed: false, falls: 0, color: null, knockedDown: false, collectedGems: [] };
}

export function touchesGem(state: Pick<State, 'x' | 'y'>, gem: Gem): boolean {
  const x = Math.max(state.x - BODY.half, Math.min(gem.x, state.x + BODY.half));
  const y = Math.max(state.y - BODY.height, Math.min(gem.y, state.y));
  return (x - gem.x) ** 2 + (y - gem.y) ** 2 <= GEM_RADIUS ** 2;
}

/** Sweep the feet through the wall expanded by the player's body; all four faces block. */
export function obstacleContact(old: Pick<State, 'x' | 'y'>, next: Pick<State, 'x' | 'y'>, wall: Obstacle): number | null {
  let entry = 0, leave = 1;
  for (const [start, delta, min, max] of [
    [old.x, next.x - old.x, wall.x - BODY.half, wall.x + wall.w + BODY.half],
    [old.y, next.y - old.y, wall.y, wall.y + wall.h + BODY.height],
  ]) {
    if (delta === 0) { if (start <= min || start >= max) return null; }
    else {
      const a = (min - start) / delta, b = (max - start) / delta;
      entry = Math.max(entry, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
      if (entry >= leave) return null;
    }
  }
  return entry < leave ? entry : null;
}

export function isSolid(p: Platform, color: WorldColor | null): boolean { return !p.color || p.color === color; }
/** 切色不改位置；失去腳下支撐時立即離地，不能利用舊支撐再次起跳。 */
export function selectWorldColor(state: State, color: WorldColor | null, platforms: readonly Platform[] = PLATFORMS): State {
  if (state.color === color) return state;
  const s = { ...state, color };
  if (s.grounded && !platforms.some(p => isSolid(p, color) && s.x + BODY.half > p.x && s.x - BODY.half < p.x + p.w && Math.abs(s.y - surfaceY(p, s.x)) < 0.01)) {
    s.grounded = false; s.coyote = 0;
  }
  return s;
}

/** Fixed forward speed; y is the feet. Slopes share their surface with the renderer. */
export function advance(state: State, input: Input, dt: number, platforms: readonly Platform[] = PLATFORMS, level: Level = LEVEL_THREE): State {
  const s = { ...(input.color !== undefined ? selectWorldColor(state, input.color, platforms) : state) };
  if (s.completed) return s;
  s.vx = s.knockedDown ? 0 : PHYSICS.speed;
  s.coyote = s.grounded ? PHYSICS.grace : Math.max(0, s.coyote - dt);
  s.buffer = input.jump && !s.jumpHeld ? PHYSICS.buffer : Math.max(0, s.buffer - dt);
  s.jumpHeld = input.jump;
  const jumped = !s.knockedDown && s.buffer > 0 && s.coyote > 0;
  if (jumped) { s.vy = -PHYSICS.jump; s.grounded = false; s.coyote = 0; s.buffer = 0; }
  const oldX = s.x, oldY = s.y, wasGrounded = s.grounded;
  s.x = Math.min(level.width - BODY.half, s.x + s.vx * dt);
  s.vy = Math.min(PHYSICS.maxFall, s.vy + PHYSICS.gravity * dt);
  s.y += s.vy * dt;
  s.grounded = false;
  if (!s.knockedDown) {
    let contact = Infinity;
    for (const wall of level.obstacles ?? []) {
      if (!blocksPath(wall, s.color)) continue;
      const at = obstacleContact({ x: oldX, y: oldY }, s, wall);
      if (at !== null) contact = Math.min(contact, at);
    }
    if (contact < Infinity) {
      s.x = oldX + (s.x - oldX) * contact; s.y = oldY + (s.y - oldY) * contact;
      s.knockedDown = true; s.vx = 0; s.vy = Math.max(220, s.vy); s.coyote = s.buffer = 0;
    }
  }
  let landingY = Infinity;
  for (const p of platforms) {
    if (s.knockedDown) break;
    if (!isSolid(p, s.color)) continue;
    if (s.x + BODY.half <= p.x || s.x - BODY.half >= p.x + p.w) continue;
    // Joined sections use the surface under the feet, rather than a higher neighbouring tile.
    if (p.kind === 'ground' && ((s.x < p.x && platforms.some(other => isSolid(other, s.color) && other.kind === 'ground' && other.x + other.w === p.x))
      || (s.x >= p.x + p.w && platforms.some(other => isSolid(other, s.color) && other.kind === 'ground' && other.x === p.x + p.w)))) continue;
    const top = surfaceY(p, s.x), oldTop = surfaceY(p, oldX);
    const followsSlope = wasGrounded && !jumped && p.kind === 'ground'
      && Math.abs(oldY - oldTop) < 1 && Math.abs(top - oldTop) <= PHYSICS.speed * dt + 1;
    if (s.vy >= 0 && (followsSlope || (oldY <= oldTop + 0.01 && s.y >= top))) landingY = Math.min(landingY, top);
  }
  if (landingY < Infinity) { s.y = landingY; s.vy = 0; s.grounded = true; }
  // A new press just before landing is consumed once; holding never causes repeated jumps.
  if (s.grounded && s.buffer > 0) { s.vy = -PHYSICS.jump; s.grounded = false; s.buffer = 0; s.coyote = 0; }
  if (!s.knockedDown) {
    for (const gem of level.gems) {
      if (!s.collectedGems.includes(gem.color) && touchesGem(s, gem)) s.collectedGems = [...s.collectedGems, gem.color];
    }
  }
  level.checkpoints.forEach((x, index) => { if (s.grounded && s.x >= x && index > s.checkpoint) s.checkpoint = index; });
  if (s.y > 820) {
    s.x = level.checkpoints[s.checkpoint]; s.y = checkpointY(s.checkpoint, level); s.vx = PHYSICS.speed; s.vy = 0; s.grounded = true;
    s.coyote = PHYSICS.grace; s.buffer = 0; s.falls++;
    s.knockedDown = false;
  }
  if (touchesExit(s, level)) { s.completed = true; s.vx = 0; }
  return s;
}
