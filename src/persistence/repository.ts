import { openDB, type IDBPDatabase } from 'idb';
import type { World } from '../sim/types';
import { parseWorld } from './schema';

export const CURRENT_VERSION = 1;

/** Each step lifts a save from version N to N+1. Add one whenever the World shape changes. */
export const MIGRATIONS: Record<number, (save: Record<string, unknown>) => Record<string, unknown>> = {};

/** The little storage needs a repository has, so tests can run without a browser. */
export interface KeyValue {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export function indexedDbStore(): KeyValue {
  let db: Promise<IDBPDatabase> | null = null;
  const open = () => (db ??= openDB('jester', 1, { upgrade: (d) => void d.createObjectStore('saves') }));
  return {
    get: async (key) => (await open()).get('saves', key),
    set: async (key, value) => void (await (await open()).put('saves', value, key)),
    remove: async (key) => void (await (await open()).delete('saves', key)),
  };
}

export function memoryStore(): KeyValue & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => void data.set(key, value),
    remove: async (key) => void data.delete(key),
  };
}

const SLOTS = ['slotA', 'slotB'] as const;
const LAST_WORDS = 'jester-last-words';

/** The part of localStorage a repository needs. */
export type SyncStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Loaded {
  world: World;
  /** The newest save was unreadable and an older copy was used. */
  recovered: boolean;
}

function migrate(save: Record<string, unknown>): Record<string, unknown> {
  let current = save;
  let version = typeof current.version === 'number' ? current.version : 0;
  while (version < CURRENT_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from version ${version}`);
    current = step(current);
    version += 1;
    current.version = version;
  }
  return current;
}

/**
 * Saves alternate between two slots, so one bad write can never cost the whole kingdom.
 * IndexedDB can't be trusted to finish while a page is going away, so the moment of
 * leaving is written synchronously instead, as a third copy.
 */
export class SaveRepository {
  private next = 0;

  constructor(
    private store: KeyValue,
    private sync: SyncStore | null = null,
  ) {}

  async save(world: World, now = Date.now()) {
    world.savedAt = now;
    const slot = SLOTS[this.next];
    this.next = (this.next + 1) % SLOTS.length;
    await this.store.set(slot, JSON.stringify(world));
  }

  /** For the page's last moments, when only synchronous work is sure to finish. */
  saveLastWords(world: World, now = Date.now()) {
    world.savedAt = now;
    try {
      this.sync?.setItem(LAST_WORDS, JSON.stringify(world));
    } catch {
      // Storage full or forbidden: the regular autosave still stands.
    }
  }

  private read(raw: unknown): World | null {
    if (typeof raw !== 'string') return null;
    try {
      return parseWorld(migrate(JSON.parse(raw) as Record<string, unknown>));
    } catch {
      return null;
    }
  }

  async load(): Promise<Loaded | null> {
    const raws = await Promise.all(SLOTS.map((s) => this.store.get(s)));
    const present = raws.filter((r) => r !== undefined).length;
    const worlds = raws.map((r) => this.read(r));
    const valid = worlds.map((w, i) => ({ w, i })).filter((x) => x.w) as { w: World; i: number }[];
    valid.sort((a, b) => b.w.savedAt - a.w.savedAt);
    // Keep writing over the older slot.
    if (valid.length) this.next = (valid[0].i + 1) % SLOTS.length;

    const lastWords = this.read(this.sync?.getItem(LAST_WORDS) ?? undefined);
    const newest = lastWords && lastWords.savedAt > (valid[0]?.w.savedAt ?? -1) ? lastWords : valid[0]?.w;
    if (!newest) return present ? { world: null as unknown as World, recovered: true } : null;
    return { world: newest, recovered: valid.length < present };
  }

  async clear() {
    this.sync?.removeItem(LAST_WORDS);
    await Promise.all(SLOTS.map((s) => this.store.remove(s)));
  }
}
