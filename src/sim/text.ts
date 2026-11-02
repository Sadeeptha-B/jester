import { CITIZEN_BY_ID, OFFICE_NAMES } from '../narrative/content/citizens';
import { next } from './rng';
import type { World } from './types';

export function displayName(world: World, id: string): string {
  const def = CITIZEN_BY_ID[id];
  const epithet = world.citizens[id]?.epithets[0];
  return epithet ? `${def.name} ${epithet}` : def.name;
}

/**
 * Fill a template. `{role}` is a name, `{role.full}` adds the latest epithet,
 * `{day}` the date, `{office:weather}` the current holder, `{fact:key}` a
 * remembered sentence, and `[[a|b|c]]` picks one option.
 */
export function render(world: World, text: string, cast: Record<string, string> = {}): string {
  return text
    .replace(/\[\[(.+?)\]\]/g, (_, options: string) => {
      const list = options.split('|');
      return list[Math.floor(next(world) * list.length)];
    })
    .replace(/\{(.+?)\}/g, (whole, key: string) => {
      if (key === 'day') return String(world.clock.day);
      if (key.startsWith('office:')) {
        const holder = world.offices[key.slice(7)];
        return holder ? CITIZEN_BY_ID[holder].name : 'nobody';
      }
      if (key.startsWith('officeName:')) return OFFICE_NAMES[key.slice(11)] ?? key;
      if (key.startsWith('fact:')) return world.facts.find((f) => f.key === key.slice(5))?.text ?? '';
      const [role, part] = key.split('.');
      const id = cast[role] ?? (CITIZEN_BY_ID[role] ? role : undefined);
      if (!id) {
        const value = cast[role];
        return value ?? whole;
      }
      if (OFFICE_NAMES[id]) return OFFICE_NAMES[id];
      if (!CITIZEN_BY_ID[id]) return id;
      return part === 'full' ? displayName(world, id) : CITIZEN_BY_ID[id].name;
    });
}
