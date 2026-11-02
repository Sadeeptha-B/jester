import { CITIZEN_BY_ID } from '../narrative/content/citizens';
import { stepCitizens } from './behaviours';
import { advance, MINUTES_PER_TICK, seconds, TICK_S } from './clock';
import { nearestWalkable } from './nav';
import { chance, pick, range } from './rng';
import type { Command, Cue, Weather, World } from './types';

const MAX_DEEDS = 12;

function changeWeather(world: World) {
  if (world.tick < world.weatherUntil) return;
  const next: Weather = pick(world, ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'rain', 'fog'] as const);
  world.weather = next;
  world.weatherUntil = world.tick + seconds(range(world, 120, 420));
}

function applyCommand(world: World, cmd: Command, cues: Cue[]) {
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
      c.deeds.unshift({
        day: world.clock.day,
        text: c.liftCount === 1 ? 'Was lifted by an unseen force.' : `Was lifted by the unseen force again (${c.liftCount} times now).`,
      });
      c.deeds.length = Math.min(c.deeds.length, MAX_DEEDS);
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

  /** Fraction of a tick elapsed, for render interpolation. */
  get alpha(): number {
    return this.carry / TICK_S;
  }

  tick() {
    const { world } = this;
    world.tick += 1;
    for (const cmd of this.commands) applyCommand(world, cmd, this.cues);
    this.commands.length = 0;
    advance(world.clock, MINUTES_PER_TICK);
    changeWeather(world);
    stepCitizens(world, this.cues);
  }

  takeCues(): Cue[] {
    const out = this.cues;
    this.cues = [];
    return out;
  }
}
