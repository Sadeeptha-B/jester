import { Rectangle, Texture } from 'pixi.js';
import { CITIZEN_BY_ID } from '../../narrative/content/citizens';
import { LOOKS } from '../../narrative/content/looks';
import type { Facing } from '../../sim/types';
import { CHICKEN, citizenFrame, FRAME_H, FRAME_W, GERALD_HAT, PIGEON, type Pose } from './art/figures';
import { Px } from './art/px';

export function textureOf(px: Px): Texture {
  const tex = Texture.from(px.toCanvas());
  tex.source.scaleMode = 'nearest';
  return tex;
}

const FACINGS: Facing[] = ['front', 'back', 'side'];
const POSES: Pose[] = ['stand', 'walk1', 'walk3', 'dangle1', 'dangle2', 'sit', 'flat'];

export interface Sheet {
  frame(facing: Facing, pose: Pose): Texture;
}

function humanSheet(id: string): Sheet {
  const sheet = new Px(FRAME_W * POSES.length, FRAME_H * FACINGS.length);
  FACINGS.forEach((f, row) =>
    POSES.forEach((p, col) => sheet.blit(citizenFrame(LOOKS[id], f, p), col * FRAME_W, row * FRAME_H)),
  );
  const base = textureOf(sheet);
  const frames = new Map<string, Texture>();
  FACINGS.forEach((f, row) =>
    POSES.forEach((p, col) =>
      frames.set(`${f}/${p}`, new Texture({ source: base.source, frame: new Rectangle(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H) })),
    ),
  );
  return { frame: (f, p) => frames.get(`${f}/${p === 'walk2' ? 'stand' : p}`)! };
}

function animalSheet(id: string, kind: 'chicken' | 'pigeon'): Sheet {
  const art = (grid: string[]) => {
    const raw = Px.fromGrid(grid);
    const framed = new Px(FRAME_W, FRAME_H);
    framed.blit(raw, kind === 'chicken' ? 0 : 3, FRAME_H - raw.h - 1);
    if (id === 'gerald') {
      // Gerald's bearing is such that he is always found wearing something.
      framed.blit(Px.fromGrid(GERALD_HAT), 7, FRAME_H - raw.h - 1);
    }
    return textureOf(framed.outline('k'));
  };
  const stand = art(kind === 'chicken' ? CHICKEN.stand : PIGEON.stand);
  const step = art(kind === 'chicken' ? CHICKEN.step : PIGEON.peck);
  const up = kind === 'pigeon' ? art(PIGEON.fly) : step;
  return {
    frame: (_f, p) => (p === 'walk1' || p === 'walk3' ? step : p.startsWith('dangle') ? up : stand),
  };
}

const sheets = new Map<string, Sheet>();

export function sheetFor(id: string): Sheet {
  let sheet = sheets.get(id);
  if (!sheet) {
    const animal = CITIZEN_BY_ID[id].animal;
    sheet = animal ? animalSheet(id, animal) : humanSheet(id);
    sheets.set(id, sheet);
  }
  return sheet;
}

/** A front-facing portrait for inspection cards, scaled by CSS. */
export function portraitCanvas(id: string): HTMLCanvasElement {
  const animal = CITIZEN_BY_ID[id].animal;
  if (animal) {
    const raw = Px.fromGrid(animal === 'chicken' ? CHICKEN.stand : PIGEON.stand).outline('k');
    const framed = new Px(FRAME_W, FRAME_H);
    framed.blit(raw, animal === 'chicken' ? 0 : 3, FRAME_H - raw.h - 2);
    if (id === 'gerald') framed.blit(Px.fromGrid(GERALD_HAT), 7, FRAME_H - raw.h - 2);
    return framed.toCanvas();
  }
  return citizenFrame(LOOKS[id], 'front', 'stand').toCanvas();
}
