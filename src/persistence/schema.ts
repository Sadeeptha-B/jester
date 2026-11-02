import { z } from 'zod';
import type { World } from '../sim/types';

const Pt = z.object({ x: z.number(), y: z.number() });

const Citizen = z.object({
  id: z.string(),
  pos: Pt,
  path: z.array(Pt),
  facing: z.enum(['front', 'back', 'side']),
  flip: z.boolean(),
  plan: z.object({ at: z.string().nullable(), doing: z.string(), thought: z.string(), mode: z.string() }),
  until: z.number(),
  slot: z.number(),
  inside: z.boolean(),
  absent: z.boolean(),
  staged: z.boolean(),
  lifted: z.boolean(),
  faintUntil: z.number(),
  chatUntil: z.number(),
  mood: z.number(),
  liftCount: z.number(),
  deeds: z.array(z.object({ day: z.number(), text: z.string() })),
  route: z.number(),
  hat: z.string().nullable().optional(),
  epithets: z.array(z.string()),
  belief: z.number().nullable(),
});

const Dispatch = z.object({
  id: z.number(),
  day: z.number(),
  title: z.string(),
  text: z.string(),
  mood: z.string(),
  event: z.string().optional(),
  at: Pt.optional(),
});

/** Checks the shape of a save. Unknown extra fields survive, so a newer save is not destroyed. */
export const WorldSchema = z.looseObject({
  version: z.number(),
  seed: z.number(),
  rng: z.number(),
  tick: z.number(),
  clock: z.object({ day: z.number().int().min(1), minute: z.number().min(0).max(1440) }),
  weather: z.enum(['clear', 'cloudy', 'rain', 'fog']),
  weatherUntil: z.number(),
  citizens: z.record(z.string(), Citizen),
  relations: z.record(z.string(), z.object({ value: z.number(), reason: z.string().optional() })),
  lamps: z.array(z.boolean()),
  flags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])),
  offices: z.record(z.string(), z.string()),
  laws: z.array(z.string()),
  landmarks: z.array(z.object({ id: z.string(), plot: z.number(), day: z.number(), size: z.number().optional() })),
  arcs: z.record(
    z.string(),
    z.object({ stage: z.string(), status: z.enum(['active', 'done']), outcome: z.string().optional(), startedDay: z.number(), lastDay: z.number() }),
  ),
  facts: z.array(z.object({ key: z.string(), day: z.number(), text: z.string() })),
  chronicle: z.array(z.object({ day: z.number(), text: z.string(), kind: z.string(), salience: z.number() })),
  eras: z.array(z.object({ name: z.string(), fromDay: z.number() })).min(1),
  rumours: z.array(z.object({ id: z.number(), subject: z.string(), verb: z.string(), object: z.string(), day: z.number(), told: z.number() })),
  nextId: z.number(),
  scene: z.looseObject({ key: z.string(), cast: z.record(z.string(), z.string()), beat: z.number() }).nullable(),
  queue: z.array(z.object({ key: z.string(), cast: z.record(z.string(), z.string()) })),
  props: z.array(z.object({ art: z.string(), x: z.number(), y: z.number() })),
  pending: z
    .object({ event: z.string(), cast: z.record(z.string(), z.string()), day: z.number(), deadline: z.number(), title: z.string(), text: z.string(), at: Pt.optional() })
    .nullable(),
  dispatch: Dispatch.nullable(),
  holiday: z.object({ name: z.string(), until: z.number() }).nullable(),
  director: z.looseObject({ recent: z.array(z.string()), lastSeen: z.record(z.string(), z.number()) }),
  settings: z.object({ pacing: z.enum(['quiet', 'balanced', 'chaotic']), sound: z.boolean(), motion: z.enum(['full', 'calm']) }),
  recap: z.object({ days: z.number(), lines: z.array(z.string()) }).nullable(),
  savedAt: z.number(),
});

/** Validates, then returns the save untouched, so key order and unknown fields stay exactly as stored. */
export function parseWorld(value: unknown): World {
  WorldSchema.parse(value);
  return value as World;
}
