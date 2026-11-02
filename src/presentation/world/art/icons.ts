import type { EmoteKind } from '../../../sim/types';
import { Px } from './px';

const SYMBOLS: Record<EmoteKind, string[]> = {
  love: ['.R...R.', 'RRR.RRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
  anger: ['r.r.r.r', '.rrrrr.', 'rrkrkrr', '.rrrrr.', 'r.rrr.r', '..r.r..'],
  question: ['..NNN..', '.N...N.', '.....N.', '...NN..', '...N...', '.......', '...N...'],
  exclaim: ['...r...', '...r...', '...r...', '...r...', '.......', '...r...'],
  sleep: ['NNNN...', '..N....', '.N.....', 'NNNN.NN', '.....N.', '....NN.'],
  note: ['...KKK.', '...K.K.', '...K.K.', '.KKK.K.', '.KKK.KK', '.....KK'],
  talk: ['.......', '.......', '.K.K.K.', '.......'],
  sweat: ['...a...', '...a...', '..aAa..', '.aAAAa.', '.aaaaa.', '..aaa..'],
  star: ['...y...', '..yyy..', 'yyyyyyy', '..yyy..', '.yy.yy.', '.y...y.'],
};

/** A speech-bubble tile with a pixel symbol, drawn above a citizen's head. */
export function emoteIcon(kind: EmoteKind): Px {
  const sym = Px.fromGrid(SYMBOLS[kind]);
  const px = new Px(13, 13);
  px.rect(1, 1, 11, 9, 'w').hline(2, 0, 9, 'w').hline(2, 10, 9, 'w');
  px.blit(sym, 3, 1 + Math.floor((9 - sym.h) / 2));
  px.rect(5, 11, 3, 1, 'w').set(6, 12, 'w');
  return px.outline('k');
}

export const EMOTE_KINDS = Object.keys(SYMBOLS) as EmoteKind[];

/** A soft oval for feet to stand on. */
export function footShadow(w: number): Px {
  const px = new Px(w, 3);
  px.hline(1, 0, w - 2, 'k').hline(0, 1, w, 'k').hline(1, 2, w - 2, 'k');
  return px;
}

export function pennant(frame: number): Px {
  const px = new Px(10, 6);
  const rows = frame === 0 ? ['rrRRRRrr..', 'rrrRRRrrr.', 'rrrrrrr...'] : ['rrrRRrr...', 'rrRRRRRrr.', 'rrrrrrrr..'];
  px.blit(Px.fromGrid(rows), 0, 1);
  return px;
}

/** The Hand: a pixel gauntlet, for cursors. Open when free, closed when carrying. */
export function handCursor(closed: boolean): Px {
  const open = [
    '....kk..kk....',
    '...kwwkkwwk.k.',
    '...kwwkkwwkkwk',
    '.k.kwwkkwwkkwk',
    'kwkkwwwwwwkwwk',
    'kwwkwwwwwwwwwk',
    '.kwwwwwwwwwwwk',
    '..kwwwwwwwwwwk',
    '...kwwwwwwwwk.',
    '....kwwWWWwk..',
    '....kyyyyyyk..',
    '....kkkkkkkk..',
  ];
  const fist = [
    '..............',
    '..............',
    '....kk.kk.kk..',
    '...kwwkwwkwwk.',
    '..kkwwwwwwwwwk',
    '.kwwkwwwwwwwwk',
    '.kwwwwwwwwwwwk',
    '..kwwwwwwwwwwk',
    '...kwwwwwwwwk.',
    '....kwwWWWwk..',
    '....kyyyyyyk..',
    '....kkkkkkkk..',
  ];
  return Px.fromGrid(closed ? fist : open);
}
