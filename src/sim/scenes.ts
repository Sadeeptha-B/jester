import { CITIZEN_BY_ID, CITIZENS } from '../narrative/content/citizens';
import { DECREE_BY_ID, EVENT_BY_ID } from '../narrative/registry';
import { GATE, LOCATIONS, PLOTS, type LocationId, type Pt } from '../narrative/content/map';
import type { Beat, Effect, EventDef } from '../narrative/schema';
import { seconds } from './clock';
import { applyEffects } from './effects';
import { findPath, nearestWalkable } from './nav';
import { next, pick, range } from './rng';
import { render } from './text';
import type { Cue, Mood, World } from './types';

type Staged = {
  beats: Beat[];
  effects: Effect[];
  dispatch?: { title: string; text: string };
  mood: Mood;
  at?: string;
  /** The event whose decision opens when this scene ends. */
  opens?: EventDef;
};

const MAX_SCENE_S = 150;

/** Mabel fetches the scroll, the town gathers, and she reads it out. */
function heraldBeats(text: string): Beat[] {
  return [
    { do: 'go', who: 'herald', to: 'gate' },
    { do: 'wait', s: 1 },
    { do: 'gather', who: ['crowd1', 'crowd2', 'crowd3', 'crowd4'], at: 'square' },
    { do: 'go', who: 'herald', to: 'square' },
    { do: 'emote', who: 'herald', kind: 'exclaim' },
    { do: 'say', who: 'herald', text: 'OYEZ! ...oyez. Oy.' },
    { do: 'say', who: 'herald', text },
  ];
}

/** Scene keys name their content, so a scene saved mid-performance can be finished after a reload. */
export function sceneOf(key: string): Staged {
  const [kind, id, choice] = key.split(':');
  if (kind === 'event') {
    const e = EVENT_BY_ID[id];
    return { beats: e.beats, effects: e.effects, dispatch: e.dispatch, mood: 'smug', at: e.at, opens: e.decision ? e : undefined };
  }
  if (kind === 'choice') {
    const e = EVENT_BY_ID[id];
    const c = e.decision!.choices.find((x) => x.id === choice)!;
    return { beats: [...heraldBeats(c.herald), ...c.beats], effects: c.effects, dispatch: c.dispatch, mood: 'delight', at: 'square' };
  }
  if (kind === 'ignored') {
    const e = EVENT_BY_ID[id];
    const i = e.decision!.ignored;
    return { beats: i.beats, effects: i.effects, dispatch: i.dispatch, mood: 'scheme', at: e.at };
  }
  const d = DECREE_BY_ID[id];
  return { beats: [...heraldBeats(d.herald), ...d.beats], effects: d.effects, dispatch: d.dispatch, mood: 'delight', at: 'square' };
}

export function pointFor(at: string | undefined): Pt | undefined {
  if (!at) return undefined;
  if (at === 'gate') return GATE;
  if (at.startsWith('plot')) return PLOTS[Number(at.slice(4))];
  return LOCATIONS[at as LocationId]?.centre;
}

export function postDispatch(world: World, title: string, text: string, mood: Mood, extra: { event?: string; at?: Pt } = {}) {
  world.dispatch = { id: world.nextId++, day: world.clock.day, title, text, mood, ...extra };
}

function pickCrowd(world: World, avoid: Set<string>): string[] {
  const free = CITIZENS.filter((c) => {
    const s = world.citizens[c.id];
    return !c.animal && !avoid.has(c.id) && !s.inside && !s.absent && !s.lifted && s.plan.mode !== 'inside';
  });
  const out: string[] = [];
  while (out.length < 4 && free.length) out.push(free.splice(Math.floor(next(world) * free.length), 1)[0].id);
  return out;
}

export function startScene(world: World, key: string, cast: Record<string, string>) {
  world.scene = { key, cast: { ...cast }, beat: 0, until: 0, started: world.tick, walking: [] };
  const [kind] = key.split(':');
  if (kind === 'choice' || kind === 'decree') {
    const taken = new Set(Object.values(cast));
    taken.add('mabel');
    world.scene.cast.herald = 'mabel';
    pickCrowd(world, taken).forEach((id, i) => (world.scene!.cast[`crowd${i + 1}`] = id));
  }
  for (const id of Object.values(world.scene.cast)) {
    const c = world.citizens[id];
    if (!c) continue;
    if (c.inside) {
      c.inside = false;
      c.pos = { ...CITIZEN_BY_ID[id].door };
    }
    c.staged = true;
    c.path = [];
    c.chatUntil = 0;
  }
}

function release(world: World) {
  const scene = world.scene!;
  for (const id of Object.values(scene.cast)) {
    const c = world.citizens[id];
    if (!c) continue;
    c.staged = false;
    c.slot = -1;
    c.until = world.tick + seconds(1);
  }
  world.props = [];
  world.scene = null;
}

/** Bring a scene to its end: its effects land and everyone goes back to their lives. */
export function finishScene(world: World, cues: Cue[] = []) {
  const scene = world.scene!;
  const staged = sceneOf(scene.key);
  applyEffects(world, staged.effects, scene.cast);
  const at = pointFor(staged.at);
  if (staged.opens) {
    const e = staged.opens;
    const title = render(world, e.dispatch!.title, scene.cast);
    const text = render(world, e.dispatch!.text, scene.cast);
    world.pending = { event: e.id, cast: scene.cast, day: world.clock.day, deadline: world.clock.day + e.decision!.patienceDays, title, text, at };
    postDispatch(world, title, text, 'shock', { event: e.id, at });
  } else if (staged.dispatch) {
    postDispatch(world, render(world, staged.dispatch.title, scene.cast), render(world, staged.dispatch.text, scene.cast), staged.mood, { at });
  }
  release(world);
  void cues;
}

