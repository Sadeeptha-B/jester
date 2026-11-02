import type { World } from './types';

const MAX_ENTRIES = 300;
const KEEP_RECENT = 80;
const MAX_FACTS = 60;

export function writeChronicle(world: World, text: string, kind: string, salience: number) {
  world.chronicle.unshift({ day: world.clock.day, text, kind, salience });
  if (world.chronicle.length > MAX_ENTRIES) compact(world);
}

/**
 * History condenses as it ages: recent days are kept whole, older ones only
 * where they mattered. This is what keeps a years-old save small.
 */
export function compact(world: World) {
  const recent = world.chronicle.slice(0, KEEP_RECENT);
  const older = world.chronicle.slice(KEEP_RECENT).filter((e) => e.salience >= 2);
  const kept = older.length > MAX_ENTRIES - KEEP_RECENT ? older.filter((e) => e.salience >= 3) : older;
  world.chronicle = [...recent, ...kept].slice(0, MAX_ENTRIES);
}

export function remember(world: World, key: string, text: string) {
  world.facts = world.facts.filter((f) => f.key !== key);
  world.facts.unshift({ key, day: world.clock.day, text });
  world.facts.length = Math.min(world.facts.length, MAX_FACTS);
}
