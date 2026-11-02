import type { BuildingArt, Rect } from '../../../narrative/content/map';
import type { Colour } from './palette';
import { artRng, Px } from './px';

export interface BuildingSprite {
  px: Px;
  /** Glass that lights up after dark, in sprite coordinates. */
  windows: Rect[];
  /** Chimney mouths, for smoke. */
  smoke: { x: number; y: number }[];
}

type Ramp = [base: Colour, dark: Colour, light: Colour];

const SLATE: Ramp = ['N', 'n', 'a'];
const TILE: Ramp = ['t', 'B', 'T'];
const THATCH: Ramp = ['T', 't', 'c'];
const PLUM: Ramp = ['p', 'K', 'P'];
const LEAD: Ramp = ['d', 'K', 'S'];

function shingles(px: Px, x: number, y: number, w: number, h: number, [base, dark, light]: Ramp, seed: number) {
  const rng = artRng(seed);
  px.rect(x, y, w, h, base);
  for (let row = 0, j = y + 2; j < y + h; j += 3, row++) {
    for (let i = x; i < x + w; i++) {
      const brick = (i - x + (row % 2) * 2) % 4;
      if (brick === 0) px.set(i, j - 1, dark);
      px.set(i, j, brick === 0 ? base : dark);
      if (brick === 2 && rng() < 0.16) px.set(i, j - 1, light);
    }
  }
  px.hline(x, y, w, light);
}

function stone(px: Px, x: number, y: number, w: number, h: number, seed: number, ramp: Ramp = ['s', 'S', 'W']) {
  const rng = artRng(seed);
  const [base, dark, light] = ramp;
  px.rect(x, y, w, h, base);
  for (let row = 0, j = y + 3; j < y + h; j += 4, row++) {
    for (let i = x; i < x + w; i++) {
      if (rng() < 0.82) px.set(i, j, dark);
      if ((i - x + row * 3) % 7 === 0) {
        px.vline(i, j - 3, 3, dark);
        if (rng() < 0.3) px.rect(i + 1, j - 3, 3, 3, light);
      }
    }
  }
}

/** Soft dark at the foot and under the eaves, which is most of what makes walls read as walls. */
function shadeWall(px: Px, x: number, y: number, w: number, h: number, dark: Colour) {
  px.dither(x, y, w, 1, dark);
  px.hline(x, y, w, dark);
  px.dither(x, y + 1, w, 1, dark);
  px.dither(x, y + h - 2, w, 2, dark);
}

function roundShade(px: Px, x: number, y: number, w: number, h: number, light: Colour, dark: Colour) {
  px.dither(x, y, 2, h, light);
  px.vline(x + w - 1, y, h, dark);
  px.dither(x + w - 3, y, 2, h, dark);
}

function glass(px: Px, x: number, y: number, w: number, h: number, windows: Rect[]) {
  px.rect(x, y, w, h, 'n');
  px.vline(x, y, h, 'N');
  windows.push({ x, y, w, h });
}

function window(px: Px, x: number, y: number, w: number, h: number, windows: Rect[], frame: Colour = 'b', sill: Colour = 'W') {
  px.rect(x - 1, y - 1, w + 2, h + 2, frame);
  glass(px, x, y, w, h, windows);
  if (w >= 3) px.vline(x + (w >> 1), y, h, frame);
  if (h >= 4) px.hline(x, y + (h >> 1), w, frame);
  px.hline(x - 2, y + h + 1, w + 4, sill);
}

function archedWindow(px: Px, x: number, y: number, w: number, h: number, windows: Rect[], frame: Colour = 'S') {
  px.rect(x, y, w, h, frame).rect(x + 1, y - 1, w - 2, 1, frame);
  glass(px, x + 1, y + 1, w - 2, h - 1, windows);
}

function crenels(px: Px, x: number, y: number, w: number, ramp: Ramp = ['s', 'S', 'W']) {
  for (let i = 0; i < w; i += 4) {
    px.rect(x + i, y, Math.min(3, w - i), 3, ramp[0]);
    px.hline(x + i, y, Math.min(3, w - i), ramp[2]);
    px.vline(x + i + 2, y + 1, 2, ramp[1]);
  }
}

