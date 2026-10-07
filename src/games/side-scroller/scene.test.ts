import { expect, it } from 'vitest';
import { GHOST_ALPHA, type WorldColor } from './model';
import { syncTerrainVisibility } from './scene';

it('巡覽第二輪及後續輪次重新依光色顯示障礙；離開畫面時切燈不沿用舊狀態', () => {
  const walls = (['red', 'blue', 'purple'] as const).map(color => ({
    node: { visible: true, alpha: 1 }, x: 100, end: 164,
    obstacle: { x: 100, y: 200, w: 64, h: 192, color },
  }));
  const floor = { node: { visible: true, alpha: GHOST_ALPHA }, x: 0, end: 500 };
  const nodes = [...walls, floor];
  const verify = (color: WorldColor | null) => {
    syncTerrainVisibility(nodes, 0, 1067, color);
    for (const wall of walls) {
      expect(wall.node.visible).toBe(wall.obstacle.color !== color);
      expect(wall.node.alpha).toBe(wall.obstacle.color === color ? 0 : 1);
    }
    expect(floor.node).toEqual({ visible: true, alpha: GHOST_ALPHA });
  };
  verify(null);
  for (let lap = 0; lap < 3; lap++) for (const color of ['red', 'blue', 'purple', null] as const) {
    // Leave the viewport, toggle a light while offscreen, then wrap back to the start.
    syncTerrainVisibility(nodes, 13000, 1067, color);
    expect(nodes.every(({ node }) => !node.visible)).toBe(true);
    verify(color);
    // A subsequent draw must not let viewport culling reveal a dissolved wall.
    verify(color);
  }
});

it('暫停巡覽切燈立即顯示／隱藏障礙，錯色與關燈都恢復', () => {
  const wall = { node: { visible: true, alpha: 1 }, x: 100, end: 164,
    obstacle: { x: 100, y: 200, w: 64, h: 192, color: 'purple' as const } };
  for (const color of [null, 'red', 'purple', 'blue', 'purple', null] as const) {
    syncTerrainVisibility([wall], 0, 1067, color);
    expect(wall.node.visible).toBe(color !== 'purple');
  }
});
