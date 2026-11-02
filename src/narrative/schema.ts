import { z } from 'zod';

/**
 * The narrative vocabulary. Everything the story can ask of the world is one of
 * these shapes, validated here. Hand-written content uses them today; a future
 * language model would have to produce the same shapes and pass the same checks.
 */

const Weather = z.enum(['clear', 'cloudy', 'rain', 'fog']);
const Emote = z.enum(['love', 'anger', 'question', 'exclaim', 'sleep', 'note', 'talk', 'sweat', 'star']);
const FlagValue = z.union([z.boolean(), z.number(), z.string()]);

export type Cond =
  | { flag: string; is?: boolean | number | string }
  | { not: Cond }
  | { all: Cond[] }
  | { any: Cond[] }
  | { arc: string; stage?: string; status?: 'active' | 'done' | 'none'; outcome?: string }
  | { dayAtLeast: number }
  | { hour: [number, number] }
  | { weather: 'clear' | 'cloudy' | 'rain' | 'fog' }
  | { law: string }
  | { office: string; holder: string }
  | { rel: [string, string]; atLeast?: number; atMost?: number }
  | { fact: string }
  | { lifted: number }
  | { sinceArc: string; days: number };

export const CondSchema: z.ZodType<Cond> = z.lazy(() =>
  z.union([
    z.strictObject({ flag: z.string(), is: FlagValue.optional() }),
    z.strictObject({ not: CondSchema }),
    z.strictObject({ all: z.array(CondSchema) }),
    z.strictObject({ any: z.array(CondSchema) }),
    z.strictObject({
      arc: z.string(),
      stage: z.string().optional(),
      status: z.enum(['active', 'done', 'none']).optional(),
      outcome: z.string().optional(),
    }),
    z.strictObject({ dayAtLeast: z.number() }),
    z.strictObject({ hour: z.tuple([z.number(), z.number()]) }),
    z.strictObject({ weather: Weather }),
    z.strictObject({ law: z.string() }),
    z.strictObject({ office: z.string(), holder: z.string() }),
    z.strictObject({ rel: z.tuple([z.string(), z.string()]), atLeast: z.number().optional(), atMost: z.number().optional() }),
    z.strictObject({ fact: z.string() }),
    z.strictObject({ lifted: z.number() }),
    z.strictObject({ sinceArc: z.string(), days: z.number() }),
  ]),
);

export const EffectSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('setFlag'), flag: z.string(), value: FlagValue.optional() }),
  z.strictObject({ type: z.literal('relationship'), a: z.string(), b: z.string(), delta: z.number(), reason: z.string().optional() }),
  z.strictObject({ type: z.literal('appoint'), office: z.string(), citizen: z.string() }),
  z.strictObject({ type: z.literal('hat'), citizen: z.string(), hat: z.string().nullable() }),
  z.strictObject({ type: z.literal('epithet'), citizen: z.string(), text: z.string() }),
  z.strictObject({ type: z.literal('deed'), citizen: z.string(), text: z.string() }),
  z.strictObject({ type: z.literal('mood'), citizen: z.string(), delta: z.number() }),
  z.strictObject({ type: z.literal('landmark'), id: z.string(), size: z.number().optional() }),
  z.strictObject({ type: z.literal('removeLandmark'), id: z.string() }),
  z.strictObject({ type: z.literal('enactLaw'), id: z.string() }),
  z.strictObject({ type: z.literal('repealLaw'), id: z.string() }),
  z.strictObject({ type: z.literal('startArc'), id: z.string(), stage: z.string() }),
  z.strictObject({ type: z.literal('advanceArc'), id: z.string(), stage: z.string() }),
  z.strictObject({ type: z.literal('endArc'), id: z.string(), outcome: z.string() }),
  z.strictObject({ type: z.literal('chronicle'), text: z.string(), salience: z.number().min(1).max(3), kind: z.string().optional() }),
  z.strictObject({ type: z.literal('fact'), key: z.string(), text: z.string() }),
  z.strictObject({ type: z.literal('era'), name: z.string() }),
  z.strictObject({ type: z.literal('weather'), weather: Weather, hours: z.number() }),
  z.strictObject({ type: z.literal('arrive'), citizen: z.string() }),
  z.strictObject({ type: z.literal('depart'), citizen: z.string() }),
  z.strictObject({ type: z.literal('holiday'), name: z.string(), days: z.number() }),
]);
export type Effect = z.infer<typeof EffectSchema>;

export const BeatSchema = z.discriminatedUnion('do', [
  z.strictObject({ do: z.literal('go'), who: z.string(), to: z.string() }),
  z.strictObject({ do: z.literal('gather'), who: z.array(z.string()), at: z.string() }),
  z.strictObject({ do: z.literal('say'), who: z.string(), text: z.string() }),
  z.strictObject({ do: z.literal('emote'), who: z.string(), kind: Emote }),
  z.strictObject({ do: z.literal('wait'), s: z.number() }),
  z.strictObject({ do: z.literal('flash'), who: z.string() }),
  z.strictObject({ do: z.literal('chase'), who: z.string(), after: z.string(), s: z.number() }),
  z.strictObject({ do: z.literal('prop'), art: z.string(), at: z.string() }),
  z.strictObject({ do: z.literal('clearProps') }),
  z.strictObject({ do: z.literal('faint'), who: z.string() }),
]);
export type Beat = z.infer<typeof BeatSchema>;

const CastSpec = z.union([
  z.string(),
  z.strictObject({ any: z.literal(true), trait: z.string().optional(), not: z.array(z.string()).optional() }),
]);
export type CastSpec = z.infer<typeof CastSpec>;

