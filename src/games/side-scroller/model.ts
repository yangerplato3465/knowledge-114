export type WorldColor = 'red' | 'blue' | 'purple';
export type ColorButton = 'red' | 'blue';
export function isLightOn(color: WorldColor | null, button: ColorButton): boolean { return color === button || color === 'purple'; }
export function toggleColor(color: WorldColor | null, button: ColorButton): WorldColor | null {
  const red = button === 'red' ? !isLightOn(color, 'red') : isLightOn(color, 'red');
  const blue = button === 'blue' ? !isLightOn(color, 'blue') : isLightOn(color, 'blue');
  return red && blue ? 'purple' : red ? 'red' : blue ? 'blue' : null;
}
export interface Platform { x: number; y: number; w: number; h: number; kind: 'ground' | 'bridge'; endY?: number; color?: WorldColor }
export interface Input { jump: boolean; color?: WorldColor | null }
export const WORLD_WIDTH = 13632;
export const BODY = { half: 19, height: 60 };
export const PHYSICS = { speed: 280, gravity: 1800, jump: 680, maxFall: 1000, grace: 0.1, buffer: 0.12, step: 1 / 120 };
export const GHOST_ALPHA = 0.32;
const ground = (x: number, y: number, w: number, endY = y, color?: WorldColor): Platform => ({ x, y, w, endY, color, h: 672 - y, kind: 'ground' });
const bridge = (x: number, y: number, w: number, color?: WorldColor): Platform => ({ x, y, w, color, h: 32, kind: 'bridge' });
export const PLATFORMS: Platform[] = [
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
  bridge(9152, 352, 192, 'red'), bridge(9472, 416, 192, 'blue'), bridge(9792, 352, 192, 'red'),
  bridge(10112, 288, 192, 'purple'), bridge(10432, 352, 192, 'blue'), bridge(10752, 416, 192, 'red'),
  ground(10944, 416, 320), ground(11264, 416, 512, 480), ground(11776, 480, 256, 480, 'blue'),
  ground(12160, 480, 192), ground(12352, 480, 256, 480, 'red'), ground(12608, 480, 192, 480, 'purple'),
  // A quiet, neutral approach after the last color change; no input is needed to reach the exit.
  ground(12800, 480, 832),
];
export const CHECKPOINTS = [160, 2624, 5056, 7488, 11136];
export const GOAL = WORLD_WIDTH - 224;
export const EXIT = { x: GOAL, y: 408, radius: 54 };
export const LEVEL_SECONDS = (GOAL - CHECKPOINTS[0]) / PHYSICS.speed;
export function touchesExit(state: Pick<State, 'x' | 'y'>): boolean {
  const nearestX = Math.max(state.x - BODY.half, Math.min(EXIT.x, state.x + BODY.half));
  const nearestY = Math.max(state.y - BODY.height, Math.min(EXIT.y, state.y));
  return (nearestX - EXIT.x) ** 2 + (nearestY - EXIT.y) ** 2 <= EXIT.radius ** 2;
}
export function checkpointY(index: number): number {
  const x = CHECKPOINTS[index];
  const p = PLATFORMS.find(p => p.kind === 'ground' && x >= p.x && x < p.x + p.w)!;
  return surfaceY(p, x);
}
export interface State {
  x: number; y: number; vx: number; vy: number; grounded: boolean;
  coyote: number; buffer: number; jumpHeld: boolean; checkpoint: number;
  completed: boolean; falls: number; color: WorldColor | null;
}
export function surfaceY(p: Platform, x: number): number {
  return p.y + ((p.endY ?? p.y) - p.y) * Math.max(0, Math.min(1, (x - p.x) / p.w));
}
export function initialState(): State {
  return { x: CHECKPOINTS[0], y: 480, vx: PHYSICS.speed, vy: 0, grounded: true,
    coyote: PHYSICS.grace, buffer: 0, jumpHeld: false, checkpoint: 0, completed: false, falls: 0, color: null };
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
export function advance(state: State, input: Input, dt: number, platforms: readonly Platform[] = PLATFORMS): State {
  const s = { ...(input.color !== undefined ? selectWorldColor(state, input.color, platforms) : state) };
  if (s.completed) return s;
  s.vx = PHYSICS.speed;
  s.coyote = s.grounded ? PHYSICS.grace : Math.max(0, s.coyote - dt);
  s.buffer = input.jump && !s.jumpHeld ? PHYSICS.buffer : Math.max(0, s.buffer - dt);
  s.jumpHeld = input.jump;
  const jumped = s.buffer > 0 && s.coyote > 0;
  if (jumped) { s.vy = -PHYSICS.jump; s.grounded = false; s.coyote = 0; s.buffer = 0; }
  const oldX = s.x, oldY = s.y, wasGrounded = s.grounded;
  s.x = Math.min(WORLD_WIDTH - BODY.half, s.x + s.vx * dt);
  s.vy = Math.min(PHYSICS.maxFall, s.vy + PHYSICS.gravity * dt);
  s.y += s.vy * dt;
  s.grounded = false;
  let landingY = Infinity;
  for (const p of platforms) {
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
  CHECKPOINTS.forEach((x, index) => { if (s.grounded && s.x >= x && index > s.checkpoint) s.checkpoint = index; });
  if (s.y > 820) {
    s.x = CHECKPOINTS[s.checkpoint]; s.y = checkpointY(s.checkpoint); s.vx = PHYSICS.speed; s.vy = 0; s.grounded = true;
    s.coyote = PHYSICS.grace; s.buffer = 0; s.falls++;
  }
  if (touchesExit(s)) { s.completed = true; s.vx = 0; }
  return s;
}
