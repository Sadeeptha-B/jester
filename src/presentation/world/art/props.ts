import type { Colour } from './palette';
import { artRng, Px } from './px';

/** Things history leaves lying around. All sit with their base on the bottom edge. */

function cabbage(r: number, seed: number): Px {
  const rng = artRng(seed);
  const size = r * 2 + 5;
  const px = new Px(size, Math.round(size * 0.86));
  const cx = r + 2;
  const cy = px.h - Math.round(r * 0.8) - 2;
  const ry = Math.round(r * 0.8);
  px.ellipse(cx, cy, r, ry, 'G');
  px.ellipse(cx - 1, cy - 1, r - 1, Math.max(1, ry - 1), 'm');
  px.ellipse(cx - 2, cy - 2, Math.max(1, r - 3), Math.max(1, ry - 3), 'M');
  // Leaf veins curling round the head.
  const leaves = Math.max(3, Math.round(r * 0.9));
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + rng();
    for (let t = 0.15; t < 0.95; t += 0.06) {
      const x = Math.round(cx + Math.cos(a + t * 1.6) * r * t);
      const y = Math.round(cy + Math.sin(a + t * 1.6) * ry * t);
      if (px.get(x, y)) px.set(x, y, t > 0.6 ? 'G' : 'l');
    }
  }
  px.ellipse(cx - Math.round(r * 0.35), cy - Math.round(ry * 0.45), Math.max(1, r >> 2), Math.max(1, ry >> 3), 'l');
  return px.outline('k');
}

function crowned(): Px {
  const body = cabbage(13, 4);
  const px = new Px(body.w, body.h + 3);
  px.blit(body, 0, 3);
  const cx = Math.floor(body.w / 2) - 1;
  px.rect(cx - 5, 5, 11, 4, 'y').hline(cx - 5, 8, 11, 'o');
  for (const dx of [-5, 0, 5]) px.rect(cx + dx, 3, 1, 2, 'y').set(cx + dx, 2, 'Y');
  px.set(cx, 6, 'r').set(cx - 3, 6, 'u').set(cx + 3, 6, 'u');
  return px.outline('k');
}

function pot(): Px {
  const px = new Px(26, 22);
  px.ellipse(13, 13, 11, 8, 'K').ellipse(11, 11, 8, 5, 'd');
  px.rect(2, 7, 22, 3, 'k').hline(3, 7, 20, 'S');
  px.ellipse(13, 7, 9, 2, 'M');
  px.set(9, 6, 'l').set(15, 7, 'l').set(12, 6, 'w');
  px.rect(4, 19, 3, 2, 'k').rect(19, 19, 3, 2, 'k');
  return px.outline('k');
}

function shoot(): Px {
  const px = new Px(18, 15);
  px.ellipse(9, 10, 7, 4, 'G').ellipse(8, 9, 5, 2, 'm');
  px.line(9, 7, 6, 2, 'M').line(9, 7, 12, 3, 'l').line(9, 7, 9, 1, 'M');
  return px.outline('k');
}

function embassy(): Px {
  const px = new Px(30, 34);
  px.rect(6, 14, 18, 18, 'W').vline(23, 14, 18, 's');
  for (let i = 0; i < 10; i++) px.hline(15 - i, 4 + i, i * 2 + 1, i % 3 === 2 ? 'B' : 't');
  px.hline(3, 14, 24, 'b');
  for (const [x, y] of [[9, 18], [18, 18], [9, 25], [18, 25]]) {
    px.ellipse(x + 1, y + 1, 2, 2, 'k');
    px.rect(x - 1, y + 3, 6, 1, 'B');
  }
  px.vline(15, 0, 5, 'b').rect(16, 0, 7, 4, 'd').rect(17, 1, 3, 2, 'w').set(21, 1, 'S');
  px.rect(13, 27, 4, 5, 'b');
  return px.outline('k');
}

function ballot(): Px {
  const px = new Px(16, 18);
  px.rect(1, 6, 14, 11, 'B').hline(1, 6, 14, 'T').vline(14, 6, 11, 'b');
  px.rect(4, 8, 8, 1, 'k');
  px.rect(5, 2, 6, 6, 'w').hline(6, 4, 4, 'S').hline(6, 6, 4, 'S');
  px.rect(4, 11, 8, 4, 'y').rect(6, 12, 4, 2, 'r');
  return px.outline('k');
}

function stone(): Px {
  const px = new Px(18, 24);
  px.rect(3, 4, 12, 20, 's').rect(4, 2, 10, 2, 's').hline(5, 1, 8, 's');
  px.vline(14, 4, 20, 'S').vline(3, 4, 20, 'W');
  for (let y = 7; y < 18; y += 3) px.hline(5, y, 8, 'S');
  px.rect(1, 22, 16, 2, 'S');
  return px.outline('k');
}

