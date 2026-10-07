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
  id: 'intro' | 'platforms' | 'fusion' | 'challenge' | 'crossroads' | 'gauntlet'; name: string; difficulty: Difficulty;
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
  id: 'challenge', name: '深層小徑', difficulty: 3, width: 13632,
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
export const LEVEL_ZERO: Level = {
  id: 'intro', name: '初探禁書庫', difficulty: 0, width: 8832,
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
  id: 'platforms', name: '浮空書徑', difficulty: 1, width: 10112,
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
export const LEVEL_TWO: Level = {
  id: 'fusion', name: '雙光迴廊', difficulty: 2, width: 12160,
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
export const LEVEL_FOUR: Level = {
  id: 'crossroads', name: '晶石岔路', difficulty: 4, terrain: 'stone', width: 14336,
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
  id: 'gauntlet', name: '晶光試煉', difficulty: 5, terrain: 'stone', width: 15232,
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
export const LEVELS: readonly Level[] = [LEVEL_ZERO, LEVEL_ONE, LEVEL_TWO, LEVEL_THREE, LEVEL_FOUR, LEVEL_FIVE];
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
