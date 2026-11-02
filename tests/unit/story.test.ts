import { describe, expect, it } from 'vitest';
import { CITIZENS } from '../../src/narrative/content/citizens';
import { ARCS, EVENT_BY_ID, EVENTS } from '../../src/narrative/registry';
import { fx, type Effect } from '../../src/narrative/schema';
import { REAL_SECONDS_PER_DAY, seconds, weekday } from '../../src/sim/clock';
import { holds } from '../../src/sim/conditions';
import { applyEffect, applyEffects, InvalidEffect, validEffect } from '../../src/sim/effects';
import { catchUp } from '../../src/sim/away';
import { Engine } from '../../src/sim/engine';
import { compact } from '../../src/sim/memory';
import { finishScene, startScene } from '../../src/sim/scenes';
import { render } from '../../src/sim/text';
import type { Pacing, World } from '../../src/sim/types';
import { createWorld } from '../../src/sim/world';

const run = (e: Engine, ticks: number) => {
  for (let i = 0; i < ticks; i++) e.tick();
};

const hash = (w: World) => JSON.stringify(w);

/** Ride the opening act up to Gerald's question. */
function toFirstDecision(e: Engine) {
  for (let i = 0; i < seconds(600) && !e.world.pending; i++) e.tick();
  return e.world.pending;
}

describe('the opening act', () => {
  it('shows activity in the first minute, and asks the first question within five', () => {
    const e = new Engine(createWorld(4));
    let sawScene = false;
    for (let i = 0; i < seconds(60); i++) {
      e.tick();
      sawScene ||= Boolean(e.world.scene);
    }
    expect(sawScene).toBe(true);
    const pending = toFirstDecision(e);
    expect(pending?.event).toBe('gerald_coup');
    expect(e.world.tick).toBeLessThan(seconds(300));
    expect(e.world.dispatch?.text).toMatch(/pigeon/);
    expect(e.world.dispatch?.event).toBe('gerald_coup');
  });
});

describe('decisions', () => {
  it('sends the Herald, and only lands the consequence when she has read it', () => {
    const e = new Engine(createWorld(4));
    toFirstDecision(e);
    expect(e.world.offices.weather).toBe('ignatius');
    e.send({ type: 'decide', choice: 'recognise' });
    run(e, 3);
    expect(e.world.pending).toBeNull();
    // She waits for any scene already playing, then goes.
    for (let i = 0; i < seconds(60) && e.world.scene?.key !== 'choice:gerald_coup:recognise'; i++) e.tick();
    expect(e.world.scene?.key).toBe('choice:gerald_coup:recognise');
    expect(e.world.offices.weather).toBe('ignatius');
    for (let i = 0; i < seconds(160) && e.world.scene; i++) e.tick();
    expect(e.world.scene).toBeNull();
    expect(e.world.offices.weather).toBe('gerald');
    expect(e.world.citizens.gerald.hat).toBe('minister');
    expect(e.world.eras.at(-1)!.name).toBe('The Pigeon Years');
    expect(e.world.citizens.ignatius.epithets).toContain('the Deposed');
    expect(e.world.chronicle.some((c) => c.kind === 'decision')).toBe(true);
  });

  it('lets an ignored decision run its own course, without penalty', () => {
    const e = new Engine(createWorld(4));
    toFirstDecision(e);
    const morale = Object.values(e.world.citizens).map((c) => c.mood);
    const deadline = e.world.pending!.deadline;
    for (let i = 0; i < seconds(REAL_SECONDS_PER_DAY * 3) && e.world.clock.day <= deadline + 1; i++) e.tick();
    expect(e.world.pending?.event).not.toBe('gerald_coup');
    expect(e.world.offices.weather).toBe('gerald');
    expect(e.world.chronicle.some((c) => /said nothing/.test(c.text))).toBe(true);
    expect(Object.values(e.world.citizens).map((c) => c.mood)).toEqual(morale);
  });

  it('ignores an unknown choice', () => {
    const e = new Engine(createWorld(4));
    toFirstDecision(e);
    e.send({ type: 'decide', choice: 'set fire to it' });
    run(e, 2);
    expect(e.world.pending?.event).toBe('gerald_coup');
  });
});