function monument(): Px {
  const px = new Px(16, 40);
  for (let y = 0; y < 34; y++) {
    const half = Math.min(6, 1 + (y >> 2));
    px.hline(8 - half, y, half * 2, 'K');
    px.hline(8 - half, y, Math.max(1, half - 1), 'p');
  }
  px.rect(1, 34, 14, 5, 'S').hline(1, 34, 14, 's');
  px.rect(5, 18, 6, 3, 'y');
  return px.outline('k');
}

function artifact(): Px {
  const px = new Px(16, 22);
  px.rect(3, 17, 10, 4, 'S').hline(3, 17, 10, 's');
  px.ellipse(8, 9, 5, 7, 'v');
  px.ellipse(7, 8, 3, 5, 'u');
  px.ellipse(6, 6, 1, 2, 'i');
  px.set(10, 12, 'Y').set(5, 13, 'Y');
  return px.outline('k');
}

function handStatue(): Px {
  const px = new Px(22, 38);
  px.rect(4, 30, 14, 7, 'S').hline(4, 30, 14, 's').vline(17, 30, 7, 'd');
  const hand = ['..s.ss.s..', '..s.ss.s..', '..s.ss.s.s', '.ss.ss.s.s', '.ss.ss.sss', '.sssssssss', 's.ssssssss', 'ssssssssss', '.ssssssss.', '.ssssssss.', '..ssssss..', '..ssssss..', '..WWWWWW..'];
  const art = Px.fromGrid(hand);
  px.blit(art, 6, 2);
  px.rect(8, 15, 6, 15, 's').vline(13, 15, 15, 'S').vline(8, 15, 15, 'W');
  return px.outline('k');
}

function chair(): Px {
  const px = new Px(14, 20);
  px.rect(3, 1, 8, 2, 't').rect(3, 1, 2, 10, 't').rect(9, 1, 2, 10, 't').rect(3, 6, 8, 1, 'B');
  px.rect(2, 10, 10, 2, 'T').hline(2, 11, 10, 'B');
  px.rect(3, 12, 1, 7, 'b').rect(10, 12, 1, 7, 'b');
  px.set(5, 9, 'R').set(8, 9, 'y').set(6, 9, 'w');
  return px.outline('k');
}

function gull(): Px {
  return Px.fromGrid([
    '......www.',
    '.....wwkwo',
    'K....wwwo.',
    'SSwwwwww..',
    '.Swwwwww..',
    '..WWwww...',
    '...o.o....',
  ]).outline('k');
}

function bunting(): Px {
  const W = 104;
  const px = new Px(W, 22);
  const colours: Colour[] = ['r', 'y', 'u', 'w'];
  for (let x = 0; x < W; x++) {
    const t = x / (W - 1);
    const y = Math.round(2 + Math.sin(t * Math.PI) * 10);
    px.set(x, y, 'K');
    if (x % 8 === 3) {
      const c = colours[((x / 8) | 0) % colours.length];
      for (let j = 1; j < 6; j++) px.hline(x - Math.max(0, 3 - (j >> 1)) + 1, y + j, Math.max(1, 6 - j), c);
    }
  }
  return px;
}

export function umbrella(c: Colour, shade: Colour): Px {
  const px = new Px(15, 9);
  px.ellipse(7, 4, 6, 3, c);
  for (let y = 5; y < 9; y++) for (let x = 0; x < 15; x++) px.clear(x, y);
  for (let x = 2; x < 13; x += 4) px.vline(x, 2, 3, shade);
  px.vline(7, 5, 4, 'b');
  return px.outline('k');
}

const FACTORIES: Record<string, () => Px> = {
  cabbage_small: () => cabbage(4, 1),
  cabbage: () => cabbage(8, 2),
  cabbage_2: () => cabbage(11, 3),
  cabbage_3: () => cabbage(14, 4),
  cabbage_crowned: crowned,
  pot,
  cabbage_shoot: shoot,
  cabbage_shoot_2: () => cabbage(7, 6),
  embassy,
  ballot,
  stone,
  monument,
  artifact,
  hand_statue: handStatue,
  chair,
  gull,
  bunting,
};

export const PROP_ARTS = Object.keys(FACTORIES);

export function bakeProp(art: string, size?: number): Px {
  const key = size && size > 1 && FACTORIES[`${art}_${size}`] ? `${art}_${size}` : art;
  return FACTORIES[key]();
}
