import type { Weather } from '../../sim/types';

/** The colour of the kingdom at a given hour. Curves, not a flat tint. */
export interface Grade {
  mul: [number, number, number];
  lift: [number, number, number];
  sat: number;
}

type Key = [hour: number, grade: Grade];

const NIGHT: Grade = { mul: [0.4, 0.47, 0.74], lift: [0.015, 0.02, 0.07], sat: 0.62 };
const DAWN: Grade = { mul: [1.02, 0.84, 0.86], lift: [0.06, 0.015, 0.05], sat: 0.86 };
const DAY: Grade = { mul: [1.02, 1.01, 0.97], lift: [0, 0, 0], sat: 1.04 };
const GOLD: Grade = { mul: [1.1, 0.92, 0.72], lift: [0.05, 0.015, 0.0], sat: 1.1 };
const DUSK: Grade = { mul: [0.86, 0.6, 0.66], lift: [0.05, 0.0, 0.06], sat: 0.92 };

const KEYS: Key[] = [
  [0, NIGHT],
  [4.5, NIGHT],
  [6.2, DAWN],
  [8, DAY],
  [16, DAY],
  [18, GOLD],
  [19.5, DUSK],
  [21.5, NIGHT],
  [24, NIGHT],
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: number[], b: number[], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export function gradeAt(hour: number, weather: Weather): Grade {
  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1][0]) i++;
  const [ha, ga] = KEYS[i];
  const [hb, gb] = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (hour - ha) / (hb - ha)));
  const out: Grade = { mul: mix3(ga.mul, gb.mul, t), lift: mix3(ga.lift, gb.lift, t), sat: mix(ga.sat, gb.sat, t) };
  if (weather === 'rain') {
    out.mul = [out.mul[0] * 0.62, out.mul[1] * 0.68, out.mul[2] * 0.82];
    out.sat *= 0.68;
  } else if (weather === 'cloudy') {
    out.mul = [out.mul[0] * 0.92, out.mul[1] * 0.93, out.mul[2] * 0.96];
    out.sat *= 0.9;
  } else if (weather === 'fog') {
    out.sat *= 0.72;
  }
  return out;
}

/** 0 at full day, 1 at full night: drives lamp glow, windows and fireflies. */
export function nightness(hour: number): number {
  if (hour < 5) return 1;
  if (hour < 7) return 1 - (hour - 5) / 2;
  if (hour < 18) return 0;
  if (hour < 20.5) return (hour - 18) / 2.5;
  return 1;
}

/** Which two painted skies are showing, and the blend between them. */
export function skyBlend(hour: number): { day: number; dusk: number; night: number } {
  const n = nightness(hour);
  const nearDusk = Math.max(
    1 - Math.min(1, Math.abs(hour - 6.3) / 1.8),
    1 - Math.min(1, Math.abs(hour - 18.8) / 2.2),
  );
  const dusk = Math.min(1, nearDusk * 1.4);
  return { day: 1, dusk, night: n };
}

/** How the sun sits: `angle` in radians from vertical, `height` 0 at horizon to 1 at noon. */
export function sunAt(hour: number): { angle: number; height: number } {
  const t = (hour - 12) / 7;
  return { angle: t * 1.25, height: Math.max(0, 1 - t * t) };
}
