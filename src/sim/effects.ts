import { CITIZEN_BY_ID, OFFICE_NAMES } from '../narrative/content/citizens';
import { LANDMARK_BY_ID } from '../narrative/content/landmarks';
import { LOCATIONS, PLOTS } from '../narrative/content/map';
import type { Effect } from '../narrative/schema';
import { seconds } from './clock';
import { remember, writeChronicle } from './memory';
import { render } from './text';
import type { CitizenState, World } from './types';
import { relationKey } from './world';

const MAX_DEEDS = 12;
const TICKS_PER_HOUR = seconds(37.5);

/** Thrown when an effect refers to something that does not exist. Content tests rely on it. */
export class InvalidEffect extends Error {}

export function addDeed(world: World, c: CitizenState, text: string) {
  c.deeds.unshift({ day: world.clock.day, text });
  c.deeds.length = Math.min(c.deeds.length, MAX_DEEDS);
}

/** Would this effect be accepted? Used to reject invalid outcomes before they touch the world. */
export function validEffect(effect: Effect, cast: Record<string, string> = {}): boolean {
  const ref = (id: string) => (id.startsWith('$') ? (cast[id.slice(1)] ?? id) : (cast[id] ?? id));
  switch (effect.type) {
    case 'relationship':
      return Boolean(CITIZEN_BY_ID[ref(effect.a)] && CITIZEN_BY_ID[ref(effect.b)]);
    case 'appoint':
      return Boolean(OFFICE_NAMES[ref(effect.office)] && CITIZEN_BY_ID[ref(effect.citizen)]);
    case 'hat':
    case 'epithet':
    case 'deed':
    case 'mood':
    case 'arrive':
    case 'depart':
      return Boolean(CITIZEN_BY_ID[ref(effect.citizen)]);
    case 'landmark':
    case 'removeLandmark':
      return Boolean(LANDMARK_BY_ID[effect.id]);
    default:
      return true;
  }
}

/**
 * The single place the story changes the world. Scenes, away time and any future
 * proposer all come through here, so an event resolves the same however it happens.
 */
export function applyEffect(world: World, effect: Effect, cast: Record<string, string> = {}) {
  if (!validEffect(effect, cast)) throw new InvalidEffect(`Rejected effect ${JSON.stringify(effect)}`);
  const ref = (id: string) => (id.startsWith('$') ? (cast[id.slice(1)] ?? id) : (cast[id] ?? id));
  const day = world.clock.day;

  switch (effect.type) {
    case 'setFlag':
      world.flags[effect.flag] = effect.value ?? true;
      break;
    case 'relationship': {
      const key = relationKey(ref(effect.a), ref(effect.b));
      const entry = (world.relations[key] ??= { value: 0 });
      entry.value = Math.max(-5, Math.min(5, entry.value + effect.delta));
      if (effect.reason) {
        entry.reason = render(world, effect.reason, cast);
        writeChronicle(world, `${CITIZEN_BY_ID[ref(effect.a)].name} and ${CITIZEN_BY_ID[ref(effect.b)].name}: ${entry.reason}.`, 'relation', 1);
      }
      break;
    }
    case 'appoint': {
      const office = ref(effect.office);
      const citizen = ref(effect.citizen);
      world.offices[office] = citizen;
      writeChronicle(world, `${CITIZEN_BY_ID[citizen].name} became ${OFFICE_NAMES[office]}.`, 'office', 2);
      break;
    }
    case 'hat':
      world.citizens[ref(effect.citizen)].hat = effect.hat;
      break;
    case 'epithet': {
      const c = world.citizens[ref(effect.citizen)];
      const text = render(world, effect.text, cast);
      if (!c.epithets.includes(text)) c.epithets.unshift(text);
      break;
    }
    case 'deed':
      addDeed(world, world.citizens[ref(effect.citizen)], render(world, effect.text, cast));
      break;
    case 'mood': {
      const c = world.citizens[ref(effect.citizen)];
      c.mood = Math.max(-5, Math.min(5, c.mood + effect.delta));
      break;
    }
    case 'landmark': {
      const existing = world.landmarks.find((l) => l.id === effect.id);
      if (existing) {
        existing.size = effect.size ?? existing.size;
        break;
      }
      const def = LANDMARK_BY_ID[effect.id];
      const taken = new Set(world.landmarks.map((l) => l.plot));
      let plot = def.plot !== undefined && !taken.has(def.plot) ? def.plot : PLOTS.findIndex((_, i) => !taken.has(i));
      if (plot < 0) {
        // Every plot is full: history is written over its oldest monument.
        const oldest = world.landmarks.shift()!;
        plot = oldest.plot;
      }
      world.landmarks.push({ id: effect.id, plot, day, size: effect.size });
      writeChronicle(world, `${def.name} appeared.`, 'landmark', 2);
      break;
    }
    case 'removeLandmark':
      world.landmarks = world.landmarks.filter((l) => l.id !== effect.id);
      break;
    case 'enactLaw':
      if (!world.laws.includes(effect.id)) world.laws.push(effect.id);
      break;
    case 'repealLaw':
      world.laws = world.laws.filter((l) => l !== effect.id);
      break;
    case 'startArc':
      world.arcs[effect.id] = { stage: effect.stage, status: 'active', startedDay: day, lastDay: day };
      break;
    case 'advanceArc': {
      const arc = world.arcs[effect.id];
      if (!arc) throw new InvalidEffect(`Arc ${effect.id} has not started`);
      arc.stage = effect.stage;
      arc.lastDay = day;
      break;
    }
    case 'endArc': {
      const arc = world.arcs[effect.id];
      if (!arc) throw new InvalidEffect(`Arc ${effect.id} has not started`);
      arc.status = 'done';
      arc.outcome = effect.outcome;
      arc.stage = 'ended';
      arc.lastDay = day;
      break;
    }
    case 'chronicle':
      writeChronicle(world, render(world, effect.text, cast), effect.kind ?? 'incident', effect.salience);
      break;
    case 'fact':
      remember(world, effect.key, render(world, effect.text, cast));
      break;
    case 'era':
      if (world.eras[world.eras.length - 1].name !== effect.name) world.eras.push({ name: effect.name, fromDay: day });
      break;
    case 'weather':
      world.weather = effect.weather;
      world.weatherUntil = world.tick + effect.hours * TICKS_PER_HOUR;
      break;
    case 'arrive': {
      const c = world.citizens[ref(effect.citizen)];
      c.absent = false;
      c.pos = { ...LOCATIONS.square.centre };
      c.slot = -1;
      break;
    }
    case 'depart': {
      const c = world.citizens[ref(effect.citizen)];
      c.absent = true;
      c.path = [];
      break;
    }
    case 'holiday':
      world.holiday = { name: effect.name, until: day + effect.days };
      break;
  }
}

export function applyEffects(world: World, effects: Effect[], cast: Record<string, string> = {}) {
  // Reject the whole outcome if any part of it is invalid, so nothing half-applies.
  for (const e of effects) if (!validEffect(e, cast)) throw new InvalidEffect(`Rejected effect ${JSON.stringify(e)}`);
  for (const e of effects) applyEffect(world, e, cast);
}
