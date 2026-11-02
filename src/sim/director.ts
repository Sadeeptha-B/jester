import { CITIZENS } from '../narrative/content/citizens';
import { JESTER_LINES } from '../narrative/content/jester';
import { ARCS, EVENTS, OPENING_ACT } from '../narrative/registry';
import type { EventDef } from '../narrative/schema';
import { seconds } from './clock';
import { holds } from './conditions';
import { findPath, nearestWalkable } from './nav';
import { next, range } from './rng';
import { pointFor, startScene } from './scenes';
import { render } from './text';
import type { Cue, Pacing, World } from './types';

/** How long the Stage Manager leaves between things, in real seconds at normal speed. */
const RHYTHM: Record<Pacing, { ambient: [number, number]; incident: [number, number]; decision: [number, number]; quip: [number, number] }> = {
  quiet: { ambient: [120, 220], incident: [720, 1200], decision: [1800, 3000], quip: [300, 600] },
  balanced: { ambient: [60, 120], incident: [300, 480], decision: [900, 1200], quip: [150, 320] },
  chaotic: { ambient: [28, 60], incident: [120, 200], decision: [360, 540], quip: [70, 160] },
};

const NO_REPEAT = 12;

const available = (world: World, id: string) => {
  const c = world.citizens[id];
  return Boolean(c) && !c.inside && !c.absent && !c.lifted && !c.staged && c.faintUntil <= world.tick && c.plan.mode !== 'inside';
};

/** Fill an event's roles from whoever is awake, or return null if it can't be staged. */
export function castFor(world: World, e: EventDef, offstage = false): Record<string, string> | null {
  const cast: Record<string, string> = {};
  const free = (id: string) => (offstage ? !world.citizens[id].absent : available(world, id));
  for (const [role, spec] of Object.entries(e.cast)) {
    if (typeof spec === 'string') {
      if (!free(spec)) return null;
      cast[role] = spec;
    }
  }
  for (const [role, spec] of Object.entries(e.cast)) {
    if (typeof spec === 'string') continue;
    const taken = new Set(Object.values(cast));
    const pool = CITIZENS.filter(
      (c) => !c.animal && free(c.id) && !taken.has(c.id) && !spec.not?.includes(c.id) && (!spec.trait || c.traits.includes(spec.trait)),
    );
    if (!pool.length) return null;
    cast[role] = pool[Math.floor(next(world) * pool.length)].id;
  }
  return cast;
}

function eligible(world: World, e: EventDef): boolean {
  const seen = world.director.lastSeen[e.id];
  if (e.once && seen !== undefined) return false;
  if (e.cooldownDays && seen !== undefined && world.clock.day - seen < e.cooldownDays) return false;
  if (world.director.recent.slice(0, NO_REPEAT).includes(e.id)) return false;
  if (e.decision && world.pending) return false;
  if (!holds(world, e.when)) return false;
  // An arc rests between stages, so that consequences have room to be noticed.
  if (e.kind === 'arc') {
    for (const arc of ARCS) if (e.tags.includes(arc.id) && world.arcs[arc.id]?.status === 'active' && world.clock.day - world.arcs[arc.id].lastDay < arc.gapDays) return false;
  }
  return true;
}

function score(world: World, e: EventDef): number {
  let s = e.weight;
  const recentTags = world.director.recent.slice(0, 6).flatMap((id) => EVENTS.find((x) => x.id === id)?.tags ?? []);
  for (const tag of e.tags) if (recentTags.includes(tag)) s *= 0.55;
  if (e.callback) s *= 1.6;
  // An active story wants to go somewhere.
  if (e.kind === 'arc') s *= 4;
  return s;
}