function coneRoof(px: Px, cx: number, topY: number, halfBase: number, height: number, [base, dark, light]: Ramp) {
  for (let j = 0; j < height; j++) {
    const half = Math.round((j / (height - 1)) * halfBase);
    const row = (j + 1) % 3 === 0;
    for (let i = -half; i <= half; i++) {
      const t = (i + half) / (2 * half + 1);
      let c: Colour = t < 0.28 ? light : t > 0.72 ? dark : base;
      if (row && (i + j) % 4 === 0) c = dark;
      px.set(cx + i, topY + j, c);
    }
  }
}

function castle(): BuildingSprite {
  const W = 88;
  const H = 96;
  const px = new Px(W, H);
  const windows: Rect[] = [];

  // keep
  shingles(px, 24, 14, 40, 18, SLATE, 11);
  for (let j = 0; j < 4; j++) px.rect(24 + (3 - j), 10 + j, 40 - 2 * (3 - j), 1, j === 0 ? 'a' : 'N');
  px.vline(44, 2, 9, 'b');
  stone(px, 24, 32, 40, 36, 12);
  shadeWall(px, 24, 32, 40, 36, 'S');
  crenels(px, 22, 29, 44);
  archedWindow(px, 32, 40, 5, 8, windows);
  archedWindow(px, 51, 40, 5, 8, windows);
  archedWindow(px, 41, 37, 6, 9, windows);

  // flanking towers
  for (const tx of [4, 66]) {
    stone(px, tx, 36, 18, 58, 13 + tx);
    roundShade(px, tx, 36, 18, 58, 'W', 'S');
    px.rect(tx - 1, 32, 20, 4, 's');
    px.hline(tx - 1, 32, 20, 'W').hline(tx - 1, 35, 20, 'S');
    crenels(px, tx - 1, 29, 20);
    coneRoof(px, tx + 8, 9, 11, 21, SLATE);
    px.vline(tx + 8, 3, 7, 'b');
    archedWindow(px, tx + 6, 46, 5, 8, windows);
    archedWindow(px, tx + 6, 66, 5, 8, windows);
    // pennant: muted, the live flag is drawn by the renderer
  }

  // curtain wall and gate
  stone(px, 22, 62, 44, 32, 14);
  shadeWall(px, 22, 62, 44, 32, 'S');
  crenels(px, 22, 59, 44);
  px.rect(35, 70, 18, 24, 'S');
  px.rect(36, 69, 16, 1, 'S');
  px.rect(37, 71, 14, 23, 'k');
  px.rect(38, 70, 12, 1, 'k');
  for (let i = 38; i < 51; i += 3) px.vline(i, 71, 15, 'd');
  for (let j = 73; j < 86; j += 3) px.hline(37, j, 14, 'd');
  px.rect(37, 86, 14, 8, 'k');
  px.hline(36, 68, 16, 'W');
  // keystone, and the banner of a monarch nobody has met
  px.rect(42, 66, 4, 3, 'W');
  px.rect(25, 66, 7, 16, 'r').rect(56, 66, 7, 16, 'r');
  px.rect(27, 69, 3, 3, 'y').rect(58, 69, 3, 3, 'y');
  px.set(25, 81, 'k').set(31, 81, 'k').set(56, 81, 'k').set(62, 81, 'k');
  px.hline(26, 82, 5, 'r').hline(57, 82, 5, 'r');
  px.dither(22, 92, 44, 2, 'd');
  return { px: px.outline('k'), windows, smoke: [] };
}

