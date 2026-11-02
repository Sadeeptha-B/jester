import type { Clock } from './types';

/** Fixed logical tick. Rendering interpolates between these. */
export const TICK_HZ = 5;
export const TICK_S = 1 / TICK_HZ;

/** One fictional day passes in fifteen real minutes while the kingdom is watched. */
export const REAL_SECONDS_PER_DAY = 900;
export const MINUTES_PER_TICK = (1440 / REAL_SECONDS_PER_DAY) * TICK_S;

export const seconds = (s: number) => Math.round(s * TICK_HZ);

export function advance(clock: Clock, minutes: number): boolean {
  clock.minute += minutes;
  if (clock.minute < 1440) return false;
  clock.minute -= 1440;
  clock.day += 1;
  return true;
}

export const hourOf = (clock: Clock) => clock.minute / 60;

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const weekday = (day: number) => WEEKDAYS[(day - 1) % 7];

export type Phase = 'Dawn' | 'Morning' | 'Noon' | 'Afternoon' | 'Dusk' | 'Evening' | 'Night';

export function phaseOf(hour: number): Phase {
  if (hour < 5) return 'Night';
  if (hour < 7.5) return 'Dawn';
  if (hour < 11) return 'Morning';
  if (hour < 14) return 'Noon';
  if (hour < 17.5) return 'Afternoon';
  if (hour < 20) return 'Dusk';
  if (hour < 23) return 'Evening';
  return 'Night';
}
