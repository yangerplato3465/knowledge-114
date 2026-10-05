export interface Platform { x: number; y: number; w: number; h: number; kind: 'ground' | 'block' | 'bridge' }
export interface Input { axis: number; run: boolean; jump: boolean }
export const WORLD_WIDTH = 3900;
export const BODY = { half: 19, height: 94 };
export const PHYSICS = { walk: 240, run: 370, acceleration: 1900, brake: 2400, gravity: 1800, jump: 720, maxFall: 1000, grace: 0.1, buffer: 0.12, step: 1 / 120 };
export const PLATFORMS: Platform[] = [
  { x: 0, y: 480, w: 1260, h: 180, kind: 'ground' },
  { x: 1430, y: 480, w: 1020, h: 180, kind: 'ground' },
  { x: 2630, y: 480, w: 1270, h: 180, kind: 'ground' },
  { x: 490, y: 416, w: 110, h: 64, kind: 'block' },
  { x: 600, y: 352, w: 110, h: 128, kind: 'block' },
  { x: 770, y: 315, w: 230, h: 22, kind: 'bridge' },
  { x: 1160, y: 355, w: 330, h: 22, kind: 'bridge' },
  { x: 1720, y: 408, w: 150, h: 72, kind: 'block' },
  { x: 1870, y: 336, w: 150, h: 144, kind: 'block' },
  { x: 2140, y: 280, w: 230, h: 22, kind: 'bridge' },
  { x: 2350, y: 366, w: 390, h: 22, kind: 'bridge' },
  { x: 2940, y: 406, w: 150, h: 74, kind: 'block' },
  { x: 3140, y: 334, w: 210, h: 22, kind: 'bridge' },
];
export const STARS = [
  { x: 335, y: 370 }, { x: 650, y: 252 }, { x: 880, y: 215 }, { x: 1300, y: 255 },
  { x: 1620, y: 365 }, { x: 1940, y: 230 }, { x: 2240, y: 180 }, { x: 2540, y: 266 },
  { x: 3010, y: 300 }, { x: 3250, y: 230 },
];
export const CHECKPOINTS = [110, 1540, 2810];
export const GOAL = 3680;
export interface State {
  x: number; y: number; vx: number; vy: number; grounded: boolean; facing: number;
  coyote: number; buffer: number; jumpHeld: boolean; checkpoint: number;
  collected: number[]; completed: boolean; falls: number; landing: number;
}
export function initialState(): State {
  return { x: 110, y: 480, vx: 0, vy: 0, grounded: true, facing: 1, coyote: PHYSICS.grace,
    buffer: 0, jumpHeld: false, checkpoint: 0, collected: [], completed: false, falls: 0, landing: 0 };
}
const approach = (from: number, to: number, amount: number) => from + Math.sign(to - from) * Math.min(Math.abs(to - from), amount);

/** Fixed-step AABB physics. y is the player's feet, independent of the drawing. */
export function advance(state: State, input: Input, dt: number, platforms: readonly Platform[] = PLATFORMS): State {
  const s = { ...state, collected: [...state.collected] };
  if (s.completed) return s;
  const axis = Math.max(-1, Math.min(1, input.axis));
  s.vx = approach(s.vx, axis * (input.run ? PHYSICS.run : PHYSICS.walk), (axis ? PHYSICS.acceleration : PHYSICS.brake) * dt);
  if (axis) s.facing = Math.sign(axis);
  s.coyote = s.grounded ? PHYSICS.grace : Math.max(0, s.coyote - dt);
  s.buffer = input.jump && !s.jumpHeld ? PHYSICS.buffer : Math.max(0, s.buffer - dt);
  if (!input.jump && s.jumpHeld && s.vy < -240) s.vy = -240;
  s.jumpHeld = input.jump;
  if (s.buffer > 0 && s.coyote > 0) {
    s.vy = -PHYSICS.jump; s.grounded = false; s.coyote = 0; s.buffer = 0;
  }
  const oldX = s.x;
  s.x = Math.max(BODY.half, Math.min(WORLD_WIDTH - BODY.half, s.x + s.vx * dt));
  for (const p of platforms) {
    if (p.kind === 'bridge' || s.y <= p.y + 0.01 || s.y - BODY.height >= p.y + p.h) continue;
    if (s.x + BODY.half > p.x && s.x - BODY.half < p.x + p.w) {
      s.x = s.vx > 0 ? p.x - BODY.half : s.vx < 0 ? p.x + p.w + BODY.half : oldX;
      s.vx = 0;
    }
  }
  const oldY = s.y;
  const wasGrounded = s.grounded;
  s.vy = Math.min(PHYSICS.maxFall, s.vy + PHYSICS.gravity * dt);
  s.y += s.vy * dt;
  s.grounded = false;
  for (const p of platforms) {
    if (s.x + BODY.half <= p.x || s.x - BODY.half >= p.x + p.w) continue;
    if (s.vy >= 0 && oldY <= p.y + 0.01 && s.y >= p.y) {
      s.y = p.y; s.vy = 0; s.grounded = true;
    } else if (p.kind !== 'bridge' && s.vy < 0 && oldY - BODY.height >= p.y + p.h - 0.01 && s.y - BODY.height < p.y + p.h) {
      s.y = p.y + p.h + BODY.height; s.vy = 0;
    }
  }
  s.landing = !wasGrounded && s.grounded ? 0.12 : Math.max(0, s.landing - dt);
  // Consume a buffered press on the actual landing step, without needing another keydown.
  if (s.grounded && s.buffer > 0) { s.vy = -PHYSICS.jump; s.grounded = false; s.buffer = 0; s.coyote = 0; }
  CHECKPOINTS.forEach((x, index) => { if (s.grounded && s.x >= x && index > s.checkpoint) s.checkpoint = index; });
  STARS.forEach((star, index) => {
    if (!s.collected.includes(index) && Math.abs(s.x - star.x) < 40 && star.y > s.y - BODY.height - 15 && star.y < s.y + 15) s.collected.push(index);
  });
  if (s.y > 820) {
    s.x = CHECKPOINTS[s.checkpoint]; s.y = 480; s.vx = 0; s.vy = 0; s.grounded = true;
    s.coyote = PHYSICS.grace; s.buffer = 0; s.falls++;
  }
  if (s.x >= GOAL && s.grounded) { s.completed = true; s.vx = 0; }
  return s;
}