const DispatchSchema = z.strictObject({ title: z.string(), text: z.string() });

const ChoiceSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  /** What Mabel reads out when she gets there. */
  herald: z.string(),
  beats: z.array(BeatSchema),
  effects: z.array(EffectSchema),
  dispatch: DispatchSchema,
});
export type Choice = z.infer<typeof ChoiceSchema>;

export const EventSchema = z.strictObject({
  id: z.string(),
  kind: z.enum(['ambient', 'incident', 'arc']),
  weight: z.number(),
  tags: z.array(z.string()),
  when: CondSchema.optional(),
  cast: z.record(z.string(), CastSpec),
  /** Where the event happens, for the "Show me" link and the Jester's attendance. */
  at: z.string().optional(),
  once: z.boolean().optional(),
  cooldownDays: z.number().optional(),
  /** Marks an event that exists to remember something, which the Director favours. */
  callback: z.boolean().optional(),
  beats: z.array(BeatSchema),
  effects: z.array(EffectSchema),
  dispatch: DispatchSchema.optional(),
  /** Told in the recap if this happens while nobody is watching. */
  offstage: z.string().optional(),
  decision: z
    .strictObject({
      patienceDays: z.number(),
      choices: z.array(ChoiceSchema).min(2),
      ignored: z.strictObject({ beats: z.array(BeatSchema), effects: z.array(EffectSchema), dispatch: DispatchSchema }),
    })
    .optional(),
});
export type EventDef = z.infer<typeof EventSchema>;

export const ArcSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  /** One line per stage, for Affairs of State. */
  stages: z.record(z.string(), z.string()),
  outcomes: z.record(z.string(), z.string()),
  /** Fictional days to wait between stages. */
  gapDays: z.number(),
});
export type ArcDef = z.infer<typeof ArcSchema>;

export const DecreeSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  blurb: z.string(),
  /** A choice the user makes before signing. */
  option: z.enum(['weather', 'appointment']).optional(),
  herald: z.string(),
  beats: z.array(BeatSchema),
  effects: z.array(EffectSchema),
  dispatch: DispatchSchema,
});
export type DecreeDef = z.infer<typeof DecreeSchema>;

export const JesterLineSchema = z.strictObject({
  text: z.string(),
  mood: z.enum(['smug', 'delight', 'shock', 'scheme', 'bored', 'solemn']),
  when: CondSchema.optional(),
});
export type JesterLine = z.infer<typeof JesterLineSchema>;

export const LandmarkSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  plaque: z.string(),
  art: z.string(),
  /** Which plot it prefers, as an index into PLOTS. */
  plot: z.number().optional(),
});
export type LandmarkDef = z.infer<typeof LandmarkSchema>;

// Beat and effect builders keep content files readable.
export const say = (who: string, text: string): Beat => ({ do: 'say', who, text });
export const go = (who: string, to: string): Beat => ({ do: 'go', who, to });
export const gather = (who: string[], at: string): Beat => ({ do: 'gather', who, at });
export const emote = (who: string, kind: Extract<Beat, { do: 'emote' }>['kind']): Beat => ({ do: 'emote', who, kind });
export const wait = (s: number): Beat => ({ do: 'wait', s });
export const flash = (who: string): Beat => ({ do: 'flash', who });
export const chase = (who: string, after: string, s: number): Beat => ({ do: 'chase', who, after, s });
export const prop = (art: string, at: string): Beat => ({ do: 'prop', art, at });
export const clearProps = (): Beat => ({ do: 'clearProps' });
export const faint = (who: string): Beat => ({ do: 'faint', who });

export const fx = {
  flag: (flag: string, value?: boolean | number | string): Effect => ({ type: 'setFlag', flag, value }),
  rel: (a: string, b: string, delta: number, reason?: string): Effect => ({ type: 'relationship', a, b, delta, reason }),
  appoint: (office: string, citizen: string): Effect => ({ type: 'appoint', office, citizen }),
  hat: (citizen: string, hat: string | null): Effect => ({ type: 'hat', citizen, hat }),
  epithet: (citizen: string, text: string): Effect => ({ type: 'epithet', citizen, text }),
  deed: (citizen: string, text: string): Effect => ({ type: 'deed', citizen, text }),
  mood: (citizen: string, delta: number): Effect => ({ type: 'mood', citizen, delta }),
  landmark: (id: string, size?: number): Effect => ({ type: 'landmark', id, size }),
  unlandmark: (id: string): Effect => ({ type: 'removeLandmark', id }),
  law: (id: string): Effect => ({ type: 'enactLaw', id }),
  repeal: (id: string): Effect => ({ type: 'repealLaw', id }),
  startArc: (id: string, stage: string): Effect => ({ type: 'startArc', id, stage }),
  arc: (id: string, stage: string): Effect => ({ type: 'advanceArc', id, stage }),
  endArc: (id: string, outcome: string): Effect => ({ type: 'endArc', id, outcome }),
  chronicle: (text: string, salience = 2, kind?: string): Effect => ({ type: 'chronicle', text, salience, kind }),
  fact: (key: string, text: string): Effect => ({ type: 'fact', key, text }),
  era: (name: string): Effect => ({ type: 'era', name }),
  weather: (weather: 'clear' | 'cloudy' | 'rain' | 'fog', hours: number): Effect => ({ type: 'weather', weather, hours }),
  arrive: (citizen: string): Effect => ({ type: 'arrive', citizen }),
  depart: (citizen: string): Effect => ({ type: 'depart', citizen }),
  holiday: (name: string, days: number): Effect => ({ type: 'holiday', name, days }),
};
