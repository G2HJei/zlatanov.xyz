import type CanvasParticles from 'canvasparticles-js';

export type ParticleOptions = NonNullable<ConstructorParameters<typeof CanvasParticles>[1]>;

/** The effect only runs while this query matches. */
export const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';

/**
 * Options for canvasparticles-js, the drifting dots joined by hairlines behind every
 * page. Tune density, reach and pace here; the colour is the `accent` token, read from
 * the canvas at run time, and the overall intensity is the canvas `opacity` in
 * `Particles.astro`. `interactionType` 0 is NONE: the cursor never shifts, pushes or
 * attracts a particle, which keeps the background from competing with the content.
 */
export function particleOptions(color: string): ParticleOptions {
  return {
    background: false,
    mouse: { interactionType: 0 },
    particles: {
      color,
      /** Particles per million CSS pixels of viewport. */
      ppm: 60,
      /** Cap for very large screens; lines cost quadratically in local density. */
      max: 240,
      /** Longest line, in CSS pixels; lines fade out towards this length. */
      connectDistance: 140,
      /** Fraction of the library's default drift speed: a slow, calm wander. */
      relSpeed: 0.4,
      relSize: 0.8,
    },
  };
}
