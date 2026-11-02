import { CITIZEN_BY_ID, CITIZENS, type Citizen, type Slot } from '../narrative/content/citizens';
import { LAMPS, LOCATIONS, SQUARE, type Pt } from '../narrative/content/map';
import { hourOf, seconds, TICK_S } from './clock';
import { findPath, nearestWalkable } from './nav';
import { chance, next, pick, range } from './rng';
import { tell } from './rumours';
import type { CitizenState, Cue, EmoteKind, World } from './types';
import { relation } from './world';

const WALK_SPEED = 15;

/** The schedule slot in force, nudged per citizen so the town doesn't move in unison. */
function slotIndex(def: Citizen, hour: number, order: number): number {
  const h = (hour - (order % 5) * 0.12 + 24) % 24;
  let found = def.schedule.length - 1;
  for (let i = 0; i < def.schedule.length; i++) if (def.schedule[i].from <= h) found = i;
  // A slot starting after midnight belongs to the small hours, and the last slot wraps round.
  return found;
}

function walkTo(c: CitizenState, target: Pt) {
  c.path = findPath(c.pos, target);
}

function spotIn(world: World, slot: Slot): Pt {
  if (slot.spot) return slot.spot;
  if (slot.at === 'home') return world.citizens.jester.pos; // never reached; homes use the door
  const spot = pick(world, LOCATIONS[slot.at].spots);
  return nearestWalkable(spot.x + range(world, -5, 5), spot.y + range(world, -3, 3));
}

function adopt(world: World, c: CitizenState, def: Citizen, slot: Slot, index: number) {
  c.slot = index;
  c.plan = { at: slot.at, doing: slot.doing, thought: slot.thought, mode: slot.mode ?? 'idle' };
  c.route = 0;
  if (c.plan.mode === 'inside') {
    walkTo(c, def.door);
  } else {
    c.inside = false;
    if (c.plan.mode === 'patrol') {
      c.route = Math.floor(next(world) * (def.route?.length ?? 1));
    } else if (c.plan.mode !== 'lamps') {
      walkTo(c, spotIn(world, slot));
    }
  }
  c.until = 0;
}

/** Stepping out of doors again after a night in. */
function emerge(c: CitizenState, def: Citizen) {
  if (c.inside) {
    c.inside = false;
    c.pos = { ...def.door };
  }
}

function reconsider(world: World, c: CitizenState, def: Citizen, slot: Slot) {
  switch (c.plan.mode) {
    case 'inside':
      c.inside = true;
      c.until = world.tick + seconds(30);
      return;
    case 'fixed':
      c.facing = 'front';
      c.until = world.tick + seconds(range(world, 10, 30));
      return;
    case 'patrol': {
      const route = def.route!;
      c.route = (c.route + 1) % route.length;
      walkTo(c, route[c.route]);
      c.until = world.tick + seconds(range(world, 1, 4));
      return;
    }
    case 'scurry': {
      // The chicken does not have plans. It has bursts.
      const home = pick(world, ['gardens', 'pond', 'market', 'square', 'woods', 'tavern'] as const);
      walkTo(c, spotIn(world, { ...slot, at: chance(world, 0.3) ? home : 'gardens' }));
      c.until = world.tick + seconds(range(world, 2, 9));
      return;
    }
    case 'pace': {
      // Short agitated turns around a spot.
      const span = 16;
      walkTo(c, nearestWalkable(c.pos.x + range(world, -span, span), c.pos.y + range(world, -5, 5)));
      c.until = world.tick + seconds(range(world, 2, 6));
      return;
    }
    default: {
      if (chance(world, 0.55)) walkTo(c, spotIn(world, slot));
      else c.facing = pick(world, ['front', 'side', 'front', 'back'] as const);
      c.until = world.tick + seconds(range(world, 7, 24));
    }
  }
}

function lampRound(world: World, c: CitizenState, cues: Cue[]) {
  const hour = hourOf(world.clock);
  // Lit by dusk, snuffed at dawn; between rounds Wick stands guard at the square.
  const lighting = hour >= 18 || hour < 2;
  const snuffing = hour >= 5 && hour < 9;
  const wantLit = lighting;
  if (!lighting && !snuffing) return false;
  const nextLamp = world.lamps.findIndex((lit) => lit !== wantLit);
  if (nextLamp < 0) return false;
  const lamp = LAMPS[nextLamp];
  if (Math.hypot(c.pos.x - lamp.x, c.pos.y - (lamp.y + 4)) < 6) {
    world.lamps[nextLamp] = wantLit;
    cues.push({ type: 'lamp', index: nextLamp, lit: wantLit });
    c.until = world.tick + seconds(1);
    return true;
  }
  walkTo(c, { x: lamp.x, y: lamp.y + 4 });
  return true;
}

function walk(c: CitizenState, step: number) {
  let left = step;
  while (left > 0 && c.path.length) {
    const target = c.path[0];
    const dx = target.x - c.pos.x;
    const dy = target.y - c.pos.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      c.pos.x = target.x;
      c.pos.y = target.y;
      c.path.shift();
      left -= d;
    } else {
      c.pos.x += (dx / d) * left;
      c.pos.y += (dy / d) * left;
      left = 0;
    }
    if (d > 0.01) {
      if (Math.abs(dx) > Math.abs(dy) * 0.8) {
        c.facing = 'side';
        c.flip = dx < 0;
      } else {
        c.facing = dy < 0 ? 'back' : 'front';
      }
    }
  }
}