function tower(): BuildingSprite {
  const W = 40;
  const H = 104;
  const raw = new Px(W, H);
  const windows: Rect[] = [];
  const top = 40;
  stone(raw, 8, top, 22, H - top - 1, 21, ['S', 'd', 's']);
  roundShade(raw, 8, top, 22, H - top - 1, 's', 'd');
  // scorch: a career in charcoal
  raw.dither(22, 56, 8, 8, 'k').dither(24, 52, 5, 4, 'K');
  raw.dither(10, 80, 5, 4, 'K');
  raw.rect(16, 88, 7, 13, 'b').rect(17, 87, 5, 1, 'b').hline(15, 87, 9, 's');
  raw.vline(19, 88, 13, 'B').set(21, 94, 'y');
  archedWindow(raw, 12, 60, 5, 8, windows, 's');
  archedWindow(raw, 21, 46, 5, 7, windows, 's');
  archedWindow(raw, 13, 76, 4, 6, windows, 's');

  // Observatory balcony and telescope.
  raw.rect(6, top - 2, 26, 3, 'B').hline(6, top - 2, 26, 'T');
  coneRoof(raw, 19, 6, 16, 33, PLUM);
  raw.ellipse(19, 4, 3, 3, 'y').ellipse(21, 3, 3, 3, 'k');
  raw.clear(21, 3);
  for (let i = 0; i < 9; i++) raw.rect(29 + i, 33 - (i >> 1), 2, 2, i < 4 ? 'B' : 'y');
  raw.set(38, 28, 'A');

  // The whole tower leans a little. It's in the survey.
  const px = new Px(W, H);
  for (let y = 0; y < H; y++) {
    const shift = Math.round(Math.sin((y / H) * 2.4) * 2.5) - 1;
    for (let x = 0; x < W; x++) {
      const v = raw.get(x, y);
      const tx = x + shift;
      if (v && tx >= 0 && tx < W) px.data[y * W + tx] = v;
    }
  }
  return {
    px: px.outline('k'),
    windows: windows.map((r) => ({ ...r, x: r.x + Math.round(Math.sin((r.y / H) * 2.4) * 2.5) - 1 })),
    smoke: [],
  };
}

function ministry(): BuildingSprite {
  const W = 76;
  const H = 72;
  const px = new Px(W, H);
  const windows: Rect[] = [];
  shingles(px, 4, 8, 68, 14, LEAD, 31);
  // towers of filing, bursting through the roof
  for (const [x, h] of [[10, 10], [16, 6], [58, 9], [51, 5]] as const) {
    for (let j = 0; j < h; j += 2) {
      px.hline(x + (j % 4 === 0 ? 0 : 1), 11 - j, 6, 'w');
      px.hline(x + (j % 4 === 0 ? 0 : 1), 12 - j, 6, 'S');
    }
  }
  stone(px, 4, 22, 68, 48, 32, ['W', 's', 'w']);
  shadeWall(px, 4, 22, 68, 48, 's');
  // far too many windows
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 8; col++) {
      if (col >= 3 && col <= 4 && row > 0) continue;
      window(px, 8 + col * 8 + (col > 3 ? 1 : 0), 27 + row * 13, 3, 6, windows, 'S', 's');
    }
  // portico: columns, pediment, a door much too small for its importance
  px.rect(28, 40, 20, 30, 'S');
  for (let i = 28; i < 48; i += 6) px.rect(i, 40, 3, 30, 'w').vline(i + 2, 40, 30, 's');
  px.rect(25, 36, 26, 4, 'w').hline(25, 39, 26, 's');
  for (let j = 0; j < 8; j++) px.hline(38 - j * 2, 28 + j, 1 + j * 4, j === 7 ? 'w' : 'W');
  px.rect(35, 31, 7, 3, 'y');
  px.rect(35, 60, 6, 10, 'b').vline(38, 60, 10, 'B').set(39, 65, 'y');
  px.hline(26, 68, 24, 'W').hline(24, 70, 28, 'w').hline(24, 71, 28, 's');
  return { px: px.outline('k'), windows, smoke: [] };
}

