import type { Colour } from './palette';
import { Px } from './px';

/**
 * Paper-doll citizens. A frame is 16×24 with feet resting on the bottom edge.
 * The body stays deliberately similar across citizens; silhouette and identity
 * come from the hat, so a hat is a piece of world state as much as of art.
 */
export const FRAME_W = 16;
export const FRAME_H = 24;

export type Facing = 'front' | 'back' | 'side';
export type Pose = 'stand' | 'walk1' | 'walk2' | 'walk3' | 'dangle1' | 'dangle2' | 'sit' | 'flat';

export interface Look {
  skin: Colour;
  skinShade: Colour;
  hair: Colour;
  hairShade: Colour;
  hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'tuft';
  body: Colour;
  bodyShade: Colour;
  trim: Colour;
  outfit: 'tunic' | 'gown' | 'robe' | 'armour' | 'motley' | 'apron';
  motleyAlt?: Colour;
  beard?: { colour: Colour; shade: Colour; long?: boolean };
  moustache?: Colour;
  specs?: boolean;
  /** Pip is short. Lifts the head and hat down by this many pixels. */
  short?: number;
  hat?: HatId | null;
}

// ---- hats ----------------------------------------------------------------

type HatArt = { rows: string[]; /** rows of the hat sitting below the head's top edge */ sink: number };

export const HATS = {
  wizard: {
    sink: 2,
    rows: [
      '.......vv.......',
      '.......vvv......',
      '......vvvv......',
      '......vYvv......',
      '.....vvvvvv.....',
      '.....vvvvYv.....',
      '....vYvvvvvv....',
      '....vvvvvvvv....',
      '...yyyyyyyyyy...',
      '.vvvvvvvvvvvvvv.',
      '..KKKKKKKKKKKK..',
    ],
  },
  jester: {
    sink: 2,
    rows: [
      '.y............y.',
      '.rr...y.......uu',
      '.rrr..uu.....uu.',
      '..rrr.uuu..uuu..',
      '...rrrruuuuuu...',
      '...rrrruuuuuu...',
      '...yyyyyyyyyy...',
    ],
  },
  bicorne: {
    sink: 2,
    rows: [
      '.......WW.......',
      '......KKKK......',
      '...KKKKKKKKKK...',
      '.KKKKKKKKKKKKKK.',
      '.kKKKKyyKKKKKKk.',
      '...kKKKKKKKKk...',
    ],
  },
  turnip: {
    sink: 2,
    rows: [
      '......M..l......',
      '.....mM.Ml......',
      '......mMl.......',
      '.....PwwwP......',
      '.....PwwwP......',
      '......PwP.......',
      '...ppppppppppp..',
      'pPPPPPPPPPPPPPPp',
      'ppppppPPPPpppppp',
      '..rrrrrrrrrrrr..',
    ],
  },
  helmet: {
    sink: 3,
    rows: [
      '......rR........',
      '.....rRRr.......',
      '.....rRRRr......',
      '......iiii......',
      '....iiAAAAii....',
      '...iAAAAAAAAS...',
      '...iAAAAAAAAS...',
      '...yyyyyyyyyy...',
    ],
  },
  tricorn: {
    sink: 2,
    rows: [
      '...........R....',
      '..........RR....',
      '.....NNNNRRN....',
      '...NNNNNNRNNNN..',
      '.NNNNNNNNNNNNNN.',
      '..yyyyyyyyyyyy..',
    ],
  },
  candle: {
    sink: 2,
    rows: [
      '.......Y........',
      '.......o........',
      '.......k........',
      '......www.......',
      '......wWW.......',
      '.....bBBBb......',
      '....BtttttB.....',
      '...BttttttTB....',
      '...BBBBBBBBB....',
    ],
  },
  kerchief: {
    sink: 3,
    rows: [
      '.....RRRRRR.....',
      '...RRwRRRwRRR...',
      '...RRRRwRRRRR...',
      '...rrrrrrrrrr...',
    ],
  },
  papers: {
    sink: 1,
    rows: [
      '.....wwwww......',
      '.....SSSSS......',
      '......wwwww.....',
      '......SSSSS.....',
      '.....wwwww......',
      '.....SSSSS......',
      '....wwwwwww.....',
      '....SSSSSSS.....',
    ],
  },
  wimple: {
    sink: 3,
    rows: [
      '.....yyyyyy.....',
      '....yywwwwyy....',
      '....ywwkwwwy....',
      '....ywwkkkwy....',
      '....yywwwwyy....',
      '...nnyyyyyynn...',
      '...nnnnnnnnnn...',
      '..wwwwwwwwwwww..',
    ],
  },
  hood: {
    sink: 3,
    rows: [
      '.....KKKKKK.....',
      '....KppppppK....',
      '...KppppppppK...',
      '...pppppppppp...',
    ],
  },
  tophat: {
    sink: 2,
    rows: [
      '.....dddddd.....',
      '.....dddddd.....',
      '.....dddddd.....',
      '.....dddddd.....',
      '.....KKKKKK.....',
      '...dddddddddd...',
    ],
  },
  plume: {
    sink: 2,
    rows: [
      '..........u.....',
      '.........uv.....',
      '........uuv.....',
      '.......uuv......',
      '......uuvv......',
      '....vvvvvvvv....',
      '...vvvvvvvvvv...',
      '...YYYYYYYYYY...',
    ],
  },
  /** Awarded by decree, usually regretted. */
  crown: {
    sink: 1,
    rows: [
      '....y..yy..y....',
      '....yyryyryy....',
      '....yyyyyyyy....',
      '....oooooooo....',
    ],
  },
} satisfies Record<string, HatArt>;