function targetOf(world: World, scene: NonNullable<World['scene']>, to: string): Pt {
  if (world.citizens[scene.cast[to]]) return world.citizens[scene.cast[to]].pos;
  const p = pointFor(to) ?? LOCATIONS.square.centre;
  return p;
}

function runBeat(world: World, beat: Beat, cues: Cue[]) {
  const scene = world.scene!;
  const who = (role: string) => world.citizens[scene.cast[role]];
  switch (beat.do) {
    case 'go': {
      const c = who(beat.who);
      if (!c) return;
      const t = targetOf(world, scene, beat.to);
      c.path = findPath(c.pos, { x: t.x + 6, y: t.y + 2 });
      scene.walking = [c.id];
      return;
    }
    case 'gather': {
      const centre = pointFor(beat.at) ?? LOCATIONS.square.centre;
      const ids = beat.who.map(who).filter(Boolean);
      ids.forEach((c, i) => {
        const a = (i / Math.max(1, ids.length)) * Math.PI * 2 + 0.6;
        const spot = nearestWalkable(centre.x + Math.cos(a) * 22, centre.y + Math.sin(a) * 11);
        c.path = findPath(c.pos, spot);
      });
      scene.walking = ids.map((c) => c.id);
      return;
    }
    case 'say': {
      const c = who(beat.who);
      if (!c) return;
      const text = render(world, beat.text, scene.cast);
      const ms = Math.max(2200, Math.min(6000, text.length * 62));
      cues.push({ type: 'say', id: c.id, text, ms });
      scene.until = world.tick + seconds(ms / 1000 + 0.3);
      return;
    }
    case 'emote': {
      const c = who(beat.who);
      if (c) cues.push({ type: 'emote', id: c.id, kind: beat.kind });
      scene.until = world.tick + seconds(0.7);
      return;
    }
    case 'wait':
      scene.until = world.tick + seconds(beat.s);
      return;
    case 'flash': {
      const c = who(beat.who);
      if (c) cues.push({ type: 'flash', x: c.pos.x, y: c.pos.y - 8 });
      scene.until = world.tick + seconds(0.8);
      return;
    }
    case 'chase': {
      scene.chase = { who: scene.cast[beat.who], after: scene.cast[beat.after] };
      scene.until = world.tick + seconds(beat.s);
      return;
    }
    case 'prop': {
      const p = pointFor(beat.at) ?? who(beat.at)?.pos ?? LOCATIONS.square.centre;
      world.props.push({ art: beat.art, x: p.x, y: p.y + 6 });
      cues.push({ type: 'puff', x: p.x, y: p.y + 6 });
      scene.until = world.tick + seconds(0.6);
      return;
    }
    case 'clearProps':
      world.props = [];
      return;
    case 'faint': {
      const c = who(beat.who);
      if (c) {
        c.faintUntil = world.tick + seconds(5);
        cues.push({ type: 'emote', id: c.id, kind: 'star' });
      }
      scene.until = world.tick + seconds(1);
      return;
    }
  }
}

/** Advance whichever scene is playing. Citizens only walk, speak and wait here. */
export function stepScene(world: World, cues: Cue[]) {
  if (!world.scene && world.queue.length) {
    const nextUp = world.queue.shift()!;
    startScene(world, nextUp.key, nextUp.cast);
  }
  const scene = world.scene;
  if (!scene) return;

  if (world.tick - scene.started > seconds(MAX_SCENE_S)) {
    finishScene(world, cues);
    return;
  }

  // If the Hand has made off with a performer, the rest of the cast stare at the sky.
  const stolen = Object.values(scene.cast).find((id) => world.citizens[id]?.lifted);
  if (stolen) {
    if (world.tick % seconds(3) === 0) {
      const others = Object.values(scene.cast).filter((id) => id !== stolen && world.citizens[id]);
      if (others.length) cues.push({ type: 'emote', id: pick(world, others), kind: 'question' });
    }
    return;
  }

  if (scene.chase) {
    const hunter = world.citizens[scene.chase.who];
    const prey = world.citizens[scene.chase.after];
    if (hunter && prey) {
      if (!prey.path.length) {
        const spots = Object.values(LOCATIONS).flatMap((l) => l.spots);
        const s = pick(world, spots);
        prey.path = findPath(prey.pos, { x: s.x + range(world, -4, 4), y: s.y });
      }
      if (world.tick % seconds(1) === 0 || !hunter.path.length) hunter.path = findPath(hunter.pos, prey.pos);
    }
  }

  scene.walking = scene.walking.filter((id) => world.citizens[id].path.length > 0);
  if (scene.walking.length || world.tick < scene.until) return;
  if (scene.chase) {
    const prey = world.citizens[scene.chase.after];
    const hunter = world.citizens[scene.chase.who];
    if (prey) prey.path = [];
    if (hunter) hunter.path = [];
    scene.chase = undefined;
  }

  const beats = sceneOf(scene.key).beats;
  if (scene.beat >= beats.length) {
    finishScene(world, cues);
    return;
  }
  const beat = beats[scene.beat++];
  runBeat(world, beat, cues);
}
