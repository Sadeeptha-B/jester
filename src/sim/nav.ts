import { CELL, GRID_H, GRID_W, onSlab, POND, ROADS, SLAB_H, SLAB_W, SQUARE, STRUCTURES, TREES, type Pt } from '../narrative/content/map';

/** Cost of stepping into a cell; 0 means it cannot be walked. Roads are cheap, so paths use them. */
const cost = new Float32Array(GRID_W * GRID_H);

const idx = (cx: number, cy: number) => cy * GRID_W + cx;

function roadDistance(x: number, y: number): number {
  let best = Infinity;
  for (const road of ROADS) {
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const [ax, ay] = road.pts[i];
      const [bx, by] = road.pts[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) - road.width);
    }
  }
  return best;
}

for (let cy = 0; cy < GRID_H; cy++)
  for (let cx = 0; cx < GRID_W; cx++) {
    const x = (cx + 0.5) * CELL;
    const y = (cy + 0.5) * CELL;
    let c = 1.7;
    if (!onSlab(x * 0.96 + 5.4, y * 0.95 + 5.8)) c = 0;
    if (roadDistance(x, y) < 3 || Math.hypot((x - SQUARE.x) / SQUARE.rx, (y - SQUARE.y) / SQUARE.ry) < 1) c = c && 1;
    if (Math.hypot((x - POND.x) / (POND.rx + 2), (y - POND.y) / (POND.ry + 2)) < 1) c = 0;
    for (const s of STRUCTURES) {
      const f = s.foot;
      if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) c = 0;
    }
    for (const t of TREES) if (Math.abs(x - t.x) < 4 && Math.abs(y - t.y + 1) < 4) c = 0;
    cost[idx(cx, cy)] = c;
  }

export function walkable(x: number, y: number): boolean {
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return false;
  return cost[idx(cx, cy)] > 0;
}

/** The closest walkable cell, searched in rings. Dropped citizens land here. */
export function nearestWalkable(px: number, py: number): Pt {
  // Citizens can be let go of anywhere, including over the curtains.
  const x = Math.max(0, Math.min(SLAB_W - 1, px));
  const y = Math.max(0, Math.min(SLAB_H - 1, py));
  if (walkable(x, y)) return { x, y };
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  for (let r = 1; r < Math.max(GRID_W, GRID_H); r++) {
    let best: Pt | null = null;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const wx = (cx + dx + 0.5) * CELL;
        const wy = (cy + dy + 0.5) * CELL;
        if (!walkable(wx, wy)) continue;
        const d = Math.hypot(wx - x, wy - y);
        if (d < bestD) {
          bestD = d;
          best = { x: wx, y: wy };
        }
      }
    if (best) return best;
  }
  return { x, y };
}

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.41],
  [1, -1, 1.41],
  [-1, 1, 1.41],
  [-1, -1, 1.41],
];

/** A* over the cell grid. Returns waypoints ending at `to`, or [] if already there. */
export function findPath(from: Pt, to: Pt): Pt[] {
  const start = nearestWalkable(from.x, from.y);
  const goal = nearestWalkable(to.x, to.y);
  const sx = Math.floor(start.x / CELL);
  const sy = Math.floor(start.y / CELL);
  const gx = Math.floor(goal.x / CELL);
  const gy = Math.floor(goal.y / CELL);
  if (sx === gx && sy === gy) return [goal];

  const size = GRID_W * GRID_H;
  const g = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open: number[] = [idx(sx, sy)];
  const f = new Float32Array(size).fill(Infinity);
  g[idx(sx, sy)] = 0;
  f[idx(sx, sy)] = Math.hypot(gx - sx, gy - sy);

  while (open.length) {
    let bestI = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bestI]]) bestI = i;
    const cur = open[bestI];
    open[bestI] = open[open.length - 1];
    open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % GRID_W;
    const cy = (cur / GRID_W) | 0;
    if (cx === gx && cy === gy) break;
    for (const [dx, dy, len] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
      const n = idx(nx, ny);
      const step = cost[n];
      if (!step || closed[n]) continue;
      // No squeezing diagonally past a corner.
      if (dx && dy && (!cost[idx(cx + dx, cy)] || !cost[idx(cx, cy + dy)])) continue;
      const tentative = g[cur] + step * len;
      if (tentative < g[n]) {
        g[n] = tentative;
        came[n] = cur;
        f[n] = tentative + Math.hypot(gx - nx, gy - ny);
        open.push(n);
      }
    }
  }

  const goalI = idx(gx, gy);
  if (came[goalI] === -1) return [];
  const cells: number[] = [];
  for (let c = goalI; c !== -1; c = came[c]) cells.push(c);
  cells.reverse();

  const pts: Pt[] = [];
  for (let i = 1; i < cells.length - 1; i++) {
    // Keep only the turns; straight runs make for smoother walking.
    const [a, b, c] = [cells[i - 1], cells[i], cells[i + 1]];
    if (b - a === c - b) continue;
    pts.push({ x: ((b % GRID_W) + 0.5) * CELL, y: (((b / GRID_W) | 0) + 0.5) * CELL });
  }
  pts.push(goal);
  return pts;
}
