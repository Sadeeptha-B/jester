import type { Colour } from './palette';
import { artRng, Px } from './px';

/** The set around the slab: painted sky, flats, boards, curtains. Sized to the window. */

type Band = [stop: number, colour: Colour];

function bandedSky(w: number, h: number, bands: Band[]): Px {
  const px = new Px(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    let i = 0;
    while (i < bands.length - 2 && t > bands[i + 1][0]) i++;
    const [a, ca] = bands[i];
    const [b, cb] = bands[i + 1];
    const f = Math.min(1, Math.max(0, (t - a) / (b - a)));
    for (let x = 0; x < w; x++) {
      // Ordered dither through the middle of each band.
      const bayer = [0, 2, 3, 1][(x & 1) + ((y & 1) << 1)] / 4;
      px.set(x, y, f > 0.25 + bayer * 0.5 ? cb : ca);
    }
  }
  return px;
}

export function daySky(w: number, h: number): Px {
  return bandedSky(w, h, [[0, 'a'], [0.3, 'A'], [0.62, 'i'], [1, 'W']]);
}

export function duskSky(w: number, h: number): Px {
  return bandedSky(w, h, [[0, 'K'], [0.22, 'p'], [0.44, 'P'], [0.66, 'T'], [1, 'Y']]);
}

export function nightSky(w: number, h: number): Px {
  const px = bandedSky(w, h, [[0, 'k'], [0.4, 'K'], [0.8, 'n'], [1, 'N']]);
  const rng = artRng(99);
  for (let i = 0; i < w * h * 0.004; i++) {
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h * 0.7);
    px.set(x, y, rng() < 0.2 ? 'Y' : 'i');
    if (rng() < 0.08) px.set(x + 1, y, 'P').set(x - 1, y, 'P').set(x, y + 1, 'P').set(x, y - 1, 'P');
  }
  return px;
}

/** Scenic flats: rolling hills cut from board and propped up behind the slab. */
export function hillFlat(w: number, h: number, seed: number, fill: Colour, rim: Colour, shade: Colour): Px {
  const px = new Px(w, h);
  const rng = artRng(seed * 17 + 3);
  const ridge = (x: number) => Math.round(14 + Math.sin(x / 47 + seed * 2.1) * 9 + Math.sin(x / 19 + seed) * 4 + Math.sin(x / 8 + seed * 3) * 1.2);
  for (let x = 0; x < w; x++) {
    const top = ridge(x);
    for (let y = top; y < h; y++) {
      const brush = Math.sin(x / 13 + y / 5 + seed) > 0.72 && (x + y) % 2 === 0;
      px.set(x, y, y === top ? rim : y - top < 3 && (x + y) % 2 === 0 ? rim : brush ? shade : fill);
    }
  }
  // Painted trees, the kind that are only ever seen from the stalls.
  for (let x = 6; x < w; x += 9 + Math.floor(rng() * 26)) {
    const y = ridge(x);
    const size = 3 + Math.floor(rng() * 3);
    px.ellipse(x, y - size + 1, size, size, shade);
    px.ellipse(x - 1, y - size, Math.max(1, size - 2), Math.max(1, size - 2), fill);
  }
  return px;
}

export function cloud(variant: number): Px {
  const px = new Px(40, 18);
  const puffs: [number, number, number, number][][] = [
    [[12, 11, 8, 5], [22, 8, 9, 6], [31, 12, 6, 4]],
    [[10, 12, 7, 4], [20, 10, 7, 5], [29, 11, 8, 5]],
    [[14, 10, 10, 5], [27, 12, 7, 4]],
  ];
  const shape = puffs[variant % puffs.length];
  for (const [x, y, rx, ry] of shape) px.ellipse(x, y, rx, ry, 'W');
  for (const [x, y, rx, ry] of shape) px.ellipse(x - 1, y - 1, rx - 1, Math.max(1, ry - 2), 'w');
  return px.outline('K');
}

export function sunDisc(): Px {
  const px = new Px(25, 25);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = i % 2 ? 11 : 12;
    px.line(12 + Math.round(Math.cos(a) * 7), 12 + Math.round(Math.sin(a) * 7), 12 + Math.round(Math.cos(a) * r), 12 + Math.round(Math.sin(a) * r), 'o');
  }
  px.ellipse(12, 12, 7, 7, 'y').ellipse(11, 11, 5, 5, 'Y');
  // A painted, slightly smug face. It is a prop, after all.
  px.set(9, 11, 'o').set(14, 11, 'o').hline(10, 15, 4, 'o').set(9, 14, 'o').set(14, 14, 'o');
  return px.outline('b');
}

export function moonDisc(): Px {
  const px = new Px(19, 19);
  px.ellipse(9, 9, 7, 7, 'w');
  for (let y = 0; y < 19; y++) for (let x = 0; x < 19; x++) if ((x - 13) ** 2 + (y - 7) ** 2 < 36) px.clear(x, y);
  px.set(4, 7, 'W').set(5, 11, 'W').set(7, 14, 'W').set(5, 8, 'W');
  px.set(6, 8, 'k');
  return px.outline('S');
}

