import { ALLOTMENT, onSlab, POND, ROADS, SLAB_H, SLAB_W, SQUARE, STRUCTURES } from '../../../narrative/content/map';
import type { Colour } from './palette';
import { artRng, Px } from './px';

export const SOIL_DEPTH = 18;
const MARGIN = 2;

/** Slab coordinates are offset by this inside the baked terrain texture. */
export const TERRAIN_MARGIN = MARGIN;

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(x: number, y: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const b = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return a + (b - a) * sy;
}

function fbm(x: number, y: number): number {
  return smooth(x, y, 22) * 0.6 + smooth(x, y, 9) * 0.3 + smooth(x, y, 4) * 0.1;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roadAt(x: number, y: number): { d: number; cobble: boolean } | null {
  let best: { d: number; cobble: boolean } | null = null;
  for (const road of ROADS) {
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const [ax, ay] = road.pts[i];
      const [bx, by] = road.pts[i + 1];
      const d = segDist(x, y, ax, ay, bx, by) - road.width;
      if (!best || d < best.d) best = { d, cobble: road.cobble };
    }
  }
  return best;
}

function cobble(x: number, y: number): Colour {
  const row = Math.floor(y / 3);
  const cx = x + (row % 2) * 2;
  const seam = y % 3 === 2 || cx % 4 === 3;
  if (seam) return 'S';
  return hash(Math.floor(cx / 4), row) < 0.3 ? 'W' : 's';
}

function flagstone(x: number, y: number): Colour {
  // Concentric courses, which reads as a proper civic square rather than a car park.
  const dx = (x - SQUARE.x) / SQUARE.rx;
  const dy = (y - SQUARE.y) / SQUARE.ry;
  const r = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx);
  const ring = Math.floor(r * 7);
  const seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * (10 + ring * 7) + ring * 0.5);
  const ringEdge = (r * 7) % 1 < 0.14;
  const segEdge = (((a + Math.PI) / (2 * Math.PI)) * (10 + ring * 7) + ring * 0.5) % 1 < 0.1;
  if (ringEdge || segEdge) return 'S';
  const v = hash(ring, seg);
  return v < 0.22 ? 'W' : v > 0.86 ? 'T' : 's';
}

/** The whole ground of Elsewhere: grass, roads, square, pond, soil edge. */
export function bakeTerrain(): Px {
  const W = SLAB_W + MARGIN * 2;
  const H = SLAB_H + MARGIN * 2 + SOIL_DEPTH;
  const px = new Px(W, H);
  const rng = artRng(7);

  for (let y = 0; y < SLAB_H; y++)
    for (let x = 0; x < SLAB_W; x++) {
      const wobble = (smooth(x, y, 7) - 0.5) * 0.05;
      const nx = Math.abs(x - SLAB_W / 2) / (SLAB_W / 2);
      const ny = Math.abs(y - SLAB_H / 2) / (SLAB_H / 2);
      if (nx ** 4 + ny ** 4 + wobble >= 1) continue;
      px.set(x + MARGIN, y + MARGIN, groundAt(x, y));
    }

  scatterDetail(px, rng);
  baseShadows(px);
  allotment(px);
  soilFace(px, rng);
  return px;
}

function groundAt(x: number, y: number): Colour {
  // pond
  const pd = Math.hypot((x - POND.x) / POND.rx, (y - POND.y) / POND.ry);
  if (pd < 1) return pd > 0.86 ? 'A' : pd < 0.45 ? 'N' : pd < 0.62 ? (hash(x, y) < 0.5 ? 'N' : 'a') : 'a';
  if (pd < 1.12) return hash(x, y) < 0.6 ? 's' : 'W';

  // the square
  const sd = Math.hypot((x - SQUARE.x) / SQUARE.rx, (y - SQUARE.y) / SQUARE.ry);
  if (sd < 1) return sd > 0.97 ? 'S' : flagstone(x, y);

  // roads, with a scuffed border
  const road = roadAt(x, y);
  if (road) {
    const edge = road.d + (smooth(x, y, 4) - 0.5) * 3;
    if (edge < 0) return road.cobble ? cobble(x, y) : edge > -1.2 ? 't' : (hash(x, y) < 0.15 ? 't' : 'T');
    if (edge < 1.6 && (x + y) % 2 === 0) return road.cobble ? 'T' : 't';
  }

  // grass, in soft drifts
  const n = fbm(x, y);
  const dither = ((x + y) & 1) * 0.022;
  if (n + dither > 0.6) return 'M';
  if (n + dither < 0.4) return 'G' === 'G' && hash(x, y) < 0.5 ? 'G' : 'm';
  return 'm';
}

