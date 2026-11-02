/**
 * The Prop Room: a dev-only page that shows every baked asset at a glance, so
 * art can be reviewed from a single screenshot. Open /props.html.
 */
import { LOOKS } from '../../../narrative/content/looks';
import { BENCHES, LAMPS, LOCATIONS, STRUCTURES, TREES, type BuildingArt } from '../../../narrative/content/map';
import { bakeBuilding, bench, bush, fenceSegment, lamp, oak, pine } from './buildings';
import { CHICKEN, citizenFrame, PIGEON, type Facing, type Pose } from './figures';
import { jesterPortrait } from './portrait';
import { bakeProp, PROP_ARTS } from './props';
import { Px } from './px';
import { bakeTerrain, TERRAIN_MARGIN } from './terrain';

const room = document.getElementById('room')!;

function section(title: string, flat = false): HTMLElement {
  const h = document.createElement('h2');
  h.textContent = title;
  room.append(h);
  const row = document.createElement('div');
  row.className = flat ? 'row flat' : 'row';
  room.append(row);
  return row;
}

export function show(row: HTMLElement, px: Px, label: string, scale = 4) {
  const fig = document.createElement('figure');
  const c = px.toCanvas();
  c.style.width = `${px.w * scale}px`;
  c.style.height = `${px.h * scale}px`;
  fig.append(c);
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(cap);
  row.append(fig);
}

const cast = section('Citizens');
for (const [id, look] of Object.entries(LOOKS)) show(cast, citizenFrame(look, 'front', 'stand'), id, 4);

const turns = section('Facing and gait: jester, wizard, lady turnip');
for (const id of ['jester', 'archibald', 'turnip']) {
  const frames: [Facing, Pose][] = [
    ['front', 'stand'],
    ['front', 'walk1'],
    ['front', 'walk3'],
    ['side', 'stand'],
    ['side', 'walk1'],
    ['side', 'walk3'],
    ['back', 'stand'],
    ['back', 'walk1'],
    ['front', 'dangle1'],
    ['front', 'dangle2'],
    ['front', 'sit'],
    ['front', 'flat'],
  ];
  for (const [f, p] of frames) show(turns, citizenFrame(LOOKS[id], f, p), `${f[0]}/${p}`, 3);
}

const puppet = section('The Jester', true);
for (const mood of ['smug', 'delight', 'shock', 'scheme', 'bored', 'solemn'] as const) {
  show(puppet, jesterPortrait(mood, false), mood, 3);
  show(puppet, jesterPortrait(mood, true), 'talking', 3);
}

const memorabilia = section('Landmarks and props', true);
for (const art of PROP_ARTS) show(memorabilia, bakeProp(art), art, 3);

const beasts = section('Animals');
for (const [name, grid] of Object.entries({ ...CHICKEN }))
  show(beasts, Px.fromGrid(grid).outline('k'), `chicken ${name}`, 4);
for (const [name, grid] of Object.entries({ ...PIGEON }))
  show(beasts, Px.fromGrid(grid).outline('k'), `pigeon ${name}`, 4);

const structures = section('Buildings', true);
const arts: BuildingArt[] = ['castle', 'tower', 'ministry', 'tavern', 'stallA', 'stallB', 'stallC', 'cottageA', 'cottageB', 'cottageC', 'clock', 'fountain'];
for (const art of arts) show(structures, bakeBuilding(art).px, art, 3);

const furniture = section('Furniture');
show(furniture, oak(1), 'oak', 3);
show(furniture, oak(1, 1), 'oak sway', 3);
show(furniture, pine(2), 'pine', 3);
show(furniture, lamp(false), 'lamp', 3);
show(furniture, lamp(true), 'lamp lit', 3);
show(furniture, bench(), 'bench', 3);
show(furniture, bush(3), 'bush', 3);
show(furniture, fenceSegment(), 'fence', 3);

// A flat composite of the town, to judge the map without any renderer in the way.
const town = section('Town composite', true);
const comp = new Px(320, 330);
const OX = 20;
const OY = 70;
comp.blit(bakeTerrain(), OX - TERRAIN_MARGIN, OY - TERRAIN_MARGIN);
type Item = { y: number; px: Px; x: number };
const items: Item[] = [];
for (const s of STRUCTURES) {
  const b = bakeBuilding(s.art);
  items.push({ y: s.base, px: b.px, x: s.x });
}
TREES.forEach((t, i) => {
  const p = t.kind === 'oak' ? oak(i) : pine(i);
  items.push({ y: t.y, px: p, x: t.x - p.w / 2 });
});
for (const l of LAMPS) items.push({ y: l.y, px: lamp(false), x: l.x - 3 });
for (const b of BENCHES) items.push({ y: b.y, px: bench(), x: b.x - 8 });
Object.entries(LOOKS).forEach(([, look], i) => {
  const spots = Object.values(LOCATIONS).flatMap((l) => l.spots);
  const spot = spots[(i * 5) % spots.length];
  items.push({ y: spot.y, px: citizenFrame(look, 'front', 'stand'), x: spot.x - 8 });
});
items.sort((a, b) => a.y - b.y);
for (const it of items) comp.blit(it.px, Math.round(OX + it.x), Math.round(OY + it.y - it.px.h));
show(town, comp, 'Elsewhere', 3);

document.body.dataset.ready = '1';