/** Choose among eligible events by weight, given a filter on kind. */
export function chooseEvent(world: World, kinds: EventDef['kind'][], decisions: 'yes' | 'no' | 'any', offstage = false) {
  const options: { e: EventDef; cast: Record<string, string>; s: number }[] = [];
  for (const e of EVENTS) {
    if (!kinds.includes(e.kind)) continue;
    if (decisions === 'no' && e.decision) continue;
    if (decisions === 'yes' && !e.decision) continue;
    if (offstage && !e.offstage) continue;
    if (!eligible(world, e)) continue;
    const cast = castFor(world, e, offstage);
    if (!cast) continue;
    // Variety in who is on stage: nobody leads twice running.
    const lead = Object.values(cast)[0];
    if (!offstage && lead && lead === world.director.lastLead) continue;
    options.push({ e, cast, s: score(world, e) });
  }
  if (!options.length) return null;
  let roll = next(world) * options.reduce((n, o) => n + o.s, 0);
  for (const o of options) {
    roll -= o.s;
    if (roll <= 0) return o;
  }
  return options[options.length - 1];
}

export function markSeen(world: World, e: EventDef, cast: Record<string, string>) {
  const d = world.director;
  d.recent.unshift(e.id);
  d.recent.length = Math.min(d.recent.length, 24);
  d.lastSeen[e.id] = world.clock.day;
  d.lastLead = Object.values(cast)[0] ?? null;
}

function begin(world: World, e: EventDef, cast: Record<string, string>) {
  markSeen(world, e, cast);
  startScene(world, `event:${e.id}`, cast);
  // The Jester turns up wherever anything is happening, uninvited.
  const jester = world.citizens.jester;
  const at = pointFor(e.at);
  if (e.kind !== 'ambient' && at && available(world, 'jester') && !Object.values(cast).includes('jester')) {
    jester.path = findPath(jester.pos, nearestWalkable(at.x - 26, at.y + 14));
    jester.until = world.tick + seconds(40);
  }
}

function setNext(world: World, key: 'ambient' | 'incident' | 'decision' | 'quip') {
  const [lo, hi] = RHYTHM[world.settings.pacing][key];
  const d = world.director;
  const at = world.tick + seconds(range(world, lo, hi));
  if (key === 'ambient') d.nextAmbient = at;
  if (key === 'incident') d.nextIncident = at;
  if (key === 'decision') d.nextDecision = at;
  if (key === 'quip') d.nextQuip = at;
}

function quip(world: World, cues: Cue[]) {
  const d = world.director;
  const options: number[] = [];
  JESTER_LINES.forEach((line, i) => {
    if (!d.quips.includes(i) && holds(world, line.when)) options.push(i);
  });
  if (!options.length) {
    d.quips = [];
    return;
  }
  // Situational remarks beat general ones when there are any to hand.
  const pointed = options.filter((i) => JESTER_LINES[i].when);
  const pool = pointed.length && next(world) < 0.7 ? pointed : options;
  const i = pool[Math.floor(next(world) * pool.length)];
  d.quips.unshift(i);
  d.quips.length = Math.min(d.quips.length, 40);
  cues.push({ type: 'quip', text: render(world, JESTER_LINES[i].text), mood: JESTER_LINES[i].mood });
}

/** The Stage Manager: decides what happens next, and more often, that nothing should. */
export function stepDirector(world: World, cues: Cue[]) {
  const d = world.director;

  if (world.tick >= d.nextQuip) {
    setNext(world, 'quip');
    if (!world.scene) quip(world, cues);
  }
  if (world.scene || world.queue.length) return;

  // The first session is curated, so that the first minutes always land.
  if (d.opening < OPENING_ACT.length) {
    const beat = OPENING_ACT[d.opening];
    if (world.tick < seconds(beat.at)) return;
    const e = EVENTS.find((x) => x.id === beat.event)!;
    const cast = castFor(world, e);
    if (!cast) return;
    d.opening += 1;
    begin(world, e, cast);
    return;
  }

  if (world.tick >= d.nextIncident) {
    const wantDecision = world.tick >= d.nextDecision && !world.pending;
    const pickd =
      (wantDecision && chooseEvent(world, ['arc', 'incident'], 'yes')) ||
      chooseEvent(world, ['arc', 'incident'], 'no');
    if (pickd) {
      setNext(world, 'incident');
      if (pickd.e.decision) setNext(world, 'decision');
      begin(world, pickd.e, pickd.cast);
      return;
    }
  }
  if (world.tick >= d.nextAmbient) {
    setNext(world, 'ambient');
    const pickd = chooseEvent(world, ['ambient'], 'no');
    if (pickd) begin(world, pickd.e, pickd.cast);
  }
}