export type HatId = keyof typeof HATS;

// ---- bodies --------------------------------------------------------------

function drawLegs(px: Px, look: Look, facing: Facing, pose: Pose, top: number) {
  const leg: Colour = look.outfit === 'armour' ? 'S' : 'K';
  const boot: Colour = look.outfit === 'armour' ? 'd' : 'b';
  const bottom = 22;
  const up1 = pose === 'walk1' ? 1 : 0;
  const up2 = pose === 'walk3' ? 1 : 0;
  if (facing === 'side') {
    const reach = pose === 'walk1' ? 2 : pose === 'walk3' ? -2 : 0;
    px.rect(7 + reach, top, 2, bottom - top, leg).rect(7 + reach, bottom - 1, 3, 1, boot);
    px.rect(7 - reach, top, 2, bottom - top, leg).rect(7 - reach, bottom - 1, 3, 1, boot);
    return;
  }
  px.rect(6, top, 2, bottom - top - up1, leg).rect(6, bottom - 1 - up1, 2, 1, boot);
  px.rect(8, top, 2, bottom - top - up2, leg).rect(8, bottom - 1 - up2, 2, 1, boot);
}

function drawTorso(px: Px, look: Look, facing: Facing, pose: Pose, y: number) {
  const { body, bodyShade, trim } = look;
  const sway = pose === 'walk1' ? 1 : pose === 'walk3' ? -1 : 0;
  const hem = 21;
  switch (look.outfit) {
    case 'gown':
    case 'robe': {
      // A bell of cloth; the hem swings with the step.
      px.rect(5, y, 6, 3, body);
      px.rect(5, y + 3, 6, 2, body).rect(4 + (sway < 0 ? -1 : 0), y + 4, 8 + Math.abs(sway), hem - y - 3, body);
      px.vline(10 + (sway > 0 ? 1 : 0), y + 2, hem - y - 1, bodyShade);
      px.vline(11 + (sway > 0 ? 1 : 0), y + 4, hem - y - 3, bodyShade);
      if (look.outfit === 'robe') {
        if (facing !== 'back') px.vline(facing === 'side' ? 9 : 7, y, hem - y + 1, trim);
      } else {
        px.hline(4 + (sway < 0 ? -1 : 0), hem, 8 + Math.abs(sway), trim);
      }
      px.rect(6, 22, 2, 1, 'b').rect(9, 22, 2, 1, 'b').clear(6, 23);
      break;
    }
    case 'armour': {
      px.rect(5, y, 6, 5, 'A');
      px.vline(10, y, 5, 'a');
      px.rect(6, y, 4, 5, body); // tabard
      px.vline(9, y, 5, bodyShade);
      px.rect(5, y + 4, 6, 1, 'b');
      px.set(7, y + 4, 'y');
      if (facing === 'front') px.rect(7, y + 1, 2, 2, trim);
      break;
    }
    case 'motley': {
      const alt = look.motleyAlt ?? 'u';
      px.rect(5, y, 3, 5, facing === 'back' ? alt : body);
      px.rect(8, y, 3, 5, facing === 'back' ? body : alt);
      px.hline(5, y + 4, 6, 'y');
      px.set(7, y + 1, 'y').set(8, y + 3, 'y');
      px.hline(5, y, 6, 'y');
      break;
    }
    case 'apron': {
      px.rect(5, y, 6, 5, body);
      px.vline(10, y, 5, bodyShade);
      if (facing !== 'back') px.rect(6, y + 1, 4, 5, trim).vline(9, y + 1, 5, 's');
      else px.hline(5, y + 2, 6, trim);
      break;
    }
    default: {
      px.rect(5, y, 6, 5, body);
      px.vline(10, y, 5, bodyShade);
      px.hline(5, y + 4, 6, trim);
    }
  }
}

