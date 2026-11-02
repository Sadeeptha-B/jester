import { CITIZENS } from '../narrative/content/citizens';
import { RUMOUR_OBJECTS, RUMOUR_VERBS } from '../narrative/content/rumours';
import { addDeed } from './effects';
import { chance, pick } from './rng';
import type { CitizenState, Cue, Rumour, World } from './types';

const MAX_RUMOURS = 12;

const gossip = () => CITIZENS.filter((c) => !c.animal && !c.offstage);

export function describeRumour(r: Rumour): string {
  const subject = CITIZENS.find((c) => c.id === r.subject)?.name ?? 'Someone';
  return `${subject} ${r.verb} ${r.object}`;
}

export function inventRumour(world: World, teller: CitizenState, subject?: string): Rumour {
  const about = subject ?? pick(world, gossip().filter((c) => c.id !== teller.id)).id;
  const r: Rumour = { id: world.nextId++, subject: about, verb: pick(world, RUMOUR_VERBS), object: pick(world, RUMOUR_OBJECTS), day: world.clock.day, told: 0 };
  world.rumours.unshift(r);
  if (world.rumours.length > MAX_RUMOURS) {
    const dropped = world.rumours.pop()!;
    for (const c of Object.values(world.citizens)) if (c.belief === dropped.id) c.belief = null;
  }
  teller.belief = r.id;
  return r;
}

/** Passing a rumour on, with the usual small improvements. */
export function tell(world: World, from: CitizenState, to: CitizenState, cues: Cue[]) {
  if (from.belief === null || to.belief === from.belief) return;
  const original = world.rumours.find((r) => r.id === from.belief);
  if (!original) return;
  let heard = original;
  if (chance(world, 0.3)) {
    heard = {
      ...original,
      id: world.nextId++,
      verb: chance(world, 0.5) ? pick(world, RUMOUR_VERBS) : original.verb,
      object: chance(world, 0.6) ? pick(world, RUMOUR_OBJECTS) : original.object,
      told: original.told,
    };
    world.rumours.unshift(heard);
    if (world.rumours.length > MAX_RUMOURS) {
      const dropped = world.rumours.pop()!;
      for (const c of Object.values(world.citizens)) if (c.belief === dropped.id) c.belief = null;
    }
  }
  heard.told += 1;
  to.belief = heard.id;
  cues.push({ type: 'emote', id: to.id, kind: 'exclaim' });
  if (heard.told === 5) {
    world.flags.rumour_ripe = heard.id;
    addDeed(world, world.citizens[heard.subject], `Is the subject of a widespread story: ${describeRumour(heard)}.`);
  }
}

/** Humphrey is never without something new, generally by opening time. */
export function stepRumours(world: World) {
  const humphrey = world.citizens.humphrey;
  if (humphrey.inside || humphrey.belief !== null) return;
  inventRumour(world, humphrey);
}

export function believes(world: World, c: CitizenState): string | null {
  const r = world.rumours.find((x) => x.id === c.belief);
  return r ? describeRumour(r) : null;
}
