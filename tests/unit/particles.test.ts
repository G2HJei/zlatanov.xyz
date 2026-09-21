import { describe, expect, it } from 'vitest';

import { MOTION_QUERY, particleOptions } from '../../src/lib/particles';

describe('particleOptions', () => {
  it('turns mouse interaction off so the background never reacts to the cursor', () => {
    expect(particleOptions('#20c20e').mouse?.interactionType).toBe(0);
  });

  it('paints with the colour it is given and draws no background of its own', () => {
    const options = particleOptions('rgb(32, 194, 14)');
    expect(options.particles?.color).toBe('rgb(32, 194, 14)');
    expect(options.background).toBe(false);
  });

  it('caps the particle count for very large screens', () => {
    const { ppm, max } = particleOptions('#20c20e').particles ?? {};
    expect(ppm).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(300);
  });
});

it('only runs when the visitor has not asked for reduced motion', () => {
  expect(MOTION_QUERY).toBe('(prefers-reduced-motion: no-preference)');
});
