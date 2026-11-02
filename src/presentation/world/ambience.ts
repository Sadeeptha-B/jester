import { Container, Sprite, Texture, type Texture as Tex } from 'pixi.js';
import { LOCATIONS, POND, SQUARE, type Pt } from '../../narrative/content/map';
import { PALETTE, type Colour } from './art/palette';

/**
 * The small unimportant motion that makes a place feel inhabited. None of it is
 * simulated or saved: pigeons, smoke, fireflies and rain are pure decoration,
 * and may use ordinary randomness.
 */
const tint = (c: Colour) => parseInt(PALETTE[c].slice(1), 16);

interface Mote {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: 'smoke' | 'rain' | 'splash' | 'spray' | 'puff' | 'firefly' | 'butterfly' | 'spark';
  seed: number;
}

const CAP = 150;

export class Motes {
  private pool: Mote[] = [];
  readonly above = new Container();
  constructor() {
    for (let i = 0; i < CAP; i++) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.width = 1;
      sprite.height = 1;
      sprite.visible = false;
      this.above.addChild(sprite);
      this.pool.push({ sprite, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, kind: 'smoke', seed: 0 });
    }
  }

  private spawn(kind: Mote['kind'], x: number, y: number, vx: number, vy: number, life: number, c: Colour, w = 1, h = 1, alpha = 1) {
    const m = this.pool.find((p) => p.life <= 0);
    if (!m) return;
    m.kind = kind;
    m.x = x;
    m.y = y;
    m.vx = vx;
    m.vy = vy;
    m.life = m.max = life;
    m.seed = Math.random() * 100;
    m.sprite.tint = tint(c);
    m.sprite.width = w;
    m.sprite.height = h;
    m.sprite.alpha = alpha;
    m.sprite.visible = true;
  }

  smoke(x: number, y: number) {
    this.spawn('smoke', x, y, 0.8 + Math.random() * 1.5, -4 - Math.random() * 3, 4 + Math.random() * 3, Math.random() < 0.5 ? 'W' : 's', 2, 2, 0.75);
  }

  spray(x: number, y: number) {
    const a = Math.random() * Math.PI * 2;
    this.spawn('spray', x, y, Math.cos(a) * 5, -9 - Math.random() * 3, 1.1, Math.random() < 0.5 ? 'i' : 'A');
  }

  rain(x: number, y: number) {
    this.spawn('rain', x, y, -8, 150, 0.25 + Math.random() * 0.4, 'i', 1, 6, 0.85);
  }

  puff(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.spawn('puff', x, y - 1, Math.cos(a) * 12, Math.sin(a) * 5 - 2, 0.5 + Math.random() * 0.25, i % 2 ? 'W' : 's', 2, 2);
    }
  }

  flash(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 6 + Math.random() * 18;
      this.spawn('spark', x, y, Math.cos(a) * s, Math.sin(a) * s - 4, 0.8 + Math.random() * 0.7, (['y', 'Y', 'v', 'u'] as Colour[])[i % 4]);
    }
  }

  tomato(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 8 + Math.random() * 16;
      this.spawn('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5 + Math.random() * 0.4, i % 3 ? 'R' : 'r', 2, 2);
    }
  }

  drip(x: number, y: number) {
    this.spawn('spray', x, y, 0, 4, 0.5, 'A');
  }

  firefly(x: number, y: number) {
    this.spawn('firefly', x, y, 0, 0, 5 + Math.random() * 5, 'Y');
  }

  butterfly(x: number, y: number) {
    this.spawn('butterfly', x, y, 0, 0, 7 + Math.random() * 6, Math.random() < 0.5 ? 'w' : 'y', 2, 1);
  }

  sparkle(x: number, y: number) {
    this.spawn('spark', x, y, 0, 0, 0.5, 'w');
  }

  update(dt: number) {
    for (const m of this.pool) {
      if (m.life <= 0) continue;
      m.life -= dt;
      if (m.life <= 0) {
        m.sprite.visible = false;
        continue;
      }
      const t = 1 - m.life / m.max;
      switch (m.kind) {
        case 'firefly':
          m.x += Math.sin(m.seed + m.life * 1.3) * dt * 6;
          m.y += Math.cos(m.seed * 2 + m.life) * dt * 4;
          m.sprite.alpha = Math.sin(m.life * 2.2 + m.seed) > -0.2 ? 1 : 0;
          break;
        case 'butterfly':
          m.x += Math.sin(m.seed + m.life * 0.9) * dt * 14;
          m.y += Math.sin(m.seed + m.life * 4) * dt * 12;
          m.sprite.width = Math.sin(m.life * 14) > 0 ? 3 : 1;
          break;
        case 'smoke':
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.sprite.alpha = 0.7 * (1 - t);
          if (t > 0.5) {
            m.sprite.width = 3;
            m.sprite.height = 3;
          }
          break;
        case 'spray':
          m.vy += 26 * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          break;
        default:
          m.x += m.vx * dt;
          m.y += m.vy * dt;
      }
      if (m.kind === 'puff' || m.kind === 'spark') {
        m.vx *= 0.92;
        m.vy *= 0.92;
      }
      m.sprite.position.set(Math.round(m.x), Math.round(m.y));
    }
  }
}

