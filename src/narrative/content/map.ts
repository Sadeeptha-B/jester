/**
 * The geography of Elsewhere, as plain data. The simulation paths across it and
 * the art bakes from it, so neither layer owns the map.
 *
 * Coordinates are logical pixels on the slab, 272×232.
 */
export const SLAB_W = 272;
export const SLAB_H = 232;
export const CELL = 8;
export const GRID_W = SLAB_W / CELL;
export const GRID_H = SLAB_H / CELL;

export interface Pt {
  x: number;
  y: number;
}
export interface Rect extends Pt {
  w: number;
  h: number;
}

export type BuildingArt =
  | 'castle'
  | 'tower'
  | 'ministry'
  | 'tavern'
  | 'stallA'
  | 'stallB'
  | 'stallC'
  | 'cottageA'
  | 'cottageB'
  | 'cottageC'
  | 'clock'
  | 'fountain';

export interface Structure {
  id: string;
  art: BuildingArt;
  /** Left edge of the sprite and the y of its base line (used for depth sorting). */
  x: number;
  base: number;
  /** Ground blocked for walking, in slab coordinates. */
  foot: Rect;
  location?: LocationId;
}

export type LocationId =
  | 'castle'
  | 'tower'
  | 'ministry'
  | 'tavern'
  | 'square'
  | 'market'
  | 'gardens'
  | 'pond'
  | 'cottages'
  | 'woods';

export const STRUCTURES: Structure[] = [
  { id: 'castle', art: 'castle', x: 92, base: 64, foot: { x: 94, y: 30, w: 84, h: 34 }, location: 'castle' },
  { id: 'tower', art: 'tower', x: 22, base: 70, foot: { x: 25, y: 50, w: 24, h: 20 }, location: 'tower' },
  { id: 'ministry', art: 'ministry', x: 190, base: 72, foot: { x: 192, y: 40, w: 68, h: 32 }, location: 'ministry' },
  { id: 'tavern', art: 'tavern', x: 14, base: 134, foot: { x: 16, y: 106, w: 56, h: 28 }, location: 'tavern' },
  { id: 'clock', art: 'clock', x: 176, base: 98, foot: { x: 178, y: 90, w: 16, h: 8 }, location: 'square' },
  { id: 'fountain', art: 'fountain', x: 118, base: 130, foot: { x: 120, y: 114, w: 32, h: 16 }, location: 'square' },
  { id: 'stall1', art: 'stallA', x: 198, base: 122, foot: { x: 200, y: 108, w: 30, h: 14 }, location: 'market' },
  { id: 'stall2', art: 'stallB', x: 234, base: 122, foot: { x: 236, y: 108, w: 28, h: 14 }, location: 'market' },
  { id: 'stall3', art: 'stallC', x: 212, base: 152, foot: { x: 214, y: 138, w: 30, h: 14 }, location: 'market' },
  { id: 'cottage1', art: 'cottageA', x: 92, base: 188, foot: { x: 94, y: 168, w: 32, h: 20 }, location: 'cottages' },
  { id: 'cottage2', art: 'cottageB', x: 204, base: 186, foot: { x: 206, y: 166, w: 32, h: 20 }, location: 'cottages' },
  { id: 'cottage3', art: 'cottageC', x: 226, base: 216, foot: { x: 228, y: 196, w: 30, h: 20 }, location: 'cottages' },
  { id: 'cottage4', art: 'cottageA', x: 120, base: 218, foot: { x: 122, y: 198, w: 32, h: 20 }, location: 'cottages' },
];

/** Roads as polylines; `cobble` are paved, the rest are trodden earth. */
export const ROADS: { pts: [number, number][]; width: number; cobble: boolean }[] = [
  // the high street, castle gate down through the square to the south lanes
  { pts: [[136, 64], [136, 96], [136, 150], [136, 164], [176, 164], [196, 196], [214, 200]], width: 6, cobble: true },
  // east-west road, tavern to market
  { pts: [[44, 134], [44, 146], [92, 146], [136, 136], [190, 136], [204, 128], [250, 128]], width: 5, cobble: true },
  // to the tower
  { pts: [[38, 70], [38, 84], [80, 84], [136, 84]], width: 4, cobble: false },
  // to the ministry
  { pts: [[136, 84], [212, 84], [226, 74]], width: 5, cobble: true },
  // gardens lane
  { pts: [[92, 146], [84, 160], [80, 190], [108, 196]], width: 4, cobble: false },
  // cottages
  { pts: [[112, 164], [136, 164]], width: 3, cobble: false },
  { pts: [[108, 196], [136, 192], [136, 164]], width: 3, cobble: false },
  { pts: [[222, 188], [214, 200], [214, 218], [240, 222]], width: 3, cobble: false },
];

export const SQUARE = { x: 136, y: 118, rx: 50, ry: 32 };
export const POND = { x: 170, y: 188, rx: 19, ry: 12 };
export const ALLOTMENT: Rect = { x: 22, y: 158, w: 50, h: 34 };

export const TREES: { x: number; y: number; kind: 'oak' | 'pine' }[] = [
  { x: 14, y: 96, kind: 'pine' },
  { x: 84, y: 66, kind: 'oak' },
  { x: 186, y: 66, kind: 'pine' },
  { x: 262, y: 88, kind: 'oak' },
  { x: 68, y: 98, kind: 'pine' },
  { x: 268, y: 150, kind: 'pine' },
  { x: 258, y: 170, kind: 'oak' },
  { x: 14, y: 150, kind: 'oak' },
  { x: 12, y: 198, kind: 'pine' },
  { x: 30, y: 208, kind: 'oak' },
  { x: 52, y: 214, kind: 'pine' },
  { x: 72, y: 214, kind: 'oak' },
  { x: 94, y: 214, kind: 'pine' },
  { x: 192, y: 214, kind: 'oak' },
  { x: 176, y: 224, kind: 'pine' },
];

