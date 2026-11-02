import { describe, expect, it } from 'vitest';
import { CITIZEN_BY_ID, CITIZENS, OFFICE_NAMES } from '../../src/narrative/content/citizens';
import { JESTER_LINES, JESTER_ON } from '../../src/narrative/content/jester';
import { LANDMARK_BY_ID, LANDMARKS, LAWS } from '../../src/narrative/content/landmarks';
import { LOCATIONS, PLOTS } from '../../src/narrative/content/map';
import { ARCS, EVENTS, OPENING_ACT } from '../../src/narrative/registry';
import { DECREES } from '../../src/narrative/content/decrees';
import { ArcSchema, DecreeSchema, EventSchema, JesterLineSchema, LandmarkSchema, type Beat, type Cond, type Effect, type EventDef } from '../../src/narrative/schema';

const allEffects = (e: EventDef): Effect[] => [
  ...e.effects,
  ...(e.decision?.choices.flatMap((c) => c.effects) ?? []),
  ...(e.decision?.ignored.effects ?? []),
];

const allBeats = (e: EventDef): Beat[] => [
  ...e.beats,
  ...(e.decision?.choices.flatMap((c) => c.beats) ?? []),
  ...(e.decision?.ignored.beats ?? []),
];

function condFlags(c: Cond | undefined, out: string[] = []): string[] {
  if (!c) return out;
  if ('flag' in c) out.push(c.flag);
  if ('not' in c) condFlags(c.not, out);
  if ('all' in c) c.all.forEach((x) => condFlags(x, out));
  if ('any' in c) c.any.forEach((x) => condFlags(x, out));
  return out;
}

function condFacts(c: Cond | undefined, out: string[] = []): string[] {
  if (!c) return out;
  if ('fact' in c) out.push(c.fact);
  if ('not' in c) condFacts(c.not, out);
  if ('all' in c) c.all.forEach((x) => condFacts(x, out));
  if ('any' in c) c.any.forEach((x) => condFacts(x, out));
  return out;
}

describe('content schema', () => {
  it('validates every event, arc, decree, line and landmark', () => {
    for (const e of EVENTS) EventSchema.parse(e);
    for (const a of ARCS) ArcSchema.parse(a);
    for (const d of DECREES) DecreeSchema.parse(d);
    for (const l of JESTER_LINES) JesterLineSchema.parse(l);
    for (const l of LANDMARKS) LandmarkSchema.parse(l);
  });

  it('has unique ids', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });

  it('meets the brief’s minimums', () => {
    expect(EVENTS.filter((e) => e.kind === 'ambient').length).toBeGreaterThanOrEqual(30);
    expect(EVENTS.filter((e) => e.kind === 'incident' && e.decision).length).toBeGreaterThanOrEqual(12);
    expect(ARCS.length).toBeGreaterThanOrEqual(3);
    expect(DECREES.length).toBeGreaterThanOrEqual(6);
    expect(JESTER_LINES.length).toBeGreaterThanOrEqual(100);
    expect(CITIZENS.filter((c) => !c.offstage).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(JESTER_ON).sort()).toEqual(CITIZENS.map((c) => c.id).sort());
  });
});