function tavern(): BuildingSprite {
  const W = 62;
  const H = 62;
  const px = new Px(W, H);
  const windows: Rect[] = [];
  shingles(px, 2, 14, 58, 24, THATCH, 41);
  for (let j = 0; j < 4; j++) px.hline(2 + 3 - j, 11 + j, 58 - 2 * (3 - j), j === 0 ? 'c' : 'T');
  // gable facing us
  for (let j = 0; j < 16; j++) px.hline(24 - j, 18 + j, 2 + j * 2 + 6, 'W');
  for (let j = 0; j < 17; j++) {
    px.rect(23 - j, 17 + j, 3, 1, 't');
    px.rect(30 + j, 17 + j, 3, 1, 't');
  }
  px.rect(19, 26, 18, 8, 'W');
  window(px, 25, 25, 6, 6, windows, 'B', 'B');

  px.rect(4, 38, 54, 22, 'W');
  shadeWall(px, 4, 38, 54, 22, 's');
  // timber frame
  for (const x of [4, 18, 38, 56]) px.rect(x, 38, 2, 22, 'B');
  px.hline(4, 38, 54, 'b').hline(4, 39, 54, 'B');
  px.hline(4, 48, 54, 'B');
  px.line(6, 48, 17, 59, 'B').line(47, 49, 40, 59, 'B');
  // door
  px.rect(23, 44, 12, 16, 'b').rect(24, 43, 10, 1, 'b');
  px.rect(24, 45, 10, 15, 'B').vline(28, 45, 15, 'b').set(32, 53, 'y');
  window(px, 8, 41, 7, 5, windows);
  window(px, 42, 41, 9, 5, windows);
  // chimney
  stone(px, 44, 3, 8, 14, 42, ['t', 'B', 'T']);
  px.rect(43, 2, 10, 2, 'S').hline(43, 2, 10, 's');
  // the sign of the Goose
  px.rect(52, 50, 5, 1, 'b').vline(53, 51, 2, 'b').rect(50, 53, 9, 7, 'B').rect(51, 54, 7, 5, 'W');
  px.rect(53, 55, 3, 2, 'w').set(52, 56, 'w').set(56, 55, 'o').set(55, 57, 'k');
  // barrels
  px.rect(2, 53, 6, 7, 't').hline(2, 55, 6, 'b').hline(2, 58, 6, 'b').vline(7, 53, 7, 'B');
  return { px: px.outline('k'), windows, smoke: [{ x: 48, y: 1 }] };
}

function stall(variant: 'A' | 'B' | 'C'): BuildingSprite {
  const W = 34;
  const H = 30;
  const px = new Px(W, H);
  const stripe: Colour = variant === 'A' ? 'R' : variant === 'B' ? 'a' : 'o';
  const stripeShade: Colour = variant === 'A' ? 'r' : variant === 'B' ? 'N' : 't';
  // counter
  px.rect(3, 18, 28, 10, 'B').hline(3, 18, 28, 'T').hline(3, 19, 28, 't');
  for (let i = 5; i < 30; i += 5) px.vline(i, 20, 8, 'b');
  // posts
  px.rect(3, 8, 2, 12, 'b').rect(29, 8, 2, 12, 'b');
  // awning
  for (let i = 0; i < 32; i++) {
    const c = (i >> 2) % 2 === 0 ? stripe : 'w';
    const shade = (i >> 2) % 2 === 0 ? stripeShade : 'W';
    px.rect(1 + i, 3, 1, 7, c);
    px.rect(1 + i, 10, 1, 1, shade);
    if (i % 4 !== 0) px.set(1 + i, 11, c);
  }
  px.hline(1, 3, 32, 'w');
  // goods
  const rng = artRng(variant.charCodeAt(0));
  const goods: Colour[][] = [['M', 'G', 'l'], ['o', 'T', 'y'], ['P', 'p', 'w']];
  const set = goods['ABC'.indexOf(variant)];
  for (let i = 5; i < 29; i += 4) {
    const c = set[Math.floor(rng() * set.length)];
    px.rect(i, 16, 3, 2, c).set(i + 1, 15, c).set(i, 16, 'w');
  }
  return { px: px.outline('k'), windows: [], smoke: [] };
}

