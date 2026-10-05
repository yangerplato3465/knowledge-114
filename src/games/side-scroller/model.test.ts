import { describe, expect, it } from 'vitest';
import { advance, BODY, CHECKPOINTS, GOAL, initialState, PHYSICS, type Input, type Platform, type State } from './model';

const neutral: Input = { axis: 0, run: false, jump: false };
const floor: Platform[] = [{ x: 0, y: 480, w: 3900, h: 200, kind: 'ground' }];
function simulate(start: State, input: Input, seconds: number, platforms = floor) {
  let state = start;
  for (let i = 0; i < Math.round(seconds / PHYSICS.step); i++) state = advance(state, input, PHYSICS.step, platforms);
  return state;
}
describe('橫向平台碰撞與操作', () => {
  it('跑步有加速與制動，停下後腳點穩定', () => {
    const moving = simulate(initialState(), { ...neutral, axis: 1, run: true }, 0.7);
    expect(moving.vx).toBe(PHYSICS.run);
    const stopped = simulate(moving, neutral, 0.4);
    expect(stopped.vx).toBe(0); expect(stopped.y).toBe(480); expect(stopped.grounded).toBe(true);
  });
  it('實體平台側邊阻擋玩家，不會穿牆', () => {
    const wall: Platform = { x: 220, y: 360, w: 110, h: 120, kind: 'block' };
    const s = simulate(initialState(), { ...neutral, axis: 1, run: true }, 1, [...floor, wall]);
    expect(s.x).toBe(wall.x - BODY.half); expect(s.vx).toBe(0);
  });
  it('碰到實體平台底部停止上升', () => {
    const ceiling: Platform = { x: 60, y: 320, w: 200, h: 22, kind: 'block' };
    const s = simulate(initialState(), { ...neutral, jump: true }, 0.1, [...floor, ceiling]);
    expect(s.y - BODY.height).toBeGreaterThanOrEqual(ceiling.y + ceiling.h);
    expect(s.vy).toBeGreaterThanOrEqual(0);
  });
  it('木橋可從下方穿過，下降時落在橋面', () => {
    const bridge: Platform = { x: 30, y: 355, w: 240, h: 22, kind: 'bridge' };
    let s = simulate(initialState(), { ...neutral, jump: true }, 0.3, [...floor, bridge]);
    expect(s.y).toBeLessThan(bridge.y);
    s = simulate(s, { ...neutral, jump: true }, 0.6, [...floor, bridge]);
    expect(s.y).toBe(bridge.y); expect(s.grounded).toBe(true);
  });
  it('短按跳躍比按住跳躍低；按住不會落地自動再跳', () => {
    const first = simulate(initialState(), { ...neutral, jump: true }, 0.08);
    const short = simulate(first, neutral, 0.22);
    const high = simulate(first, { ...neutral, jump: true }, 0.22);
    expect(high.y).toBeLessThan(short.y - 30);
    const landed = simulate(high, { ...neutral, jump: true }, 1);
    expect(landed.grounded).toBe(true); expect(landed.vy).toBe(0);
  });
  it('支援離地寬限與落地前的跳躍緩衝', () => {
    const offEdge = { ...initialState(), x: 600, grounded: false, y: 485, coyote: 0.08 };
    expect(advance(offEdge, { ...neutral, jump: true }, PHYSICS.step).vy).toBeLessThan(0);
    const falling = { ...initialState(), y: 470, vy: 300, grounded: false, coyote: 0 };
    let s = advance(falling, { ...neutral, jump: true }, PHYSICS.step, floor);
    s = simulate(s, { ...neutral, jump: true }, 0.05);
    expect(s.vy).toBeLessThan(0); expect(s.grounded).toBe(false);
  });
  it('跌落會回到最近路標並保留收集物；終點停止移動', () => {
    const s = advance({ ...initialState(), checkpoint: 1, x: 1320, y: 830, grounded: false, collected: [0] }, neutral, PHYSICS.step);
    expect(s.x).toBe(CHECKPOINTS[1]); expect(s.y).toBe(480); expect(s.collected).toEqual([0]); expect(s.falls).toBe(1);
    const complete = advance({ ...initialState(), x: GOAL }, neutral, PHYSICS.step, floor);
    expect(complete.completed).toBe(true);
    expect(advance(complete, { ...neutral, axis: 1 }, PHYSICS.step).x).toBe(GOAL);
  });
  it('整條試走路線能以跑步及六次跳躍完成，不必跌落或跳過碰撞', () => {
    const presses = [0.858333, 2.958333, 4.241666, 4.95, 6.55, 7.975];
    let s = initialState();
    for (let n = 0; n < 120 * 12 && !s.completed; n++) {
      const time = n * PHYSICS.step;
      s = advance(s, { axis: 1, run: true, jump: presses.some(start => time >= start && time < start + 0.65) }, PHYSICS.step);
    }
    expect(s.completed).toBe(true); expect(s.falls).toBe(0); expect(s.checkpoint).toBe(2);
  });
});
