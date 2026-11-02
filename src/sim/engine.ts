import { CITIZEN_BY_ID, OFFICE_NAMES } from '../narrative/content/citizens';
import { DECREE_BY_ID, EVENT_BY_ID } from '../narrative/registry';
import { stepCitizens } from './behaviours';
import { advance, MINUTES_PER_TICK, seconds, TICK_S } from './clock';
import { stepDirector } from './director';
import { addDeed } from './effects';
import { nearestWalkable } from './nav';
import { chance, pick, range } from './rng';
import { inventRumour, stepRumours } from './rumours';
import { postDispatch, stepScene } from './scenes';
import { render } from './text';
import type { Command, Cue, Weather, World } from './types';

function changeWeather(world: World) {
  if (world.tick < world.weatherUntil) return;
  const next: Weather = pick(world, ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'rain', 'fog'] as const);
  world.weather = next;
  world.weatherUntil = world.tick + seconds(range(world, 120, 420));
}

function lapseDecisions(world: World) {
  const p = world.pending;
  if (!p || world.clock.day <= p.deadline || world.scene) return;
  world.pending = null;
  world.queue.push({ key: `ignored:${p.event}`, cast: p.cast });
}

function applyCommand(world: World, cmd: Command, cues: Cue[]) {
  switch (cmd.type) {
    case 'decide': {
      const p = world.pending;
      if (!p) return;
      const e = EVENT_BY_ID[p.event];
      if (!e.decision!.choices.some((c) => c.id === cmd.choice)) return;
      world.pending = null;
      world.queue.push({ key: `choice:${p.event}:${cmd.choice}`, cast: p.cast });
      postDispatch(world, 'By Your Hand', render(world, 'The scroll is sealed. Mabel is [[on her way|already late|warming up her remaining voice]].'), 'smug');
      return;
    }
    case 'decree': {
      const d = DECREE_BY_ID[cmd.id];
      // One scroll at a time; an ordinary scene just has to finish first.
      if (!d || world.queue.length || /^(choice|decree)/.test(world.scene?.key ?? '')) return;
      if (d.option === 'appointment' && (!cmd.office || !OFFICE_NAMES[cmd.office] || !CITIZEN_BY_ID[cmd.citizen ?? ''])) return;
      const cast: Record<string, string> = {};
      if (cmd.office) cast.office = cmd.office;
      if (cmd.citizen) cast.subject = cmd.citizen;
      if (cmd.weather) cast.weatherKind = cmd.weather;
      world.queue.push({ key: `decree:${d.id}`, cast });
      if (cmd.weather) {
        world.weather = cmd.weather;
        world.weatherUntil = world.tick + seconds(240);
      }
      return;
    }
    case 'trouble': {
      const d = world.director;
      if (d.troubleDay === world.clock.day) return;
      d.troubleDay = world.clock.day;
      d.nextIncident = world.tick;
      return;
    }
    case 'react': {
      const c = world.citizens[cmd.id];
      if (!c || c.inside || c.absent) return;
      if (cmd.how === 'applaud') {
        c.mood = Math.min(5, c.mood + 1);
        cues.push({ type: 'emote', id: c.id, kind: 'love' });
        addDeed(world, c, 'Received applause from nowhere.');
      } else if (cmd.how === 'tomato') {
        c.mood = Math.max(-5, c.mood - 1);
        cues.push({ type: 'tomato', id: c.id }, { type: 'emote', id: c.id, kind: 'anger' });
        addDeed(world, c, 'Was struck by a tomato of unknown origin.');
      } else {
        inventRumour(world, c);
        cues.push({ type: 'emote', id: c.id, kind: 'exclaim' });
      }
      return;
    }
  }

  const c = world.citizens[cmd.id];
  if (!c) return;
  const def = CITIZEN_BY_ID[cmd.id];
  switch (cmd.type) {
    case 'lift':
      c.lifted = true;
      c.path = [];
      c.chatUntil = 0;
      c.faintUntil = 0;
      break;
    case 'carry':
      if (c.lifted) {
        c.pos.x = cmd.x;
        c.pos.y = cmd.y;
      }
      break;
    case 'drop': {
      if (!c.lifted) return;
      c.lifted = false;
      c.pos = nearestWalkable(cmd.x, cmd.y);
      c.facing = 'front';
      c.liftCount += 1;
      addDeed(world, c, c.liftCount === 1 ? 'Was lifted by an unseen force.' : `Was lifted by the unseen force again (${c.liftCount} times now).`);
      // Re-plan from wherever they landed once they've recovered.
      c.slot = -1;
      c.until = 0;
      cues.push({ type: 'puff', x: c.pos.x, y: c.pos.y });
      cues.push({ type: 'say', id: c.id, text: pick(world, def.onLifted), ms: 3800 });
      if (def.faints) {
        c.faintUntil = world.tick + seconds(6);
        cues.push({ type: 'emote', id: c.id, kind: 'star' });
      } else if (chance(world, 0.5)) {
        cues.push({ type: 'emote', id: c.id, kind: 'exclaim' });
      }
      break;
    }
  }
}

/**
 * The simulation. It owns the world and nothing else: no DOM, no timers, no
 * renderer. Feed it real seconds, or call `tick` directly from a test.
 */
export class Engine {
  private carry = 0;
  private commands: Command[] = [];
  /** Cues since the presentation last collected them. */
  cues: Cue[] = [];

  constructor(public world: World) {}

  send(cmd: Command) {
    this.commands.push(cmd);
  }

  /** Run however many whole ticks fit in `dt`, capped so a stall can't spiral. */
  update(dt: number): number {
    this.carry = Math.min(this.carry + dt, TICK_S * 25);
    let ran = 0;
    while (this.carry >= TICK_S) {
      this.carry -= TICK_S;
      this.tick();
      ran++;
    }
    return ran;
  }

  tick() {
    const { world } = this;
    world.tick += 1;
    for (const cmd of this.commands) applyCommand(world, cmd, this.cues);
    this.commands.length = 0;
    const newDay = advance(world.clock, MINUTES_PER_TICK);
    if (newDay && world.holiday && world.clock.day >= world.holiday.until) world.holiday = null;
    changeWeather(world);
    lapseDecisions(world);
    world.flags.pending_note = Boolean(world.pending);
    stepRumours(world);
    stepScene(world, this.cues);
    stepCitizens(world, this.cues);
    stepDirector(world, this.cues);
  }

  takeCues(): Cue[] {
    const out = this.cues;
    this.cues = [];
    return out;
  }
}