function drawArms(px: Px, look: Look, facing: Facing, pose: Pose, y: number) {
  const sleeve = look.outfit === 'armour' ? 'a' : look.outfit === 'motley' ? (look.motleyAlt ?? 'u') : look.body;
  const sleeveL = look.outfit === 'motley' ? look.body : sleeve;
  if (pose === 'dangle1' || pose === 'dangle2') {
    const lift = pose === 'dangle1' ? 0 : 1;
    px.rect(3, y - 3 + lift, 2, 4, sleeveL).rect(3, y - 4 + lift, 2, 1, look.skin);
    px.rect(11, y - 3 - lift + 1, 2, 4, sleeve).rect(11, y - 4 - lift + 1, 2, 1, look.skin);
    return;
  }
  if (facing === 'side') {
    const swing = pose === 'walk1' ? 1 : pose === 'walk3' ? -1 : 0;
    px.rect(7 + swing, y + 1, 2, 3, sleeveL).rect(7 + swing, y + 4, 2, 1, look.skin);
    return;
  }
  const swingL = pose === 'walk1' ? 1 : 0;
  const swingR = pose === 'walk3' ? 1 : 0;
  px.rect(4, y + 1, 1, 3 - swingL, sleeveL).set(4, y + 4 - swingL, look.skin);
  px.rect(11, y + 1, 1, 3 - swingR, look.bodyShade === sleeve ? sleeve : sleeve).set(11, y + 4 - swingR, look.skin);
}

function drawHead(px: Px, look: Look, facing: Facing, y: number) {
  const { skin, skinShade, hair, hairShade, hairStyle } = look;
  // A rounded square, 8 wide and 7 tall.
  px.rect(5, y, 6, 7, skin).rect(4, y + 1, 8, 5, skin);
  px.hline(5, y + 6, 6, skinShade).vline(11, y + 1, 5, skinShade);

  if (facing === 'front') {
    px.set(6, y + 3, 'k').set(9, y + 3, 'k');
    if (look.specs) {
      px.set(5, y + 3, 'S').set(7, y + 3, 'S').set(8, y + 3, 'S').set(10, y + 3, 'S');
      px.hline(5, y + 2, 3, 'S').hline(8, y + 2, 3, 'S');
    }
    px.set(5, y + 4, 'T').set(10, y + 4, 'T');
  } else if (facing === 'side') {
    px.set(9, y + 3, 'k').set(12, y + 4, skin).set(12, y + 3, skin);
    if (look.specs) px.set(8, y + 3, 'S').set(10, y + 3, 'S').hline(8, y + 2, 3, 'S');
    px.set(8, y + 4, 'T');
  }

  if (hairStyle !== 'bald') {
    if (facing === 'back') {
      px.rect(5, y, 6, 6, hair).rect(4, y + 1, 8, 5, hair).vline(11, y + 1, 5, hairShade);
      px.hline(5, y + 5, 6, hairShade);
    } else {
      px.rect(5, y, 6, 2, hair).rect(4, y + 1, 8, 1, hair).hline(4, y + 2, 2, hair);
      if (facing === 'front') px.hline(10, y + 2, 2, hair).set(11, y + 3, hairShade).set(4, y + 3, hair);
      else px.rect(4, y + 2, 3, 3, hair).set(5, y + 5, hairShade);
    }
  }
  if (hairStyle === 'long') {
    if (facing === 'front') px.rect(3, y + 2, 2, 7, hair).rect(11, y + 2, 2, 7, hairShade);
    else if (facing === 'back') px.rect(4, y + 5, 8, 4, hair).vline(11, y + 5, 4, hairShade);
    else px.rect(3, y + 2, 3, 7, hair);
  }
  if (hairStyle === 'bun') px.rect(6, y - 2, 4, 2, hair).hline(7, y - 3, 2, hair);
  if (hairStyle === 'tuft') px.rect(7, y - 2, 3, 2, hair).set(10, y - 1, hair);

  if (look.moustache && facing !== 'back') {
    if (facing === 'front') px.hline(4, y + 5, 3, look.moustache).hline(9, y + 5, 3, look.moustache).hline(6, y + 4, 4, look.moustache);
    else px.hline(9, y + 5, 5, look.moustache);
  }
  if (look.beard && facing !== 'back') {
    const b = look.beard;
    const left = facing === 'side' ? 7 : 4;
    const width = facing === 'side' ? 6 : 8;
    const depth = b.long ? 6 : 3;
    px.rect(left, y + 5, width, 2, b.colour);
    px.rect(left + 1, y + 7, width - 2, depth - 1, b.colour);
    px.vline(left + width - 2, y + 7, depth - 1, b.shade);
    if (b.long) px.rect(left + 2, y + 6 + depth, width - 4, 1, b.shade);
  }
}

