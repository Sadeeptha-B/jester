import { CITIZENS } from '../narrative/content/citizens';
import { EVENT_BY_ID } from '../narrative/registry';
import { LAMPS } from '../narrative/content/map';
import { chooseEvent, markSeen } from './director';
import { applyEffects } from './effects';
import { postDispatch } from './scenes';
import { finishScene } from './scenes';
import { render } from './text';
import { seconds } from './clock';
import type { World } from './types';

export const SILENT_MS = 5 * 60 * 1000;
const MS_PER_DAY = 60 * 60 * 1000;
const MAX_DAYS = 7;
const MAX_EVENTS = 6;

/** The ignored outcome of a decision that has run out of patience, told rather than shown. */
function lapseDecision(world: World, lines: string[]) {
  const p = world.pending;
  if (!p || world.clock.day <= p.deadline) return;
  const e = EVENT_BY_ID[p.event];
  const ignored = e.decision!.ignored;
  applyEffects(world, ignored.effects, p.cast);
  lines.push(render(world, ignored.dispatch.text, p.cast));
  postDispatch(world, render(world, ignored.dispatch.title, p.cast), render(world, ignored.dispatch.text, p.cast), 'scheme');
  world.pending = null;
}

/**
 * Time passed while nobody was looking. The kingdom keeps a lazy calendar then:
 * an hour away is one fictional day, up to a week, with a bounded number of
 * meaningful events. It runs from the saved seed and the elapsed time alone, so
 * the same absence always produces the same history.
 */
export function catchUp(world: World, elapsedMs: number) {
  if (world.scene) finishScene(world);
  for (const q of world.queue.splice(0)) {
    world.scene = { key: q.key, cast: q.cast, beat: 0, until: 0, started: world.tick, walking: [] };
    finishScene(world);
  }
  for (const c of Object.values(world.citizens)) {
    c.lifted = false;
    c.staged = false;
    c.faintUntil = 0;
    c.chatUntil = 0;
    c.path = [];
    c.slot = -1;
    c.until = 0;
  }

  // Short absences just nudge the clock along.
  const minutes = (elapsedMs / 1000) * (1440 / 900);
  if (elapsedMs < SILENT_MS) {
    world.clock.minute += minutes;
    while (world.clock.minute >= 1440) {
      world.clock.minute -= 1440;
      world.clock.day += 1;
    }
    return;
  }

  const days = Math.min(MAX_DAYS, Math.max(1, Math.floor(elapsedMs / MS_PER_DAY)));
  const lines: string[] = [];
  const eventCount = Math.min(MAX_EVENTS, Math.ceil(days * 1.2));
  const startDay = world.clock.day;

  for (let i = 0; i < eventCount; i++) {
    world.clock.day = startDay + Math.round(((i + 1) / eventCount) * days);
    lapseDecision(world, lines);
    const pick = chooseEvent(world, ['arc', 'incident', 'ambient'], 'no', true);
    if (!pick) continue;
    markSeen(world, pick.e, pick.cast);
    applyEffects(world, pick.e.effects, pick.cast);
    lines.push(render(world, pick.e.offstage!, pick.cast));
  }
  world.clock.day = startDay + days;
  lapseDecision(world, lines);

  // Morning on the day of return, with everyone where they ought to be.
  world.clock.minute = 8 * 60;
  world.weatherUntil = 0;
  world.lamps = LAMPS.map(() => false);
  for (const def of CITIZENS) {
    const c = world.citizens[def.id];
    if (!c.absent) {
      c.inside = true;
      c.pos = { ...def.door };
    }
  }
  const d = world.director;
  d.nextAmbient = world.tick + seconds(30);
  d.nextIncident = Math.max(d.nextIncident, world.tick + seconds(120));
  d.nextDecision = Math.max(d.nextDecision, world.tick + seconds(300));

  world.recap = { days, lines: lines.slice(0, 5) };
}