// ---- pigeons --------------------------------------------------------------

interface Pigeon {
  sprite: Sprite;
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: 'peck' | 'walk' | 'fly' | 'perched';
  t: number;
  frame: number;
}

const PERCHES: Pt[] = [
  { x: 106, y: 0 },
  { x: 166, y: 0 },
  { x: 228, y: 34 },
  { x: 40, y: 104 },
  { x: 186, y: 42 },
  { x: 122, y: 150 },
];

function squareSpot(): Pt {
  const a = Math.random() * Math.PI * 2;
  const r = 0.45 + Math.random() * 0.45;
  return { x: SQUARE.x + Math.cos(a) * SQUARE.rx * r, y: SQUARE.y + 8 + Math.sin(a) * SQUARE.ry * r * 0.8 };
}

export class Flock {
  private birds: Pigeon[] = [];

  constructor(
    parent: Container,
    private textures: { stand: Tex; peck: Tex; fly: Tex },
  ) {
    for (let i = 0; i < 7; i++) {
      const p = squareSpot();
      const sprite = new Sprite(textures.stand);
      sprite.anchor.set(0.5, 1);
      parent.addChild(sprite);
      this.birds.push({ sprite, x: p.x, y: p.y, tx: p.x, ty: p.y, state: 'peck', t: Math.random() * 4, frame: 0 });
    }
  }

  /** `threats` are anything a pigeon might take exception to, such as feet or a Hand. */
  update(dt: number, threats: Pt[]) {
    for (const b of this.birds) {
      b.t -= dt;
      b.frame += dt;
      if (b.state !== 'fly') {
        for (const threat of threats) {
          if (Math.hypot(threat.x - b.x, (threat.y - b.y) * 1.3) < 15) {
            const perch = PERCHES[Math.floor(Math.random() * PERCHES.length)];
            b.tx = perch.x + Math.random() * 12 - 6;
            b.ty = perch.y;
            b.state = 'fly';
            break;
          }
        }
      }
      switch (b.state) {
        case 'peck':
          b.sprite.texture = Math.sin(b.frame * 5 + b.x) > 0.4 ? this.textures.peck : this.textures.stand;
          if (b.t <= 0) {
            const s = squareSpot();
            const near = Math.random() < 0.7;
            b.tx = near ? b.x + (Math.random() - 0.5) * 18 : s.x;
            b.ty = near ? b.y + (Math.random() - 0.5) * 10 : s.y;
            b.state = 'walk';
          }
          break;
        case 'walk': {
          const dx = b.tx - b.x;
          const dy = b.ty - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 1) {
            b.state = 'peck';
            b.t = 1 + Math.random() * 5;
            break;
          }
          b.x += (dx / d) * dt * 9;
          b.y += (dy / d) * dt * 9;
          b.sprite.scale.x = dx < 0 ? -1 : 1;
          b.sprite.texture = this.textures.stand;
          break;
        }
        case 'fly': {
          const dx = b.tx - b.x;
          const dy = b.ty - b.y;
          const d = Math.hypot(dx, dy);
          b.sprite.texture = Math.sin(b.frame * 22) > 0 ? this.textures.fly : this.textures.stand;
          b.sprite.scale.x = dx < 0 ? -1 : 1;
          if (d < 2) {
            b.t = 10 + Math.random() * 25;
            b.state = b.ty < 110 || b.ty === 150 ? 'perched' : 'peck';
            b.sprite.texture = this.textures.stand;
            break;
          }
          b.x += (dx / d) * dt * 62;
          b.y += (dy / d) * dt * 62;
          break;
        }
        case 'perched':
          if (b.t <= 0) {
            const s = squareSpot();
            b.tx = s.x;
            b.ty = s.y;
            b.state = 'fly';
          }
          break;
      }
      b.sprite.position.set(Math.round(b.x), Math.round(b.y));
      b.sprite.zIndex = b.state === 'fly' ? 2000 : b.state === 'perched' ? 1500 : b.y;
    }
  }
}

export const FIREFLY_SPOTS: Pt[] = [
  { x: POND.x, y: POND.y },
  LOCATIONS.woods.centre,
  LOCATIONS.gardens.centre,
];