function bystanderChat(world: World, c: CitizenState, cues: Cue[]) {
  // Citizens passing close may stop to exchange a few choice icons.
  if (world.tick % 5 !== 0 || c.inside || c.lifted) return;
  const defA = CITIZEN_BY_ID[c.id];
  if (defA.animal || c.plan.mode === 'inside' || c.chatUntil > world.tick) return;
  for (const other of Object.values(world.citizens)) {
    if (other.id <= c.id || other.inside || other.absent || other.staged || other.lifted || other.chatUntil > world.tick) continue;
    if (CITIZEN_BY_ID[other.id].animal || other.plan.mode === 'inside') continue;
    if (Math.abs(other.pos.x - c.pos.x) > 16 || Math.abs(other.pos.y - c.pos.y) > 10) continue;
    if (!chance(world, 0.04)) continue;
    const feeling = relation(world, c.id, other.id);
    const kind: EmoteKind = feeling >= 2 ? pick(world, ['love', 'note'] as const) : feeling <= -2 ? 'anger' : pick(world, ['talk', 'talk', 'question'] as const);
    const until = world.tick + seconds(range(world, 4, 7));
    c.chatUntil = other.chatUntil = until;
    c.facing = other.facing = 'side';
    c.flip = other.pos.x < c.pos.x;
    other.flip = !c.flip;
    cues.push({ type: 'emote', id: c.id, kind }, { type: 'emote', id: other.id, kind: feeling <= -2 ? 'anger' : 'talk' });
    if (feeling > -2) {
      tell(world, c, other, cues);
      tell(world, other, c, cues);
    }
    return;
  }
}

/** Advance one citizen by a tick. */
export function stepCitizen(world: World, c: CitizenState, order: number, cues: Cue[]) {
  const def = CITIZEN_BY_ID[c.id];
  if (c.absent || c.lifted) return;
  if (c.faintUntil > world.tick) return;
  if (c.staged) {
    // On stage, citizens walk where the scene sends them and otherwise hold their mark.
    if (c.path.length) walk(c, (def.speed ?? WALK_SPEED) * TICK_S * 1.2);
    return;
  }
  if (c.chatUntil > world.tick) return;

  const index = slotIndex(def, hourOf(world.clock), order);
  if (index !== c.slot) {
    emerge(c, def);
    adopt(world, c, def, def.schedule[index], index);
  }

  if (c.path.length) {
    walk(c, (def.speed ?? WALK_SPEED) * TICK_S * (c.plan.mode === 'patrol' ? 0.85 : 1));
    bystanderChat(world, c, cues);
    return;
  }
  if (c.plan.mode === 'inside' && !c.inside) {
    c.inside = true;
    return;
  }
  if (world.tick < c.until) {
    bystanderChat(world, c, cues);
    return;
  }
  if (c.plan.mode === 'lamps' && lampRound(world, c, cues)) return;
  reconsider(world, c, def, def.schedule[c.slot]);
}

/** The little habits that make citizens themselves, checked a couple of times a minute. */
function quirks(world: World, cues: Cue[]) {
  if (world.tick % seconds(3) !== 0) return;
  const percival = world.citizens.percival;
  const gerald = world.citizens.gerald;
  const nearBirds = Math.hypot(percival.pos.x - SQUARE.x, percival.pos.y - (SQUARE.y + 8)) < 40;
  const nearGerald = Math.hypot(percival.pos.x - gerald.pos.x, percival.pos.y - gerald.pos.y) < 26;
  if (!percival.lifted && !percival.inside && (nearBirds || nearGerald) && chance(world, nearGerald ? 0.6 : 0.2)) {
    cues.push({ type: 'emote', id: 'percival', kind: 'sweat' });
  }

  const archibald = world.citizens.archibald;
  if (!archibald.inside && !archibald.lifted && !archibald.staged && archibald.plan.at === 'tower' && chance(world, 0.1)) {
    cues.push({ type: 'flash', x: archibald.pos.x + 8, y: archibald.pos.y - 8 });
    cues.push({ type: 'emote', id: 'archibald', kind: chance(world, 0.3) ? 'star' : 'exclaim' });
    const pip = world.citizens.pip;
    if (!pip.inside && Math.hypot(pip.pos.x - archibald.pos.x, pip.pos.y - archibald.pos.y) < 40) {
      cues.push({ type: 'emote', id: 'pip', kind: 'sweat' });
    }
  }

  const wick = world.citizens.wick;
  if (!wick.inside && wick.plan.mode === 'lamps' && wick.path.length === 0 && chance(world, 0.12)) {
    cues.push({ type: 'emote', id: 'wick', kind: 'note' });
  }
}

export function stepCitizens(world: World, cues: Cue[]) {
  CITIZENS.forEach((def, i) => stepCitizen(world, world.citizens[def.id], i, cues));
  quirks(world, cues);
}
