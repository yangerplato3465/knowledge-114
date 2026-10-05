import { describe, expect, it } from 'vitest';
import { advance, checkpointY, CHECKPOINTS, GOAL, initialState, isSolid, LEVEL_SECONDS, PHYSICS, PLATFORMS, selectWorldColor, surfaceY, WORLD_WIDTH, type Input, type Platform, type State, type WorldColor } from './model';

const neutral: Input = { jump: false };
const floor: Platform[] = [{ x: 0, y: 480, w: WORLD_WIDTH, h: 200, kind: 'ground' }];
function simulate(start: State, input: Input, seconds: number, platforms: readonly Platform[] = floor) {
  let state = start;
  for (let i = 0; i < Math.round(seconds / PHYSICS.step); i++) state = advance(state, input, PHYSICS.step, platforms);
  return state;
}
// Acceptance route: one press for each required crossing, never an airborne second jump.
const routeJumps = [994, 3572, 3856, 4212, 4496, 5492, 5812, 6132, 6432, 9012, 9296, 9652, 9972, 10256, 10576, 11946];
// Change alternating platform colors only after leaving the previous support.
const routeColors: [number, WorldColor][] = [[400, 'red'], [998, 'blue'], [1800, 'red'], [3859, 'blue'], [4216, 'red'], [4501, 'blue'], [5300, 'red'], [5817, 'blue'], [6137, 'red'], [8500, 'red'], [9301, 'blue'], [9657, 'red'], [10260, 'blue'], [10580, 'red'], [11500, 'blue']];
function runRoute(platforms: readonly Platform[] = PLATFORMS, switchColors = true) {
  const used = new Set<number>(), landed = new Set<Platform>();
  let s = initialState(), seconds = 0;
  for (let n = 0; n < 120 * 50 && !s.completed && !s.falls; n++) {
    const next = routeJumps.find(x => s.x >= x && !used.has(x));
    if (next !== undefined) used.add(next);
    const color = switchColors ? routeColors.filter(([x]) => s.x >= x).at(-1)?.[1] : undefined;
    s = advance(s, { jump: next !== undefined, color }, PHYSICS.step, platforms);
    if (s.grounded) platforms.filter(p => p.kind === 'bridge' && s.x >= p.x && s.x < p.x + p.w && s.y === p.y).forEach(p => landed.add(p));
    seconds += PHYSICS.step;
  }
  return { state: s, seconds, landed, used };
}
describe('固定向前的一段跳世界', () => {
  it('不用輸入就固定向前跑，腳點穩定', () => {
    const s = simulate(initialState(), neutral, 1);
    expect(s.vx).toBe(PHYSICS.speed); expect(s.x).toBeCloseTo(CHECKPOINTS[0] + PHYSICS.speed);
    expect(s.y).toBe(480); expect(s.grounded).toBe(true);
  });
  it('短按與長按皆為一段跳，空中不能再跳，按住落地不連跳', () => {
    const first = simulate(initialState(), { jump: true }, 0.08);
    const short = simulate(first, neutral, 0.22);
    const held = simulate(first, { jump: true }, 0.22);
    expect(short.y).toBe(held.y);
    const double = advance(short, { jump: true }, PHYSICS.step);
    expect(double.vy).toBeGreaterThan(short.vy);
    const landed = simulate(held, { jump: true }, 1);
    expect(landed.grounded).toBe(true); expect(landed.vy).toBe(0);
  });
  it('空中平台可從下方穿過，下降時站上平台', () => {
    const bridge: Platform = { x: 100, y: 384, w: 500, h: 32, kind: 'bridge' };
    let s = simulate(initialState(), { jump: true }, 0.3, [...floor, bridge]);
    expect(s.y).toBeLessThan(bridge.y);
    s = simulate(s, { jump: true }, 0.4, [...floor, bridge]);
    expect(s.y).toBe(bridge.y); expect(s.grounded).toBe(true);
  });
  it('支援離地寬限與落地前的新按鍵緩衝', () => {
    const offEdge = { ...initialState(), grounded: false, y: 485, coyote: 0.08 };
    expect(advance(offEdge, { jump: true }, PHYSICS.step).vy).toBeLessThan(0);
    const falling = { ...initialState(), y: 470, vy: 300, grounded: false, coyote: 0 };
    let s = advance(falling, { jump: true }, PHYSICS.step, floor);
    s = simulate(s, { jump: true }, 0.05);
    expect(s.vy).toBeLessThan(0); expect(s.grounded).toBe(false);
  });
  it('緩坡可直接上下走，碰撞腳點與可見坡面一致', () => {
    for (const start of [{ x: 1500, y: 480 }, { x: 11000, y: 416 }]) {
      let s: State = { ...initialState(), ...start, color: 'blue' };
      for (let n = 0; n < 120 * 3; n++) {
        s = advance(s, { jump: false, color: start.x === 1500 && s.x > 1800 ? 'red' : 'blue' }, PHYSICS.step);
        expect(s.grounded).toBe(true);
        const p = PLATFORMS.find(p => p.kind === 'ground' && s.x >= p.x && s.x < p.x + p.w)!;
        expect(s.y).toBeCloseTo(surfaceY(p, s.x), 5);
      }
    }
  });
  it('離開高臺可自然下墜到低地，不需跳躍，也不算失敗重生', () => {
    const start = { ...initialState(), x: 7160, y: 224 };
    const falling = simulate(start, neutral, 0.4, PLATFORMS);
    expect(falling.grounded).toBe(false); expect(falling.y).toBeGreaterThan(start.y);
    const landed = simulate(falling, neutral, 1.1, PLATFORMS);
    expect(landed.grounded).toBe(true); expect(landed.y - start.y).toBeGreaterThanOrEqual(300);
    expect(landed.falls).toBe(0);
  });
  it('坑洞會跌落並回到最近落腳區，終點停止', () => {
    const s = advance({ ...initialState(), checkpoint: 1, x: 1050, y: 830, grounded: false }, neutral, PHYSICS.step);
    expect(s.x).toBe(CHECKPOINTS[1]); expect(s.y).toBe(checkpointY(1)); expect(s.falls).toBe(1);
    const fallen = simulate({ ...initialState(), x: 1010 }, neutral, 1, PLATFORMS);
    expect(fallen.falls).toBeGreaterThan(0);
    const complete = advance({ ...initialState(), x: GOAL }, neutral, PHYSICS.step, floor);
    expect(complete.completed).toBe(true);
    expect(advance(complete, neutral, PHYSICS.step).x).toBe(complete.x);
  });
  it('一段跳配合切色能站遍必要平台，無失誤通關時間為 40–50 秒', () => {
    const { state: s, seconds, landed, used } = runRoute();
    expect(s.completed).toBe(true); expect(s.falls).toBe(0); expect(used.size).toBe(routeJumps.length);
    expect(landed.size).toBe(PLATFORMS.filter(p => p.kind === 'bridge').length);
    expect(s.checkpoint).toBe(CHECKPOINTS.length - 1);
    expect(seconds).toBeGreaterThanOrEqual(40); expect(seconds).toBeLessThanOrEqual(50);
    expect(seconds - LEVEL_SECONDS).toBeLessThanOrEqual(PHYSICS.step);
  });
  it('不切色就無法通過紅藍路線，落腳區皆保留正常地面', () => {
    expect(initialState().color).toBeNull();
    expect(runRoute(PLATFORMS, false).state.falls).toBeGreaterThan(0);
    CHECKPOINTS.forEach(x => expect(PLATFORMS.find(p => p.kind === 'ground' && x >= p.x && x < p.x + p.w)?.color).toBeUndefined());
  });
  it('選中顏色才能落地；正常地面對所有顏色維持實體', () => {
    for (const color of ['red', 'blue'] as const) {
      const colored = [{ ...floor[0], color }];
      const start = { ...initialState(), y: 460, vy: 150, grounded: false, coyote: 0 };
      expect(simulate(start, { jump: false, color }, 0.2, colored).grounded).toBe(true);
      const ghost = simulate(start, { jump: false, color: color === 'red' ? 'blue' : 'red' }, 0.2, colored);
      expect(ghost.grounded).toBe(false); expect(ghost.y).toBeGreaterThan(480);
      for (const active of [null, 'red', 'blue'] as const) expect(isSolid(floor[0], active)).toBe(true);
    }
  });
  it('切走腳下顏色立即失去支撐，不能利用舊地板起跳', () => {
    const colored = [{ ...floor[0], color: 'red' as const }];
    const start = { ...initialState(), color: 'red' as const };
    const changed = selectWorldColor(start, 'blue', colored);
    expect(changed.x).toBe(start.x); expect(changed.y).toBe(start.y);
    expect(changed.grounded).toBe(false); expect(changed.coyote).toBe(0);
    expect(advance(changed, { jump: true }, PHYSICS.step, colored).vy).toBeGreaterThan(0);
    expect(start.grounded).toBe(true);
  });
  it('下降時可切色落上平台；已低於平台時切色不會瞬移回表面', () => {
    const colored: Platform[] = [{ ...floor[0], kind: 'bridge', h: 32, color: 'blue' }];
    const falling = { ...initialState(), y: 450, vy: 250, grounded: false, coyote: 0 };
    expect(simulate(falling, { jump: false, color: 'blue' }, 0.2, colored).y).toBe(480);
    const below = simulate({ ...falling, y: 490 }, { jump: false, color: 'blue' }, 0.1, colored);
    expect(below.grounded).toBe(false); expect(below.y).toBeGreaterThan(490);
  });
  it('每座空中平台都有通行用途，缺少任一座就無法沿驗收路線完成', () => {
    for (const bridge of PLATFORMS.filter(p => p.kind === 'bridge')) {
      const { state } = runRoute(PLATFORMS.filter(p => p !== bridge));
      expect(state.completed, `平台 ${bridge.x}`).toBe(false);
      expect(state.falls, `平台 ${bridge.x}`).toBeGreaterThan(0);
    }
  });
  it('每個落腳區重生後皆貼合該處地面，不會浮空或埋入地板', () => {
    CHECKPOINTS.forEach((x, checkpoint) => {
      const respawn = advance({ ...initialState(), checkpoint, y: 830, grounded: false, color: 'blue' }, neutral, PHYSICS.step);
      expect(respawn.x).toBe(x); expect(respawn.y).toBe(checkpointY(checkpoint));
      expect(respawn.color).toBe('blue');
      const next = advance(respawn, neutral, PHYSICS.step);
      expect(next.grounded).toBe(true); expect(next.falls).toBe(1);
    });
  });
  it('固定步長在不同顯示幀率得到相同結果', () => {
    const run = (fps: number) => {
      let s = initialState(), accumulator = 0;
      for (let frame = 0; frame < fps * 2; frame++) {
        accumulator += 1 / fps;
        while (accumulator + 1e-10 >= PHYSICS.step) { s = advance(s, neutral, PHYSICS.step, floor); accumulator -= PHYSICS.step; }
      }
      return s;
    };
    expect(run(30)).toEqual(run(60)); expect(run(144)).toEqual(run(60));
  });
});
