import { describe, expect, it } from 'vitest';
import { CITIZENS } from '../../src/narrative/content/citizens';
import { LAMPS, LOCATIONS, STRUCTURES } from '../../src/narrative/content/map';
import { hourOf, seconds } from '../../src/sim/clock';
import { Engine } from '../../src/sim/engine';
import { findPath, nearestWalkable, walkable } from '../../src/sim/nav';
import { createWorld } from '../../src/sim/world';

const run = (engine: Engine, ticks: number) => {
  for (let i = 0; i < ticks; i++) engine.tick();
};

const runUntil = (engine: Engine, day: number, hour: number, each?: () => void) => {
  const reached = () => engine.world.clock.day > day || (engine.world.clock.day === day && hourOf(engine.world.clock) >= hour);
  while (!reached()) {
    engine.tick();
    each?.();
  }
};

describe('determinism', () => {
  it('replays identically from the same seed and commands', () => {
    const a = new Engine(createWorld(42));
    const b = new Engine(createWorld(42));
    for (const e of [a, b]) {
      run(e, 300);
      e.send({ type: 'lift', id: 'percival' });
      e.send({ type: 'drop', id: 'percival', x: 136, y: 140 });
      run(e, 2000);
    }
    expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
  });

  it('differs between seeds', () => {
    const a = new Engine(createWorld(1));
    const b = new Engine(createWorld(2));
    run(a, 500);
    run(b, 500);
    expect(JSON.stringify(a.world.citizens)).not.toBe(JSON.stringify(b.world.citizens));
  });

  it('survives a save mid-stride', () => {
    const a = new Engine(createWorld(9));
    run(a, 700);
    const b = new Engine(JSON.parse(JSON.stringify(a.world)));
    run(a, 700);
    run(b, 700);
    expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
  });
});

describe('the map', () => {
  it('reaches every spot from the castle gate', () => {
    for (const loc of Object.values(LOCATIONS)) {
      for (const spot of loc.spots) {
        const path = findPath({ x: 136, y: 72 }, spot);
        expect(path.length, `${loc.id} (${spot.x},${spot.y})`).toBeGreaterThan(0);
      }
    }
  });

  it('reaches every citizen door', () => {
    for (const c of CITIZENS) expect(findPath({ x: 136, y: 72 }, c.door).length, c.id).toBeGreaterThan(0);
  });

  it('reaches every lamp', () => {
    for (const l of LAMPS) expect(findPath({ x: 136, y: 72 }, { x: l.x, y: l.y + 4 }).length).toBeGreaterThan(0);
  });

  it('blocks buildings and lands the dropped on solid ground', () => {
    const castle = STRUCTURES.find((s) => s.id === 'castle')!.foot;
    expect(walkable(castle.x + 10, castle.y + 10)).toBe(false);
    const landed = nearestWalkable(castle.x + 20, castle.y + 10);
    expect(walkable(landed.x, landed.y)).toBe(true);
    const fromSpace = nearestWalkable(-500, -500);
    expect(walkable(fromSpace.x, fromSpace.y)).toBe(true);
  });
});

describe('citizens', () => {
  it('stays on walkable ground for a whole fictional week', () => {
    const e = new Engine(createWorld(5));
    for (let i = 0; i < seconds(900) * 7; i++) {
      e.tick();
      if (i % 25) continue;
      for (const c of Object.values(e.world.citizens)) {
        if (c.inside) continue;
        expect(walkable(c.pos.x, c.pos.y) || c.path.length > 0, `${c.id} at ${c.pos.x},${c.pos.y}`).toBe(true);
      }
    }
    expect(e.world.clock.day).toBe(8);
  });

  it('goes indoors at night and comes out in the morning', () => {
    const e = new Engine(createWorld(5));
    runUntil(e, 2, 3);
    expect(e.world.citizens.beatrice.inside).toBe(true);
    runUntil(e, 2, 10);
    expect(e.world.citizens.beatrice.inside).toBe(false);
  });

  it('leaves everyone moving: nobody sits still all day', () => {
    const e = new Engine(createWorld(11));
    const start = Object.fromEntries(Object.values(e.world.citizens).map((c) => [c.id, { ...c.pos }]));
    const moved = new Set<string>();
    for (let i = 0; i < seconds(450); i++) {
      e.tick();
      for (const c of Object.values(e.world.citizens)) {
        if (Math.hypot(c.pos.x - start[c.id].x, c.pos.y - start[c.id].y) > 8) moved.add(c.id);
      }
    }
    expect(moved.size).toBe(CITIZENS.filter((c) => !c.offstage).length);
  });
});

describe('the lamplighter', () => {
  it('lights every lamp by nightfall, one at a time, and snuffs them by morning', () => {
    for (const seed of [3, 4, 5, 6]) {
      const e = new Engine(createWorld(seed));
      let seen = 0;
      runUntil(e, 2, 3, () => {
        const lit = e.world.lamps.filter(Boolean).length;
        expect(lit - seen).toBeLessThanOrEqual(1);
        seen = lit;
      });
      expect(seen).toBe(LAMPS.length);
      runUntil(e, 2, 9.5);
      expect(e.world.lamps.filter(Boolean).length).toBe(0);
    }
  });
});

describe('the Hand', () => {
  it('lifts, carries and drops, leaving a mark on the record', () => {
    const e = new Engine(createWorld(8));
    run(e, 50);
    e.send({ type: 'lift', id: 'beatrice' });
    run(e, 1);
    expect(e.world.citizens.beatrice.lifted).toBe(true);
    e.send({ type: 'carry', id: 'beatrice', x: 100, y: 120 });
    run(e, 3);
    expect(e.world.citizens.beatrice.pos).toEqual({ x: 100, y: 120 });
    e.send({ type: 'drop', id: 'beatrice', x: 100, y: 120 });
    run(e, 1);
    const b = e.world.citizens.beatrice;
    expect(b.lifted).toBe(false);
    expect(b.liftCount).toBe(1);
    expect(b.deeds[0].text).toMatch(/lifted/);
    const cues = e.takeCues();
    expect(cues.some((c) => c.type === 'say' && c.id === 'beatrice')).toBe(true);
    expect(cues.some((c) => c.type === 'puff')).toBe(true);
  });

  it('faints Percival, who then gets up and resumes patrol', () => {
    const e = new Engine(createWorld(8));
    e.send({ type: 'lift', id: 'percival' });
    run(e, 1);
    e.send({ type: 'drop', id: 'percival', x: 136, y: 140 });
    run(e, 1);
    const p = e.world.citizens.percival;
    expect(p.faintUntil).toBeGreaterThan(e.world.tick);
    const at = { ...p.pos };
    run(e, seconds(5));
    expect(p.pos).toEqual(at);
    run(e, seconds(12));
    expect(Math.hypot(p.pos.x - at.x, p.pos.y - at.y)).toBeGreaterThan(5);
  });

  it('keeps a dropped citizen out of walls', () => {
    const e = new Engine(createWorld(8));
    const castle = STRUCTURES.find((s) => s.id === 'castle')!.foot;
    e.send({ type: 'lift', id: 'pip' });
    run(e, 1);
    e.send({ type: 'drop', id: 'pip', x: castle.x + 30, y: castle.y + 10 });
    run(e, 1);
    expect(walkable(e.world.citizens.pip.pos.x, e.world.citizens.pip.pos.y)).toBe(true);
  });
});
