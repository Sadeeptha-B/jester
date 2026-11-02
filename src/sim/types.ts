import type { LocationId, Pt } from '../narrative/content/map';

export type Facing = 'front' | 'back' | 'side';

export type EmoteKind = 'love' | 'anger' | 'question' | 'exclaim' | 'sleep' | 'note' | 'talk' | 'sweat' | 'star';

export type Mood = 'smug' | 'delight' | 'shock' | 'scheme' | 'bored' | 'solemn';

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
  /** Written out of the story for now: Tuesday before arrival, a visitor after leaving. */
  absent: boolean;
  /** Held by a scene: schedules wait until it releases them. */
  staged: boolean;
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
  /** A hat awarded by events, overriding the one they started with. */
  hat: string | null | undefined;
  epithets: string[];
  /** The rumour this citizen currently believes, if any. */
  belief: number | null;
}

export interface Grudge {
  value: number;
  reason?: string;
}

export interface ChronicleEntry {
  day: number;
  text: string;
  kind: string;
  salience: number;
}

export interface Era {
  name: string;
  fromDay: number;
}

export interface Fact {
  key: string;
  day: number;
  text: string;
}

export interface Landmark {
  id: string;
  plot: number;
  day: number;
  size?: number;
}

export interface ArcState {
  stage: string;
  status: 'active' | 'done';
  outcome?: string;
  startedDay: number;
  lastDay: number;
}

export interface Pending {
  event: string;
  cast: Record<string, string>;
  day: number;
  deadline: number;
  /** The question itself, which stays put while newer dispatches come and go. */
  title: string;
  text: string;
  at?: Pt;
}

export interface Dispatch {
  id: number;
  day: number;
  title: string;
  text: string;
  mood: Mood;
  /** Set when this dispatch is asking for a decision. */
  event?: string;
  at?: Pt;
}

export interface Prop {
  art: string;
  x: number;
  y: number;
}

export interface SceneState {
  /** See `sceneOf`: names the beats and the effects that end them. */
  key: string;
  cast: Record<string, string>;
  beat: number;
  until: number;
  started: number;
  /** A beat is in progress and is waiting for walkers to arrive. */
  walking: string[];
  /** Citizens being chased, and who by: a little loop run alongside the beat. */
  chase?: { who: string; after: string };
}

export interface Rumour {
  id: number;
  subject: string;
  verb: string;
  object: string;
  day: number;
  /** How many times it has been passed on. */
  told: number;
}

export interface Director {
  nextAmbient: number;
  nextIncident: number;
  nextDecision: number;
  nextQuip: number;
  /** Most recent first. */
  recent: string[];
  lastLead: string | null;
  lastSeen: Record<string, number>;
  opening: number;
  quips: number[];
  troubleDay: number;
}

export type Pacing = 'quiet' | 'balanced' | 'chaotic';

export interface Settings {
  pacing: Pacing;
  sound: boolean;
  motion: 'full' | 'calm';
}

export interface Recap {
  days: number;
  lines: string[];
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
  relations: Record<string, Grudge>;
  lamps: boolean[];

  flags: Record<string, boolean | number | string>;
  offices: Record<string, string>;
  laws: string[];
  landmarks: Landmark[];
  arcs: Record<string, ArcState>;
  facts: Fact[];
  chronicle: ChronicleEntry[];
  eras: Era[];
  rumours: Rumour[];
  nextId: number;

  scene: SceneState | null;
  /** Scenes waiting to start, oldest first. */
  queue: { key: string; cast: Record<string, string> }[];
  props: Prop[];
  pending: Pending | null;
  dispatch: Dispatch | null;
  holiday: { name: string; until: number } | null;
  director: Director;
  settings: Settings;
  recap: Recap | null;
  /** Real-world milliseconds when last saved; drives offline progression. */
  savedAt: number;
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
  | { type: 'lamp'; index: number; lit: boolean }
  | { type: 'tomato'; id: string }
  | { type: 'quip'; text: string; mood: Mood }
  | { type: 'saved' };

export type Command =
  | { type: 'lift'; id: string }
  | { type: 'carry'; id: string; x: number; y: number }
  | { type: 'drop'; id: string; x: number; y: number }
  | { type: 'decide'; choice: string }
  | { type: 'decree'; id: string; office?: string; citizen?: string; weather?: Weather }
  | { type: 'react'; id: string; how: 'applaud' | 'tomato' | 'rumour' }
  | { type: 'trouble' };
