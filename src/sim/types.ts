import type { LocationId, Pt } from '../narrative/content/map';

export type Facing = 'front' | 'back' | 'side';

export type EmoteKind = 'love' | 'anger' | 'question' | 'exclaim' | 'sleep' | 'note' | 'talk' | 'sweat' | 'star';

export interface Clock {
  day: number;
  /** Minute of the fictional day, 0–1440. */
  minute: number;
}

export type Weather = 'clear' | 'cloudy' | 'rain' | 'fog';

export interface Deed {
  day: number;
  text: string;
}

export interface Plan {
  /** A location the citizen has chosen, or null when loitering nowhere in particular. */
  at: LocationId | 'home' | null;
  doing: string;
  thought: string;
  mode: SlotMode;
}

export type SlotMode = 'idle' | 'pace' | 'patrol' | 'fixed' | 'inside' | 'lamps' | 'scurry';

export interface CitizenState {
  id: string;
  pos: Pt;
  path: Pt[];
  facing: Facing;
  /** True when a side-facing citizen looks left. */
  flip: boolean;
  plan: Plan;
  /** Tick at which the citizen next reconsiders what to do. */
  until: number;
  /** Which schedule slot this plan was made for; a new slot interrupts idling. */
  slot: number;
  inside: boolean;
  lifted: boolean;
  /** Tick until which the citizen lies flat after a shock. */
  faintUntil: number;
  /** Tick until which the citizen stays in conversation. */
  chatUntil: number;
  mood: number;
  liftCount: number;
  deeds: Deed[];
  /** Waypoint index for patrols and lamp rounds. */
  route: number;
}

export interface World {
  version: 1;
  seed: number;
  rng: number;
  tick: number;
  clock: Clock;
  weather: Weather;
  weatherUntil: number;
  citizens: Record<string, CitizenState>;
  /** Pairwise feeling, keyed "a|b" with ids sorted; missing means 0. */
  relations: Record<string, number>;
  lamps: boolean[];
}

/**
 * Things the renderer should show that have no lasting state of their own.
 * The simulation pushes these and forgets them, so they stay out of saves.
 */
export type Cue =
  | { type: 'emote'; id: string; kind: EmoteKind }
  | { type: 'say'; id: string; text: string; ms: number }
  | { type: 'puff'; x: number; y: number }
  | { type: 'flash'; x: number; y: number }
  | { type: 'lamp'; index: number; lit: boolean };

export type Command =
  | { type: 'lift'; id: string }
  | { type: 'carry'; id: string; x: number; y: number }
  | { type: 'drop'; id: string; x: number; y: number };