describe('effects', () => {
  it('rejects outcomes that reference things that do not exist', () => {
    const bad: Effect[] = [
      fx.appoint('weather', 'nobody'),
      fx.appoint('emperor', 'pip'),
      fx.landmark('the moon'),
      fx.hat('nobody', 'crown'),
      fx.rel('pip', 'nobody', 1),
    ];
    for (const b of bad) {
      expect(validEffect(b)).toBe(false);
      expect(() => applyEffect(createWorld(1), b)).toThrow(InvalidEffect);
    }
  });

  it('applies an outcome entirely or not at all', () => {
    const w = createWorld(1);
    const before = hash(w);
    expect(() => applyEffects(w, [fx.flag('half'), fx.appoint('weather', 'nobody')])).toThrow(InvalidEffect);
    expect(hash(w)).toBe(before);
  });

  it('fills plots, and overwrites the oldest only when history runs out of room', () => {
    const w = createWorld(1);
    for (const id of ['monument', 'ballot', 'cabbage', 'embassy', 'calendar_stone', 'chair_shrine']) applyEffect(w, fx.landmark(id));
    expect(new Set(w.landmarks.map((l) => l.plot)).size).toBe(6);
    applyEffect(w, fx.landmark('artifact'));
    expect(w.landmarks.length).toBe(6);
    expect(w.landmarks.some((l) => l.id === 'artifact')).toBe(true);
    expect(w.landmarks.some((l) => l.id === 'monument')).toBe(false);
  });

  it('really does remove Tuesday from the calendar', () => {
    const days = Array.from({ length: 14 }, (_, i) => weekday(i + 1, ['no_tuesdays']));
    expect(days).not.toContain('Tuesday');
    expect(days[0]).toBe('Monday');
    expect(days[1]).toBe('Wednesday');
    expect(weekday(2)).toBe('Tuesday');
    expect(weekday(2, ['tuesday_notice'])).toBe('Tuesday (by appointment)');
  });
});

describe('stage and offstage', () => {
  it('resolves an event to the same lasting state either way', () => {
    for (const e of EVENTS) {
      if (e.decision) continue;
      const staged = createWorld(2);
      const unstaged = createWorld(2);
      for (const w of [staged, unstaged]) {
        if (e.effects.some((x) => x.type === 'advanceArc' || x.type === 'endArc')) {
          for (const arc of ARCS) w.arcs[arc.id] = { stage: 'x', status: 'active', startedDay: 1, lastDay: 1 };
        }
      }
      const cast = Object.fromEntries(Object.entries(e.cast).map(([role, spec], i) => [role, typeof spec === 'string' ? spec : CITIZENS[i].id]));
      startScene(staged, `event:${e.id}`, cast);
      finishScene(staged);
      applyEffects(unstaged, e.effects, cast);
      const lasting = (w: World) => JSON.stringify([w.flags, w.offices, w.laws, w.landmarks, w.arcs, w.facts, w.chronicle, w.eras]);
      expect(lasting(staged), e.id).toBe(lasting(unstaged));
    }
  });

  it('never leaves a cast member stuck when a scene is finished early', () => {
    const e = new Engine(createWorld(4));
    toFirstDecision(e);
    e.send({ type: 'decide', choice: 'election' });
    run(e, 60);
    expect(e.world.scene).not.toBeNull();
    finishScene(e.world);
    expect(Object.values(e.world.citizens).some((c) => c.staged)).toBe(false);
    expect(e.world.arcs.weather.stage).toBe('election');
  });
});

describe('text', () => {
  it('fills names, offices and remembered facts', () => {
    const w = createWorld(1);
    expect(render(w, '{a} and {office:weather}', { a: 'pip' })).toBe('Pip and Ignatius Fenn');
    applyEffect(w, fx.fact('x', 'the thing'));
    expect(render(w, 'Remember {fact:x}?')).toBe('Remember the thing?');
    applyEffect(w, fx.epithet('pip', 'the Unsung'));
    expect(render(w, '{a.full}', { a: 'pip' })).toBe('Pip the Unsung');
    expect(['x', 'y']).toContain(render(w, '[[x|y]]'));
  });
});

