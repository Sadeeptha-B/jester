import { CITIZENS, INITIAL_RELATIONS } from '../narrative/content/citizens';
import { LAMPS, LOCATIONS } from '../narrative/content/map';
import type { CitizenState, World } from './types';

export const relationKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function relation(world: World, a: string, b: string): number {
  return world.relations[relationKey(a, b)] ?? 0;
}

export function createWorld(seed: number): World {
  const citizens: Record<string, CitizenState> = {};
  for (const c of CITIZENS) {
    const first = c.schedule[0];
    const loc = first.at === 'home' ? c.door : (LOCATIONS[first.at].spots[0] ?? LOCATIONS[first.at].centre);
    citizens[c.id] = {
      id: c.id,
      pos: { ...loc },
      path: [],
      facing: 'front',
      flip: false,
      plan: { at: first.at, doing: first.doing, thought: first.thought, mode: first.mode ?? 'idle' },
      until: 0,
      slot: -1,
      inside: false,
      lifted: false,
      faintUntil: 0,
      chatUntil: 0,
      mood: 0,
      liftCount: 0,
      deeds: [],
      route: 0,
    };
  }
  const relations: Record<string, number> = {};
  for (const [a, b, v] of INITIAL_RELATIONS) relations[relationKey(a, b)] = v;

  return {
    version: 1,
    seed,
    rng: seed >>> 0,
    tick: 0,
    clock: { day: 1, minute: 7.5 * 60 },
    weather: 'clear',
    weatherUntil: 0,
    citizens,
    relations,
    lamps: LAMPS.map(() => false),
  };
}