export const LAMPS: Pt[] = [
  { x: 128, y: 74 },
  { x: 146, y: 74 },
  { x: 92, y: 90 },
  { x: 180, y: 106 },
  { x: 92, y: 140 },
  { x: 180, y: 142 },
  { x: 62, y: 142 },
  { x: 212, y: 134 },
  { x: 146, y: 172 },
];

export const BENCHES: Pt[] = [
  { x: 100, y: 104 },
  { x: 160, y: 148 },
  { x: 150, y: 186 },
];

/** Empty ground that history can fill. Landmarks only ever appear here. */
export const PLOTS: Pt[] = [
  { x: 70, y: 76 },
  { x: 182, y: 78 },
  { x: 104, y: 124 },
  { x: 176, y: 124 },
  { x: 60, y: 200 },
  { x: 188, y: 174 },
];

export const GATE: Pt = { x: 136, y: 68 };

export interface Location {
  id: LocationId;
  name: string;
  blurb: string;
  centre: Pt;
  /** Spots citizens idle at. */
  spots: Pt[];
}

export const LOCATIONS: Record<LocationId, Location> = {
  castle: {
    id: 'castle',
    name: 'The Royal Castle',
    blurb: 'Seat of the throne, which is empty, and of the Royal Council, which prefers it that way.',
    centre: { x: 136, y: 72 },
    spots: [{ x: 120, y: 72 }, { x: 152, y: 72 }, { x: 136, y: 78 }, { x: 110, y: 76 }, { x: 164, y: 76 }],
  },
  tower: {
    id: 'tower',
    name: "The Wizard's Tower",
    blurb: 'It leans. Structural surveyors call this "a matter of opinion". Scorch marks are original features.',
    centre: { x: 38, y: 76 },
    spots: [{ x: 32, y: 76 }, { x: 46, y: 78 }, { x: 56, y: 74 }, { x: 24, y: 82 }],
  },
  ministry: {
    id: 'ministry',
    name: 'The Ministry of Unnecessary Affairs',
    blurb: 'Eleven departments, one door, and a queue of historic significance.',
    centre: { x: 226, y: 80 },
    spots: [{ x: 220, y: 78 }, { x: 226, y: 84 }, { x: 234, y: 78 }, { x: 208, y: 80 }, { x: 246, y: 80 }],
  },
  tavern: {
    id: 'tavern',
    name: 'The Moderately Legal Goose',
    blurb: 'A tavern. Rumours are brewed on the premises and served at room temperature.',
    centre: { x: 44, y: 140 },
    spots: [{ x: 34, y: 140 }, { x: 44, y: 142 }, { x: 54, y: 140 }, { x: 70, y: 142 }, { x: 26, y: 142 }],
  },
  square: {
    id: 'square',
    name: 'The Town Square',
    blurb: 'Where Elsewhere gathers to disagree. The clock is believed to be correct by at least one religion.',
    centre: { x: 136, y: 136 },
    spots: [
      { x: 108, y: 112 },
      { x: 164, y: 114 },
      { x: 112, y: 136 },
      { x: 160, y: 134 },
      { x: 136, y: 140 },
      { x: 124, y: 104 },
      { x: 150, y: 104 },
      { x: 100, y: 122 },
    ],
  },
  market: {
    id: 'market',
    name: 'The Marketplace',
    blurb: 'Vegetables, mostly. Occasionally a vegetable of political significance.',
    centre: { x: 226, y: 128 },
    spots: [{ x: 212, y: 126 }, { x: 228, y: 130 }, { x: 246, y: 126 }, { x: 204, y: 134 }, { x: 250, y: 136 }],
  },
  gardens: {
    id: 'gardens',
    name: 'The Royal Allotments',
    blurb: "Lady Turnip's power base. Everything here is growing, and some of it is growing suspicious.",
    centre: { x: 80, y: 176 },
    spots: [{ x: 78, y: 170 }, { x: 80, y: 184 }, { x: 40, y: 196 }, { x: 62, y: 196 }, { x: 88, y: 158 }],
  },
  pond: {
    id: 'pond',
    name: 'The Pond of Reasonable Depth',
    blurb: 'Surveyed in the year of the Ministry’s founding and declared reasonable.',
    centre: { x: 150, y: 192 },
    spots: [{ x: 146, y: 180 }, { x: 148, y: 198 }, { x: 170, y: 170 }, { x: 196, y: 196 }],
  },
  cottages: {
    id: 'cottages',
    name: 'The Cottages',
    blurb: 'Where citizens go to recover from one another.',
    centre: { x: 136, y: 170 },
    spots: [{ x: 110, y: 192 }, { x: 196, y: 190 }, { x: 222, y: 192 }, { x: 118, y: 164 }],
  },
  woods: {
    id: 'woods',
    name: 'The Edge of the Woods',
    blurb: 'The kingdom stops here, abruptly. The Ministry has a form about it.',
    centre: { x: 60, y: 204 },
    spots: [{ x: 44, y: 202 }, { x: 74, y: 204 }, { x: 22, y: 190 }],
  },
};

/** The slab's rounded outline; shared so nothing walks off the edge of the world. */
export function onSlab(x: number, y: number): boolean {
  const nx = Math.abs(x - SLAB_W / 2) / (SLAB_W / 2);
  const ny = Math.abs(y - SLAB_H / 2) / (SLAB_H / 2);
  return nx ** 4 + ny ** 4 < 1;
}