describe('away from the kingdom', () => {
  const hours = (h: number) => h * 60 * 60 * 1000;

  it('is bounded and deterministic', () => {
    const make = () => {
      const e = new Engine(createWorld(6));
      toFirstDecision(e);
      return e.world;
    };
    const a = make();
    const b = make();
    catchUp(a, hours(30));
    catchUp(b, hours(30));
    expect(hash(a)).toBe(hash(b));
    expect(a.recap!.days).toBe(7);
    expect(a.recap!.lines.length).toBeLessThanOrEqual(5);
    expect(a.clock.day).toBeLessThanOrEqual(9);
  });

  it('stays quiet for a short absence', () => {
    const e = new Engine(createWorld(6));
    run(e, 300);
    const day = e.world.clock.day;
    catchUp(e.world, 60_000);
    expect(e.world.recap).toBeNull();
    expect(e.world.clock.day).toBe(day);
  });

  it('moves an open dispute on while the user is gone', () => {
    const e = new Engine(createWorld(6));
    toFirstDecision(e);
    catchUp(e.world, hours(24));
    expect(e.world.pending?.event).not.toBe('gerald_coup');
    expect(e.world.arcs.weather.stage).not.toBe('coup');
    expect(e.world.recap!.lines.length).toBeGreaterThan(0);
  });

  it('finishes a scene left in mid-performance', () => {
    const e = new Engine(createWorld(6));
    toFirstDecision(e);
    e.send({ type: 'decide', choice: 'recognise' });
    run(e, 40);
    catchUp(e.world, hours(2));
    expect(e.world.scene).toBeNull();
    expect(e.world.offices.weather).toBe('gerald');
    new Engine(e.world).tick();
  });
});

describe('memory', () => {
  it('condenses old history but keeps what mattered', () => {
    const w = createWorld(1);
    for (let i = 0; i < 400; i++) w.chronicle.unshift({ day: i, text: `t${i}`, kind: 'incident', salience: i % 10 === 0 ? 3 : 1 });
    compact(w);
    expect(w.chronicle.length).toBeLessThanOrEqual(300);
    expect(w.chronicle.some((c) => c.text === 't0')).toBe(true);
    expect(w.chronicle.some((c) => c.text === 't1')).toBe(false);
    expect(w.chronicle[0].text).toBe('t399');
  });
});

describe('soak', () => {
  const pacings: Pacing[] = ['quiet', 'balanced', 'chaotic'];
  for (const pacing of pacings) {
    it(`survives a thousand days on ${pacing}, and reaches every arc's end`, { timeout: 120000 }, () => {
      const e = new Engine(createWorld(12345));
      const w = e.world;
      w.settings.pacing = pacing;
      const seen = new Set<string>();
      const lastRepeat = new Map<string, number>();
      let decided = 0;
      const choices = ['first', 'last', 'ignore'] as const;
      const until = 1000;
      while (w.clock.day < until) {
        e.tick();
        e.takeCues();
        const key = w.scene?.key.startsWith('event:') ? w.scene.key.slice(6) : null;
        if (key && w.scene!.beat === 0 && !seen.has(`${key}@${w.tick - 1}`)) {
          const last = lastRepeat.get(key);
          if (last !== undefined) expect(w.tick - last, `${key} repeated at once`).toBeGreaterThan(seconds(30));
          lastRepeat.set(key, w.tick);
        }
        if (w.scene?.key.startsWith('event:')) seen.add(w.scene.key.slice(6));
        if (w.pending && w.tick % seconds(40) === 0) {
          const pick = choices[decided++ % 3];
          if (pick !== 'ignore') {
            const list = EVENT_BY_ID[w.pending.event].decision!.choices;
            e.send({ type: 'decide', choice: (pick === 'first' ? list[0] : list[list.length - 1]).id });
          }
        }
        if (w.tick % seconds(200) === 0) {
          const someone = Object.values(w.citizens).find((c) => !c.absent && !c.inside && !c.staged);
          if (someone) {
            e.send({ type: 'lift', id: someone.id });
            e.tick();
            e.send({ type: 'drop', id: someone.id, x: 136, y: 140 });
          }
        }
      }
      for (const arc of ARCS) expect(w.arcs[arc.id]?.status, `${pacing}: ${arc.id}`).toBe('done');
      expect(Object.values(w.citizens).filter((c) => c.staged && !w.scene).length).toBe(0);
      expect(JSON.stringify(w).length).toBeLessThan(200_000);
      expect(seen.size).toBeGreaterThan(pacing === 'quiet' ? 30 : 45);
      expect(holds(w, { dayAtLeast: 999 })).toBe(true);
      if (pacing === 'balanced') {
        console.log(`--- ${pacing}: ${seen.size} distinct events, ${w.chronicle.length} entries, ${JSON.stringify(w).length} bytes`);
        console.log(w.eras.map((x) => `Day ${x.fromDay}: ${x.name}`).join('\n'));
        console.log(w.chronicle.filter((c) => c.salience === 3).slice(-22).reverse().map((c) => `D${c.day}: ${c.text}`).join('\n'));
      }
    });
  }
});