function scatterDetail(px: Px, rng: () => number) {
  const grassy = (x: number, y: number) => px.is(x, y, 'm') || px.is(x, y, 'M');
  // tufts
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(rng() * px.w);
    const y = Math.floor(rng() * px.h);
    if (!grassy(x, y) || !grassy(x + 1, y)) continue;
    const c: Colour = px.is(x, y, 'M') ? 'l' : 'M';
    px.set(x, y, c).set(x + 1, y - 1, c).set(x + 2, y, c);
  }
  // little flowers, in clusters
  for (let i = 0; i < 60; i++) {
    const cx = Math.floor(rng() * px.w);
    const cy = Math.floor(rng() * px.h);
    const c: Colour = (['w', 'y', 'P', 'R'] as Colour[])[Math.floor(rng() * 4)];
    for (let k = 0; k < 5; k++) {
      const x = cx + Math.floor(rng() * 9) - 4;
      const y = cy + Math.floor(rng() * 7) - 3;
      if (grassy(x, y)) px.set(x, y, c);
    }
  }
}

function baseShadows(px: Px) {
  // Contact shadow under each structure, offset down and right.
  for (const s of STRUCTURES) {
    const { x, y, w, h } = s.foot;
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < w + 3; i++) {
        const sx = x + i + MARGIN;
        const sy = y + h + j + MARGIN;
        if (j < 2 || (sx + sy) % 2 === 0) shadow(px, sx, sy);
      }
  }
}

const SHADE: Partial<Record<Colour, Colour>> = { m: 'G', M: 'm', l: 'M', G: 'g', s: 'S', W: 's', S: 'd', T: 't', t: 'B', y: 'o', w: 'W', R: 'r', P: 'p' };

function shadow(px: Px, x: number, y: number) {
  for (const key of Object.keys(SHADE) as Colour[]) {
    if (px.is(x, y, key)) {
      px.set(x, y, SHADE[key]!);
      return;
    }
  }
}

function allotment(px: Px) {
  const { x, y, w, h } = ALLOTMENT;
  const X = x + MARGIN;
  const Y = y + MARGIN;
  px.rect(X, Y, w, h, 'B');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const row = j % 6;
      if (row === 0 || row === 5) px.set(X + i, Y + j, 'b');
      else if (row === 1) px.set(X + i, Y + j, 't');
      else if ((i + j) % 2 === 0) px.set(X + i, Y + j, 't');
    }
  }
  // Lady Turnip's troops, drawn up in ranks.
  for (let row = 0; row * 6 + 3 < h; row++) {
    for (let i = 3 + (row % 2) * 2; i < w - 2; i += 5) {
      const cx = X + i;
      const cy = Y + row * 6 + 3;
      px.set(cx, cy, 'w').set(cx + 1, cy, 'P');
      px.set(cx, cy - 1, 'M').set(cx + 1, cy - 2, 'l').set(cx - 1, cy - 2, 'M').set(cx, cy - 2, 'l');
    }
  }
}

function soilFace(px: Px, rng: () => number) {
  const W = px.w;
  const H = px.h;
  // Find the bottom edge of the slab in each column and hang the cross-section from it.
  for (let x = 0; x < W; x++) {
    let bottom = -1;
    for (let y = H - 1; y >= 0; y--) {
      if (px.get(x, y)) {
        bottom = y;
        break;
      }
    }
    if (bottom < 0) continue;
    const curve = (x - W / 2) / (W / 2);
    const depth = Math.round((SOIL_DEPTH - 3) * Math.sqrt(Math.max(0, 1 - curve ** 6))) + Math.round(smooth(x, 3, 5) * 3);
    px.set(x, bottom + 1, 'l').set(x, bottom + 2, 'M');
    for (let j = 3; j < depth; j++) {
      const t = j / depth;
      let c: Colour = t < 0.28 ? 't' : t < 0.6 ? 'B' : 'b';
      if ((t > 0.2 && t < 0.34) || (t > 0.54 && t < 0.66)) if ((x + j) % 2 === 0) c = t < 0.4 ? 'B' : 'b';
      if (t > 0.86 && (x + j) % 2 === 0) c = 'K';
      px.set(x, bottom + j, c);
    }
    px.set(x, bottom + depth, 'k');
  }
  // stones and roots
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rng() * W);
    let bottom = -1;
    for (let y = H - SOIL_DEPTH - 1; y >= 0; y--) if (px.get(x, y)) { bottom = y; break; }
    if (bottom < 0) continue;
    const y = bottom + 5 + Math.floor(rng() * 8);
    if (!px.get(x, y)) continue;
    px.rect(x, y, 3, 2, 'S').hline(x, y, 3, 's').set(x + 2, y + 1, 'd');
  }
  for (let i = 0; i < 12; i++) {
    let x = Math.floor(rng() * W);
    let bottom = -1;
    for (let y = H - SOIL_DEPTH; y >= 0; y--) if (px.get(x, y)) { bottom = y; break; }
    if (bottom < 0) continue;
    let y = bottom + 3;
    const len = 8 + Math.floor(rng() * 10);
    for (let k = 0; k < len; k++) {
      if (px.get(x, y)) px.set(x, y, 'T');
      y += 1;
      x += rng() < 0.5 ? (rng() < 0.5 ? 1 : -1) : 0;
    }
  }
}

/** Used by the Prop Room and tests to confirm the walkable outline matches the art. */
export function terrainContains(x: number, y: number): boolean {
  return onSlab(x, y);
}
