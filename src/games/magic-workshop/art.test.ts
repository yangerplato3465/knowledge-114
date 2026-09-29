import { expect, it } from 'vitest';
import { ART, REACTIONS, GUESTS, fitArt } from './art';

it('全部素材等比放置，完整可見範圍保有動作留白且腳底對齊', () => {
  for (const spec of Object.values(ART)) {
    const fit = fitArt(spec, 240, 260);
    const [left, top, right, bottom] = spec.bounds;
    expect(fit.x + left * fit.scale).toBeGreaterThanOrEqual(15.99);
    expect(fit.x + right * fit.scale).toBeLessThanOrEqual(224.01);
    expect(fit.y + top * fit.scale).toBeGreaterThanOrEqual(15.99);
    expect(fit.y + bottom * fit.scale).toBeCloseTo(244);
    // Full image keeps its original square aspect; alpha padding is never used as character size.
    expect(fit.size).toBeCloseTo(1254 * fit.scale);
  }
  expect(new Set(GUESTS.map(guest => guest.art)).size).toBe(5);
  const visibleHeight = (key: keyof typeof ART) => {
    const spec = ART[key]; return (spec.bounds[3] - spec.bounds[1]) * fitArt(spec, 240, 260).scale;
  };
  expect(visibleHeight('owl')).toBeLessThan(visibleHeight('deer'));
});

it('六張反應圖各自校正：與原姿勢可見高度相同且腳底一致', () => {
  expect(Object.keys(REACTIONS)).toHaveLength(6);
  for (const [base, pose] of Object.entries(REACTIONS)) {
    const neutral = ART[base as keyof typeof ART], happy = ART[pose];
    const a = fitArt(neutral, 240, 260), b = fitArt(happy, 240, 260);
    expect(a.baseline).toBe(b.baseline);
    expect((neutral.bounds[3] - neutral.bounds[1]) * a.scale).toBeCloseTo((happy.bounds[3] - happy.bounds[1]) * b.scale);
  }
});
