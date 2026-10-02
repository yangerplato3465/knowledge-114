import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ART, FRONT_GAZE, GUESTS, REACTIONS } from './art';

it('現役角色與反應圖的界限有效，展示素材及客人步態齊全', () => {
  const image = (file: string) => new URL('../../../assets/images/magic-workshop/display/' + file, import.meta.url);
  for (const spec of Object.values(ART)) {
    const [left, top, right, bottom] = spec.bounds;
    expect(left).toBeGreaterThan(0);
    expect(top).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(left);
    expect(bottom).toBeGreaterThan(top);
    expect(right).toBeLessThan(1254);
    expect(bottom).toBeLessThan(1254);
    expect(existsSync(image(spec.file.replace('.png', '.webp'))), spec.file).toBe(true);
  }
  expect(new Set(GUESTS.map(guest => guest.art)).size).toBe(5);
  for (const guest of GUESTS) {
    expect(REACTIONS[guest.art]).toBeDefined();
    for (let frame = 0; frame < 6; frame++) {
      expect(existsSync(image('guest-' + guest.art + '-walk-v1-' + frame + '.webp'))).toBe(true);
    }
    const gaze = FRONT_GAZE[guest.art];
    if (gaze) {
      const [left, top, right, bottom] = gaze.bounds;
      const [walkLeft, walkTop, walkRight, walkBottom] = gaze.walkBounds;
      expect(Math.min(left, top, 1254 - right, 1254 - bottom)).toBeGreaterThanOrEqual(96);
      expect(walkBottom).toBe(448);
      expect(walkRight - walkLeft).toBeGreaterThan(0);
      expect(walkBottom - walkTop).toBeGreaterThan(0);
      expect(existsSync(image(gaze.file.replace('.png', '.webp')))).toBe(true);
    }
  }
});