export function stageBoards(w: number, h: number): Px {
  const px = new Px(w, h);
  const rng = artRng(5);
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / 7);
    const seam = y % 7 === 6;
    for (let x = 0; x < w; x++) {
      if (seam) {
        px.set(x, y, 'b');
        continue;
      }
      const offset = (row * 37) % 60;
      const joint = (x + offset) % 60 === 0;
      px.set(x, y, joint ? 'b' : y % 7 === 0 ? 't' : 'B');
    }
  }
  for (let i = 0; i < (w * h) / 40; i++) {
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    if (px.is(x, y, 'B')) px.hline(x, y, 2 + Math.floor(rng() * 5), rng() < 0.5 ? 'b' : 't');
  }
  // Edge of the stage: a brass lip, then darkness.
  px.hline(0, h - 2, w, 's').hline(0, h - 1, w, 'k');
  return px;
}

export function footlight(lit: boolean): Px {
  const px = new Px(11, 7);
  px.rect(2, 1, 7, 2, lit ? 'Y' : 'S').hline(3, 0, 5, lit ? 'w' : 's');
  px.rect(1, 3, 9, 3, 'o').hline(1, 5, 9, 't').hline(0, 3, 11, 'y');
  return px.outline('b');
}

/** Heavy velvet: folds of uneven width that wander as they fall. `t` is 0–1 across a fold. */
function velvet(u: number, y: number): Colour {
  const wander = Math.sin(y / 41 + u / 29) * 2.4 + Math.sin(y / 17 + u / 13) * 0.7;
  const s = u + wander;
  const period = 21;
  const uneven = s + Math.sin(s / 11) * 3.5;
  const t = ((uneven % period) + period) % period / period;
  const check = (Math.round(u) + y) % 2 === 0;
  if (t < 0.09) return 'b';
  if (t < 0.17) return check ? 'b' : 'r';
  if (t > 0.42 && t < 0.5) return 'R';
  if (t > 0.5 && t < 0.56) return check ? 'R' : 'r';
  if (t > 0.92) return check ? 'b' : 'r';
  return 'r';
}

function folds(px: Px, x: number, w: number, top: number, h: number, phase: number) {
  for (let i = 0; i < w; i++) for (let y = top; y < top + h; y++) px.set(x + i, y, velvet(i + phase, y));
}

/** One half of the main curtain. `side` -1 is the left half, its open edge to the right. */
export function curtainPanel(w: number, h: number, side: -1 | 1): Px {
  const px = new Px(w, h);
  folds(px, 0, w, 0, h - 5, side < 0 ? 0 : 5);
  px.rect(0, h - 5, w, 3, 'y').hline(0, h - 5, w, 'Y');
  for (let x = 0; x < w; x += 3) px.rect(x, h - 2, 2, 2, 'o');
  const edge = side < 0 ? w - 1 : 0;
  px.rect(edge - (side < 0 ? 1 : 0), 0, 2, h - 5, 'y');
  return px;
}

/** The fixed drapes that stay either side of the proscenium. */
export function sideDrape(w: number, h: number, side: -1 | 1): Px {
  const px = new Px(w, h);
  for (let y = 0; y < h; y++) {
    // Gathered in at about two thirds height by a tie.
    const pinch = Math.exp(-(((y / h - 0.62) * 7) ** 2));
    const width = Math.round(w * (1 - 0.42 * pinch));
    for (let i = 0; i < width; i++) {
      const x = side < 0 ? i : w - 1 - i;
      // Folds bunch towards the tie, so stretch the cloth by the pinch.
      px.set(x, y, velvet(i * (1 + 0.7 * pinch) + 5, y));
    }
    px.set(side < 0 ? width : w - 1 - width, y, 'k');
  }
  const tieY = Math.round(h * 0.62);
  const tieW = Math.round(w * 0.58);
  px.rect(side < 0 ? 0 : w - tieW, tieY, tieW, 3, 'y').hline(side < 0 ? 0 : w - tieW, tieY, tieW, 'Y');
  return px;
}

export function valance(w: number): Px {
  const H = 20;
  const px = new Px(w, H);
  px.rect(0, 0, w, 9, 'r').dither(0, 7, w, 2, 'K').hline(0, 0, w, 'R');
  const swag = 36;
  const count = Math.max(1, Math.round(w / swag));
  const span = w / count;
  for (let x = 0; x < w; x++) {
    const u = ((x % span) + span) % span;
    const t = u / span;
    const depth = Math.round(Math.sin(t * Math.PI) * 9);
    for (let y = 9; y < 10 + depth; y++) px.set(x, y, Math.abs(t - 0.5) * 2 + (y - 9) * 0.06 > 0.72 ? 'K' : y % 3 === 0 ? 'R' : 'r');
    px.set(x, 10 + depth, 'y');
    if (x % 3) px.set(x, 11 + depth, 'o');
  }
  for (let i = 0; i <= count; i++) {
    const x = Math.round(i * span);
    px.rect(x - 2, 6, 4, 6, 'y').vline(x - 2, 6, 6, 'Y');
  }
  return px;
}
