import { expect, test } from 'vitest';
import { frameBounds } from './frame-bounds';

test('reviewed fragments are excluded without cutting the main silhouette', () => {
  // Measured opaque silhouette extents and adjacent stray-pixel x positions.
  const cases = [
    ['armored-beast-hurt', 1, 26, 112, 12],
    ['lizard-attack', 0, 20, 106, 112], ['lizard-attack', 2, 24, 110, 12],
    ['lizard-defeat', 1, 21, 113, 12],
    ['colossus-attack', 0, 20, 115, 115], ['colossus-attack', 2, 23, 117, 12],
    ['colossus-hurt', 1, 19, 117, 12], ['colossus-hurt', 2, 16, 117, 12],
    ['storm-dragon-charge', 1, 23, 115, 14], ['void-king-attack', 2, 23, 106, 14],
  ] as const;
  for (const [name, index, bodyLeft, bodyRight, strayX] of cases) {
    const { left, width } = frameBounds(`enemies/${name}-v1`, index);
    expect(left).toBeLessThanOrEqual(bodyLeft);
    expect(left + width).toBeGreaterThanOrEqual(bodyRight);
    expect(strayX < left || strayX >= left + width).toBe(true);
  }
  expect(frameBounds('hero/hero-attack-v1', 2)).toEqual({ left: 0, width: 128 });
  expect(frameBounds('effects/void-slash/void-slash-v1', 2)).toEqual({ left: 0, width: 128 });
});
