/**
 * The Elsewhere palette. Every pixel in the kingdom is one of these 32 colours.
 * Keys are single characters so sprite grids stay readable as text.
 *
 * Rule of thumb: the environment lives in the muted ramps. The accent ramp at
 * the bottom is reserved for characters and events, so the eye finds them.
 */
export const PALETTE = {
  // plum ink, used for outlines instead of black
  k: '#2a1f3d',
  K: '#453354',
  p: '#6b4f73',
  P: '#9a7c95',
  // creams and stone
  w: '#f6ecd4',
  W: '#e3d2ad',
  s: '#bfa98a',
  S: '#8f7d6e',
  d: '#5f5360',
  // wood and terracotta
  b: '#4a2f2b',
  B: '#76493a',
  t: '#a86b4a',
  T: '#cf8e5f',
  c: '#eec39a',
  e: '#b98668',
  // foliage
  g: '#2f4a45',
  G: '#3f6450',
  m: '#5f8a5c',
  M: '#8aae6b',
  l: '#b9cc86',
  // water and slate
  n: '#24384f',
  N: '#35586c',
  a: '#4f8a8b',
  A: '#86bcae',
  i: '#c7e3d1',
  // accents: characters and events only
  r: '#b3283f',
  R: '#e0524a',
  o: '#ef8f2f',
  y: '#f5c93e',
  Y: '#fbe88a',
  v: '#6a3f9e',
  u: '#1fa79b',
} as const;

export type Colour = keyof typeof PALETTE;

export const COLOURS = Object.keys(PALETTE) as Colour[];

/** Index 0 is transparent; palette colours start at 1. */
export const INDEX: Record<string, number> = Object.fromEntries(COLOURS.map((c, i) => [c, i + 1]));

export const RGB: [number, number, number][] = [
  [0, 0, 0],
  ...COLOURS.map((c) => {
    const hex = PALETTE[c];
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ] as [number, number, number];
  }),
];
