import type { World } from './types';

/** Seeded generator whose whole state lives in the world, so saves replay exactly. */
export function next(world: World): number {
  world.rng = (world.rng + 0x6d2b79f5) >>> 0;
  let t = world.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(world: World, lo: number, hi: number): number {
  return lo + next(world) * (hi - lo);
}

export function int(world: World, lo: number, hi: number): number {
  return Math.floor(range(world, lo, hi + 1));
}

export function pick<T>(world: World, items: readonly T[]): T {
  return items[Math.floor(next(world) * items.length)];
}

export function chance(world: World, p: number): boolean {
  return next(world) < p;
}
