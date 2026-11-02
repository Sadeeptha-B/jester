import { AMBIENT } from './content/ambient';
import { AFTERMATH_EVENTS, ARC_DEFS, ARC_EVENTS } from './content/arcs';
import { DECREES } from './content/decrees';
import { DEVELOPMENTS, INCIDENTS } from './content/incidents';
import type { EventDef } from './schema';

export const EVENTS: EventDef[] = [...AMBIENT, ...INCIDENTS, ...DEVELOPMENTS, ...ARC_EVENTS, ...AFTERMATH_EVENTS];
export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
export const DECREE_BY_ID = Object.fromEntries(DECREES.map((d) => [d.id, d]));
export const ARCS = ARC_DEFS;
export const ARC_BY_ID = Object.fromEntries(ARC_DEFS.map((a) => [a.id, a]));

/** The first session, curated: seconds since the very first curtain. */
export const OPENING_ACT: { at: number; event: string }[] = [
  { at: 18, event: 'chicken_chase' },
  { at: 80, event: 'hat_insult' },
  { at: 150, event: 'gerald_coup' },
];
