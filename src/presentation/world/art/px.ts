import { INDEX, RGB, type Colour } from './palette';

/** A small seeded generator for art. Keeps baked textures identical between runs. */
export function artRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An indexed-colour drawing surface. All kingdom art is drawn into one of these
 * and baked to a canvas, so nothing can stray outside the palette.
 */
export class Px {
  readonly data: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h);
  }

  /** Parse a sprite grid. `.` and space are transparent; `roles` remaps characters. */
  static fromGrid(rows: readonly string[], roles: Record<string, string> = {}): Px {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const px = new Px(w, h);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const mapped = roles[ch] ?? ch;
        if (mapped === '.') continue;
        const idx = INDEX[mapped];
        if (idx === undefined) throw new Error(`Unknown colour "${ch}" in sprite grid`);
        px.data[y * w + x] = idx;
      }
    });
    return px;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }

  is(x: number, y: number, c: Colour): boolean {
    return this.get(x, y) === INDEX[c];
  }

  set(x: number, y: number, c: Colour): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = INDEX[c];
    return this;
  }

  clear(x: number, y: number): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = 0;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Colour): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }

  hline(x: number, y: number, w: number, c: Colour): this {
    return this.rect(x, y, w, 1, c);
  }

  vline(x: number, y: number, h: number, c: Colour): this {
    return this.rect(x, y, 1, h, c);
  }

  /** Checkerboard of `a` over a region; the classic pixel-art shading transition. */
  dither(x: number, y: number, w: number, h: number, a: Colour, phase = 0): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if ((i + j + phase) % 2 === 0) this.set(i, j, a);
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Colour): this {
    let [x, y] = [x0, y0];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Colour): this {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25) <= 1) this.set(cx + x, cy + y, c);
    return this;
  }

  /** Copy opaque pixels of `src` onto this surface, optionally mirrored. */
  blit(src: Px, x: number, y: number, flip = false): this {
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const v = src.data[j * src.w + (flip ? src.w - 1 - i : i)];
        const tx = x + i;
        const ty = y + j;
        if (v && tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.data[ty * this.w + tx] = v;
      }
    return this;
  }

  /** Grow a one-pixel outline around the opaque silhouette. */
  outline(c: Colour = 'k'): this {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))
          add.push(y * this.w + x);
      }
    const idx = INDEX[c];
    for (const i of add) this.data[i] = idx;
    return this;
  }

  /** Replace colours inside a region by a map, leaving others alone. */
  recolour(map: Partial<Record<Colour, Colour>>, x = 0, y = 0, w = this.w, h = this.h): this {
    const lookup = new Map<number, number>();
    for (const [from, to] of Object.entries(map)) lookup.set(INDEX[from], INDEX[to as Colour]);
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) {
        const v = this.get(i, j);
        const m = lookup.get(v);
        if (m !== undefined) this.data[j * this.w + i] = m;
      }
    return this;
  }

  clone(): Px {
    const out = new Px(this.w, this.h);
    out.data.set(this.data);
    return out;
  }

  /** RGBA bytes, usable from Node tests as well as the browser. */
  toRGBA(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.data.length; i++) {
      const v = this.data[i];
      if (!v) continue;
      const [r, g, b] = RGB[v];
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
    return out;
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d')!;
    const img = new ImageData(this.toRGBA() as Uint8ClampedArray<ArrayBuffer>, this.w, this.h);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}
