import type { Cond } from '../narrative/schema';
import { hourOf } from './clock';
import type { World } from './types';
import { relation } from './world';

/** Does the world currently satisfy this condition? `cast` resolves `$role` references. */
export function holds(world: World, cond: Cond | undefined, cast: Record<string, string> = {}): boolean {
  if (!cond) return true;
  const ref = (id: string) => (id.startsWith('$') ? (cast[id.slice(1)] ?? id) : id);
  if ('flag' in cond) {
    const v = world.flags[cond.flag];
    return cond.is === undefined ? Boolean(v) : v === cond.is;
  }
  if ('not' in cond) return !holds(world, cond.not, cast);
  if ('all' in cond) return cond.all.every((c) => holds(world, c, cast));
  if ('any' in cond) return cond.any.some((c) => holds(world, c, cast));
  if ('arc' in cond) {
    const arc = world.arcs[cond.arc];
    const status = arc?.status ?? 'none';
    if (cond.status && cond.status !== status) return false;
    if (!cond.status && !arc) return false;
    if (cond.stage && arc?.stage !== cond.stage) return false;
    if (cond.outcome && arc?.outcome !== cond.outcome) return false;
    return true;
  }
  if ('dayAtLeast' in cond) return world.clock.day >= cond.dayAtLeast;
  if ('hour' in cond) {
    const h = hourOf(world.clock);
    const [a, b] = cond.hour;
    return a <= b ? h >= a && h < b : h >= a || h < b;
  }
  if ('weather' in cond) return world.weather === cond.weather;
  if ('law' in cond) return world.laws.includes(cond.law);
  if ('office' in cond) return world.offices[cond.office] === ref(cond.holder);
  if ('rel' in cond) {
    const v = relation(world, ref(cond.rel[0]), ref(cond.rel[1]));
    return (cond.atLeast === undefined || v >= cond.atLeast) && (cond.atMost === undefined || v <= cond.atMost);
  }
  if ('fact' in cond) return world.facts.some((f) => f.key === cond.fact);
  if ('lifted' in cond) return Object.values(world.citizens).reduce((n, c) => n + c.liftCount, 0) >= cond.lifted;
  if ('sinceArc' in cond) {
    const arc = world.arcs[cond.sinceArc];
    return !arc || world.clock.day - arc.lastDay >= cond.days;
  }
  return false;
}