/** Draw one finished, outlined frame of a citizen. */
export function citizenFrame(look: Look, facing: Facing, pose: Pose): Px {
  const px = new Px(FRAME_W, FRAME_H);
  const short = look.short ?? 0;
  const bob = pose === 'walk1' || pose === 'walk3' ? 1 : 0;
  const headY = 8 + short + bob;
  const torsoY = 15 + short;

  if (pose === 'flat') return flatFrame(look);

  const legTop = torsoY + 5;
  if (pose === 'sit') {
    drawTorso(px, look, facing, 'stand', torsoY + 2);
    drawArms(px, look, facing, 'stand', torsoY + 2);
    drawHead(px, look, facing, headY + 2);
    placeHat(px, look, headY + 2);
    px.rect(5, 21, 6, 2, 'K');
    return px.outline('k');
  }
  if (pose === 'dangle1' || pose === 'dangle2') {
    // Wiggling legs are the whole joke, so they get their own little dance.
    const a = pose === 'dangle1';
    const leg: Colour = look.outfit === 'armour' ? 'S' : 'p';
    if (look.outfit !== 'gown' && look.outfit !== 'robe') {
      px.rect(6, legTop, 2, a ? 3 : 2, leg).rect(a ? 5 : 6, legTop + (a ? 3 : 2), 2, 1, 'b');
      px.rect(8, legTop, 2, a ? 2 : 3, leg).rect(a ? 8 : 9, legTop + (a ? 2 : 3), 2, 1, 'b');
    }
    drawTorso(px, look, facing, 'stand', torsoY);
    drawArms(px, look, facing, pose, torsoY);
    drawHead(px, look, 'front', headY);
    px.clear(6, headY + 3).clear(9, headY + 3).set(6, headY + 3, 'k').set(9, headY + 3, 'k');
    px.set(7, headY + 5, 'k').set(8, headY + 5, 'k');
    placeHat(px, look, headY);
    return px.outline('k');
  }

  if (look.outfit !== 'gown' && look.outfit !== 'robe') drawLegs(px, look, facing, pose, legTop);
  drawTorso(px, look, facing, pose, torsoY);
  if (facing === 'side') {
    drawHead(px, look, facing, headY);
    drawArms(px, look, facing, pose, torsoY);
  } else {
    drawArms(px, look, facing, pose, torsoY);
    drawHead(px, look, facing, headY);
  }
  placeHat(px, look, headY);
  return px.outline('k');
}

function placeHat(px: Px, look: Look, headY: number) {
  if (!look.hat) return;
  const hat = HATS[look.hat];
  const art = Px.fromGrid(hat.rows);
  px.blit(art, 0, headY - art.h + hat.sink);
}

function flatFrame(look: Look): Px {
  // Fainted: a citizen seen lying down, stars handled by the renderer.
  const px = new Px(FRAME_W, FRAME_H);
  px.rect(1, 19, 8, 3, look.body).hline(1, 21, 8, look.bodyShade);
  px.rect(9, 18, 6, 4, look.skin).hline(9, 21, 6, look.skinShade);
  px.set(12, 19, 'k').set(12, 20, 'k');
  if (look.hairStyle !== 'bald') px.rect(13, 18, 2, 4, look.hair);
  return px.outline('k');
}

// ---- the animals ---------------------------------------------------------

export const CHICKEN = {
  stand: [
    '................',
    '................',
    '.......r........',
    '......rrk.......',
    '......wwwo......',
    '.....wwkwo......',
    '.k...wwww.......',
    '.ww.wwwww.......',
    '.wwwwwwww.......',
    '.wWWwWWww.......',
    '..wWWWww........',
    '...wwww.........',
    '....o.o.........',
    '....o.o.........',
  ],
  step: [
    '................',
    '................',
    '.......r........',
    '......rrk.......',
    '......wwwo......',
    '.....wwkwo......',
    '.k...wwww.......',
    '.ww.wwwww.......',
    '.wwwwwwww.......',
    '.wWWwWWww.......',
    '..wWWWww........',
    '...wwww.........',
    '...o...o........',
    '..o.....o.......',
  ],
};

export const PIGEON = {
  stand: [
    '..........',
    '....SSS...',
    '...SSkSo..',
    '...aaSS...',
    '..SSaS....',
    '.dSSSSS...',
    'ddSSSSs...',
    '.dddSSS...',
    '...o.o....',
  ],
  peck: [
    '..........',
    '..........',
    '..........',
    '...SSS....',
    '.dSSSaSS..',
    'ddSSSSaSSk',
    '.dddSSS.So',
    '...o.o....',
    '..........',
  ],
  fly: [
    'Sd......dS',
    '.SSd..dSS.',
    '..SSSSSS..',
    '..aSkSSo..',
    '...SSSS...',
    '....dd....',
    '..........',
    '..........',
    '..........',
  ],
};

/** Gerald's tiny hat: a pigeon's regime is visible from orbit. */
export const GERALD_HAT = ['.KK.', 'yyyy'];
