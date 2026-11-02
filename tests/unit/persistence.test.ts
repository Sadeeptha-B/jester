import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, memoryStore, MIGRATIONS, SaveRepository } from '../../src/persistence/repository';
import { Engine } from '../../src/sim/engine';
import { createWorld } from '../../src/sim/world';

const played = (seed: number, ticks = 2000) => {
  const e = new Engine(createWorld(seed));
  for (let i = 0; i < ticks; i++) e.tick();
  return e.world;
};

function syncStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('last words', () => {
  it('prefers the save made on the way out over an older autosave', async () => {
    const store = memoryStore();
    const sync = syncStore();
    const repo = new SaveRepository(store, sync);
    const world = played(3, 100);
    await repo.save(world, 1000);
    world.clock.day = 44;
    repo.saveLastWords(world, 2000);
    const loaded = await new SaveRepository(store, sync).load();
    expect(loaded!.world.clock.day).toBe(44);
    expect(loaded!.recovered).toBe(false);
  });

  it('keeps a kingdom that never reached its first autosave', async () => {
    const sync = syncStore();
    new SaveRepository(memoryStore(), sync).saveLastWords(played(3, 50), 1000);
    expect((await new SaveRepository(memoryStore(), sync).load())!.world.seed).toBe(3);
  });

  it('ignores them when a regular save is newer', async () => {
    const store = memoryStore();
    const sync = syncStore();
    const repo = new SaveRepository(store, sync);
    const world = played(3, 100);
    repo.saveLastWords(world, 1000);
    world.clock.day = 44;
    await repo.save(world, 2000);
    expect((await new SaveRepository(store, sync).load())!.world.clock.day).toBe(44);
  });

  it('shrugs off corrupt last words, without raising the alarm', async () => {
    const store = memoryStore();
    const sync = syncStore();
    await new SaveRepository(store, sync).save(played(3, 100), 1000);
    sync.setItem('jester-last-words', '{"version":1,"trunc');
    const loaded = await new SaveRepository(store, sync).load();
    expect(loaded!.world.seed).toBe(3);
    expect(loaded!.recovered).toBe(false);
  });

  it('survives storage refusing to write', () => {
    const sync = {
      ...syncStore(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => new SaveRepository(memoryStore(), sync).saveLastWords(played(3, 50))).not.toThrow();
  });

  it('is wiped along with everything else when a kingdom ends', async () => {
    const store = memoryStore();
    const sync = syncStore();
    const repo = new SaveRepository(store, sync);
    await repo.save(played(3, 50), 1000);
    repo.saveLastWords(played(3, 50), 2000);
    await repo.clear();
    expect(await new SaveRepository(store, sync).load()).toBeNull();
  });
});

describe('saving', () => {
  it('round-trips a played world exactly', async () => {
    const repo = new SaveRepository(memoryStore());
    const world = played(3);
    await repo.save(world, 1000);
    const loaded = await repo.load();
    expect(loaded?.recovered).toBe(false);
    expect(loaded!.world).toEqual(JSON.parse(JSON.stringify(world)));
  });

  it('continues deterministically after a load', async () => {
    const repo = new SaveRepository(memoryStore());
    const world = played(3);
    await repo.save(world, 1000);
    const loaded = (await repo.load())!.world;
    const a = new Engine(world);
    const b = new Engine(loaded);
    for (let i = 0; i < 2000; i++) {
      a.tick();
      b.tick();
    }
    expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
  });

  it('returns nothing when there has never been a save', async () => {
    expect(await new SaveRepository(memoryStore()).load()).toBeNull();
  });

  it('prefers the newest of two saves', async () => {
    const repo = new SaveRepository(memoryStore());
    const world = played(3, 100);
    await repo.save(world, 1000);
    world.clock.day = 44;
    await repo.save(world, 2000);
    expect((await repo.load())!.world.clock.day).toBe(44);
  });

  it('falls back to the older slot when the newest is corrupt', async () => {
    const store = memoryStore();
    const repo = new SaveRepository(store);
    const world = played(3, 100);
    await repo.save(world, 1000);
    world.clock.day = 44;
    await repo.save(world, 2000);
    store.data.set('slotB', '{"version":1,"oops');
    const loaded = await repo.load();
    expect(loaded!.recovered).toBe(true);
    expect(loaded!.world.savedAt).toBe(1000);
  });

  it('rejects a save with the wrong shape rather than trusting it', async () => {
    const store = memoryStore();
    const repo = new SaveRepository(store);
    const world = played(3, 100);
    await repo.save(world, 1000);
    const broken = JSON.parse(store.data.get('slotA') as string);
    broken.clock.minute = 'teatime';
    store.data.set('slotA', JSON.stringify(broken));
    const loaded = await repo.load();
    expect(loaded!.recovered).toBe(true);
    expect(loaded!.world).toBeNull();
  });

  it('overwrites the older slot after recovering', async () => {
    const store = memoryStore();
    const repo = new SaveRepository(store);
    const world = played(3, 100);
    await repo.save(world, 1000);
    await repo.save(world, 2000);
    store.data.set('slotA', 'junk');
    const fresh = new SaveRepository(store);
    const loaded = (await fresh.load())!;
    await fresh.save(loaded.world, 3000);
    expect(store.data.get('slotA')).not.toBe('junk');
  });

  it('migrates old saves forward', async () => {
    const store = memoryStore();
    const world = played(3, 50);
    const old = JSON.parse(JSON.stringify(world));
    old.version = 0;
    old.weather = 'drizzle';
    store.data.set('slotA', JSON.stringify(old));
    MIGRATIONS[0] = (save) => ({ ...save, weather: 'rain' });
    const loaded = await new SaveRepository(store).load();
    delete MIGRATIONS[0];
    expect(loaded!.world.weather).toBe('rain');
    expect(loaded!.world.version).toBe(CURRENT_VERSION);
  });

  it('refuses a save from a version with no migration path', async () => {
    const store = memoryStore();
    const old = JSON.parse(JSON.stringify(played(3, 50)));
    old.version = -3;
    store.data.set('slotA', JSON.stringify(old));
    const loaded = await new SaveRepository(store).load();
    expect(loaded!.recovered).toBe(true);
    expect(loaded!.world).toBeNull();
  });
});