function cottage(variant: 'A' | 'B' | 'C'): BuildingSprite {
  const W = 36;
  const H = 42;
  const px = new Px(W, H);
  const windows: Rect[] = [];
  const roof = variant === 'A' ? TILE : variant === 'B' ? THATCH : SLATE;
  shingles(px, 1, 8, 34, 16, roof, 50 + variant.charCodeAt(0));
  for (let j = 0; j < 3; j++) px.hline(1 + 2 - j, 5 + j, 34 - 2 * (2 - j), j === 0 ? roof[2] : roof[0]);
  const wall: Colour = variant === 'C' ? 's' : 'W';
  px.rect(3, 24, 30, 16, wall);
  shadeWall(px, 3, 24, 30, 16, variant === 'C' ? 'S' : 's');
  if (variant !== 'C') for (const x of [3, 31]) px.rect(x, 24, 2, 16, 'B');
  px.rect(14, 29, 8, 11, 'b').rect(15, 30, 6, 10, variant === 'B' ? 'a' : 't').set(19, 35, 'y');
  window(px, 6, 28, 4, 4, windows);
  window(px, 26, 28, 4, 4, windows);
  // flowerbox
  px.rect(5, 34, 6, 2, 'B').set(6, 33, 'R').set(8, 33, 'y').set(10, 33, 'R');
  px.rect(25, 34, 6, 2, 'B').set(26, 33, 'y').set(28, 33, 'R').set(30, 33, 'y');
  // chimney
  const cx = variant === 'B' ? 7 : 26;
  px.rect(cx, 2, 5, 8, 'S').hline(cx - 1, 1, 7, 's');
  return { px: px.outline('k'), windows, smoke: [{ x: cx + 2, y: 0 }] };
}

function clock(): BuildingSprite {
  const W = 22;
  const H = 62;
  const px = new Px(W, H);
  coneRoof(px, 10, 0, 9, 14, SLATE);
  stone(px, 3, 14, 15, 44, 61);
  roundShade(px, 3, 14, 15, 44, 'W', 'S');
  px.rect(2, 14, 17, 2, 'W').hline(2, 15, 17, 'S');
  // face; the hands are live, drawn by the renderer at (10, 24)
  px.ellipse(10, 24, 6, 6, 'y').ellipse(10, 24, 5, 5, 'w');
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) px.set(10 + dx, 24 + dy, 'S');
  px.rect(7, 46, 7, 12, 'b').vline(10, 46, 12, 'B');
  px.rect(1, 56, 19, 4, 'S').hline(1, 56, 19, 's');
  return { px: px.outline('k'), windows: [], smoke: [] };
}

function fountain(): BuildingSprite {
  const W = 36;
  const H = 30;
  const px = new Px(W, H);
  px.ellipse(18, 19, 16, 8, 'S');
  px.ellipse(18, 18, 16, 8, 's');
  px.ellipse(18, 17, 16, 7, 'W');
  px.ellipse(18, 18, 13, 5, 'a');
  px.ellipse(18, 17, 11, 4, 'A');
  px.rect(16, 7, 4, 11, 's').vline(19, 7, 11, 'S').vline(16, 7, 11, 'W');
  px.ellipse(18, 7, 5, 2, 's');
  px.ellipse(18, 6, 4, 1, 'A');
  px.rect(17, 1, 2, 5, 'S').hline(16, 1, 4, 's');
  return { px: px.outline('k'), windows: [], smoke: [] };
}

const FACTORIES: Record<BuildingArt, () => BuildingSprite> = {
  castle,
  tower,
  ministry,
  tavern,
  stallA: () => stall('A'),
  stallB: () => stall('B'),
  stallC: () => stall('C'),
  cottageA: () => cottage('A'),
  cottageB: () => cottage('B'),
  cottageC: () => cottage('C'),
  clock,
  fountain,
};

export function bakeBuilding(art: BuildingArt): BuildingSprite {
  return FACTORIES[art]();
}

// ---- smaller furniture ---------------------------------------------------