describe('content references', () => {
  it('casts real citizens', () => {
    for (const e of EVENTS)
      for (const spec of Object.values(e.cast)) if (typeof spec === 'string') expect(CITIZEN_BY_ID[spec], `${e.id}: ${spec}`).toBeTruthy();
  });

  it('only stages roles it has cast, at places that exist', () => {
    const herald = ['herald', 'crowd1', 'crowd2', 'crowd3', 'crowd4'];
    const place = (at: string) => at === 'gate' || at.startsWith('plot') || Boolean(LOCATIONS[at as keyof typeof LOCATIONS]);
    for (const e of EVENTS) {
      const roles = [...Object.keys(e.cast), ...herald];
      for (const b of allBeats(e)) {
        const who = b.do === 'gather' ? b.who : 'who' in b ? [b.who] : [];
        for (const w of who) expect(roles, `${e.id} beat ${JSON.stringify(b)}`).toContain(w);
        if (b.do === 'go') expect(place(b.to) || roles.includes(b.to), `${e.id}: go to ${b.to}`).toBe(true);
        if (b.do === 'gather') expect(place(b.at), `${e.id}: gather at ${b.at}`).toBe(true);
        if (b.do === 'chase') expect(roles).toContain(b.after);
      }
      if (e.at) expect(place(e.at), `${e.id}: at ${e.at}`).toBe(true);
    }
  });

  it('refers only to real landmarks, laws, offices and arcs', () => {
    const arcIds = ARCS.map((a) => a.id);
    for (const e of EVENTS) {
      for (const fx of allEffects(e)) {
        if (fx.type === 'landmark' || fx.type === 'removeLandmark') expect(LANDMARK_BY_ID[fx.id], `${e.id}: ${fx.id}`).toBeTruthy();
        if (fx.type === 'enactLaw' || fx.type === 'repealLaw') expect(LAWS[fx.id], `${e.id}: ${fx.id}`).toBeTruthy();
        if (fx.type === 'appoint') expect(OFFICE_NAMES[fx.office], `${e.id}: ${fx.office}`).toBeTruthy();
        if (fx.type === 'startArc' || fx.type === 'advanceArc' || fx.type === 'endArc') expect(arcIds).toContain(fx.id);
      }
    }
    for (const l of LANDMARKS) if (l.plot !== undefined) expect(PLOTS[l.plot]).toBeTruthy();
  });

  it('reads no flag or fact that nothing writes', () => {
    const flags = new Set(['rumour_ripe', 'pending_note']);
    const facts = new Set<string>();
    const scan = (effects: Effect[]) => {
      for (const fx of effects) {
        if (fx.type === 'setFlag') flags.add(fx.flag);
        if (fx.type === 'fact') facts.add(fx.key);
      }
    };
    for (const e of EVENTS) scan(allEffects(e));
    for (const d of DECREES) scan(d.effects);
    const conds = [...EVENTS.map((e) => e.when), ...JESTER_LINES.map((l) => l.when)];
    for (const c of conds) {
      for (const f of condFlags(c)) expect(flags, `unwritten flag ${f}`).toContain(f);
      for (const f of condFacts(c)) expect(facts, `unwritten fact ${f}`).toContain(f);
    }
    for (const l of JESTER_LINES) {
      for (const m of l.text.matchAll(/\{fact:(\w+)\}/g)) expect(facts, `unwritten fact ${m[1]}`).toContain(m[1]);
    }
  });

  it('gives every decision an ignored outcome that is not a punishment of silence', () => {
    for (const e of EVENTS) {
      if (!e.decision) continue;
      expect(e.decision.ignored.dispatch.text.length, e.id).toBeGreaterThan(20);
      expect(e.decision.patienceDays).toBeGreaterThan(0);
      expect(e.dispatch, `${e.id} needs a dispatch to carry its question`).toBeTruthy();
    }
  });

  it('gives every arc outcome and stage a path', () => {
    for (const arc of ARCS) {
      const effects = EVENTS.flatMap(allEffects);
      const reached = new Set(effects.flatMap((fx) => ((fx.type === 'startArc' || fx.type === 'advanceArc') && fx.id === arc.id ? [fx.stage] : [])));
      const ended = new Set(effects.flatMap((fx) => (fx.type === 'endArc' && fx.id === arc.id ? [fx.outcome] : [])));
      expect([...reached].sort(), arc.id).toEqual(Object.keys(arc.stages).sort());
      expect([...ended].sort(), arc.id).toEqual(Object.keys(arc.outcomes).sort());
    }
  });

  it('opens with events that exist', () => {
    for (const o of OPENING_ACT) expect(EVENTS.some((e) => e.id === o.event)).toBe(true);
  });
});