export function oak(seed: number, frame = 0): Px {
  const rng = artRng(seed);
  const px = new Px(26, 32);
  px.rect(11, 21, 4, 9, 'B').vline(14, 21, 9, 'b').vline(11, 21, 9, 't');
  px.rect(10, 29, 6, 1, 'B');
  const blobs: [number, number, number, number][] = [
    [13, 12, 10, 8],
    [7, 15, 6, 5],
    [19, 15, 6, 5],
    [13, 7, 7, 5],
  ];
  const sway = frame;
  for (const [x, y, rx, ry] of blobs) px.ellipse(x + (y < 12 ? sway : 0), y, rx, ry, 'G');
  for (const [x, y, rx, ry] of blobs) px.ellipse(x - 1 + (y < 12 ? sway : 0), y - 1, rx - 2, ry - 2, 'm');
  for (let i = 0; i < 46; i++) {
    const x = 4 + Math.floor(rng() * 18);
    const y = 2 + Math.floor(rng() * 16);
    if (px.is(x, y, 'm')) px.set(x, y, rng() < 0.5 ? 'M' : 'G');
  }
  px.ellipse(9, 7, 2, 1, 'M').ellipse(14, 4, 2, 1, 'l');
  return px.outline('k');
}

export function pine(seed: number, frame = 0): Px {
  const rng = artRng(seed);
  const px = new Px(18, 34);
  px.rect(8, 28, 3, 5, 'B').vline(10, 28, 5, 'b');
  for (let tier = 0; tier < 4; tier++) {
    const top = 2 + tier * 6;
    for (let j = 0; j < 11; j++) {
      const half = Math.min(1 + j, 2 + tier * 2);
      const shift = tier === 0 ? frame : 0;
      px.hline(9 - half + shift, top + j, half * 2 + 1, j > 8 ? 'g' : 'G');
      px.hline(9 - half + shift, top + j, 1 + (half >> 1), 'm');
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = 3 + Math.floor(rng() * 12);
    const y = 6 + Math.floor(rng() * 20);
    if (px.is(x, y, 'G')) px.set(x, y, 'g');
  }
  for (let y = 28; y < 34; y++) for (let x = 0; x < 18; x++) if (y > 27 && !px.is(x, y, 'B') && !px.is(x, y, 'b')) px.clear(x, y);
  return px.outline('k');
}

export function lamp(lit: boolean): Px {
  const px = new Px(7, 18);
  px.vline(3, 6, 11, 'K').rect(2, 16, 3, 1, 'K').vline(4, 7, 10, 'k');
  px.rect(1, 1, 5, 1, 'K').rect(2, 0, 3, 1, 'K');
  px.rect(2, 2, 3, 4, lit ? 'Y' : 'N').vline(3, 2, 4, lit ? 'w' : 'a');
  px.rect(1, 6, 5, 1, 'K');
  return px.outline('k');
}

export function bench(): Px {
  const px = new Px(16, 10);
  px.rect(1, 2, 14, 2, 't').hline(1, 2, 14, 'T');
  px.rect(1, 5, 14, 2, 't').hline(1, 5, 14, 'T').hline(1, 6, 14, 'B');
  px.rect(2, 4, 1, 5, 'b').rect(13, 4, 1, 5, 'b');
  return px.outline('k');
}

export function bush(seed: number): Px {
  const rng = artRng(seed);
  const px = new Px(14, 10);
  px.ellipse(7, 5, 5, 3, 'G').ellipse(4, 6, 3, 2, 'G').ellipse(10, 6, 3, 2, 'G');
  px.ellipse(6, 4, 3, 1, 'm');
  for (let i = 0; i < 7; i++) {
    const x = 2 + Math.floor(rng() * 10);
    const y = 2 + Math.floor(rng() * 6);
    if (px.get(x, y)) px.set(x, y, 'M');
  }
  return px.outline('k');
}

export function fenceSegment(): Px {
  const px = new Px(10, 8);
  px.hline(0, 3, 10, 't').hline(0, 5, 10, 't');
  px.rect(1, 1, 2, 7, 'T').vline(2, 1, 7, 't');
  px.rect(6, 1, 2, 7, 'T').vline(7, 1, 7, 't');
  return px;
}
