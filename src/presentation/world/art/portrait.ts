import type { Mood } from '../../../sim/types';
import { Px } from './px';

export const PORTRAIT_SIZE = 48;

/** The Jester's puppet head. The cap's two points droop with his mood. */
export function jesterPortrait(mood: Mood, mouthOpen: boolean): Px {
  const px = new Px(48, 48);

  // collar of points
  for (let i = 0; i < 7; i++) {
    const x = 7 + i * 5;
    const c = i % 2 ? 'u' : 'r';
    for (let j = 0; j < 7; j++) px.hline(x + (j >> 1), 41 + j - 3, Math.max(1, 6 - j), c);
    px.set(x + 2, 45, 'y');
  }
  px.rect(10, 37, 28, 3, 'y').hline(10, 39, 28, 'o');
  px.rect(19, 34, 10, 4, 'e');

  // face
  px.ellipse(24, 25, 11, 12, 'c');
  px.ellipse(24, 36, 3, 1, 'c');
  px.hline(17, 36, 14, 'c');
  px.set(15, 30, 'T').set(16, 31, 'T').set(14, 29, 'T').set(32, 30, 'T').set(33, 29, 'T').set(31, 31, 'T');

  // the diamond under one eye
  const dx = 31;
  const dy = 27;
  px.set(dx, dy - 2, 'r').hline(dx - 1, dy - 1, 3, 'r').hline(dx - 2, dy, 5, 'r').hline(dx - 1, dy + 1, 3, 'r').set(dx, dy + 2, 'r');

  // nose
  px.rect(23, 25, 3, 4, 'e').hline(24, 28, 3, 'T');

  // eyes and brows
  const eyeL = 18;
  const eyeR = 29;
  const eyeY = 23;
  const brow = (x: number, tilt: number, y = eyeY - 4) => px.line(x - 2, y - tilt, x + 3, y + tilt, 'b');
  const eye = (x: number, h: number) => {
    px.rect(x - 1, eyeY - (h >> 1), 3, h, 'w');
    px.rect(x, eyeY - (h >> 1), 2, h, 'k');
  };
  switch (mood) {
    case 'smug':
      eye(eyeL, 2);
      eye(eyeR, 2);
      px.hline(eyeL - 1, eyeY - 2, 4, 'e').hline(eyeR - 1, eyeY - 2, 4, 'e');
      brow(eyeL, 0);
      brow(eyeR, -1, eyeY - 6);
      break;
    case 'delight':
      px.line(eyeL - 2, eyeY + 1, eyeL, eyeY - 1, 'k').line(eyeL, eyeY - 1, eyeL + 2, eyeY + 1, 'k');
      px.line(eyeR - 2, eyeY + 1, eyeR, eyeY - 1, 'k').line(eyeR, eyeY - 1, eyeR + 2, eyeY + 1, 'k');
      brow(eyeL, 0, eyeY - 6);
      brow(eyeR, 0, eyeY - 6);
      break;
    case 'shock':
      px.rect(eyeL - 2, eyeY - 2, 5, 5, 'w').rect(eyeL, eyeY - 1, 2, 2, 'k');
      px.rect(eyeR - 2, eyeY - 2, 5, 5, 'w').rect(eyeR, eyeY - 1, 2, 2, 'k');
      brow(eyeL, 1, eyeY - 6);
      brow(eyeR, -1, eyeY - 6);
      break;
    case 'scheme':
      eye(eyeL, 2);
      eye(eyeR, 2);
      brow(eyeL, 2, eyeY - 3);
      brow(eyeR, -2, eyeY - 3);
      break;
    case 'bored':
      px.hline(eyeL - 2, eyeY, 5, 'b');
      px.hline(eyeR - 2, eyeY, 5, 'b');
      px.set(eyeL + 1, eyeY + 1, 'k').set(eyeR + 1, eyeY + 1, 'k');
      brow(eyeL, 0, eyeY - 3);
      brow(eyeR, 0, eyeY - 3);
      break;
    case 'solemn':
      eye(eyeL, 3);
      eye(eyeR, 3);
      brow(eyeL, -1);
      brow(eyeR, 1);
      break;
  }

  // mouth
  const m = 32;
  if (mouthOpen) {
    px.ellipse(24, m, 4, 2, 'k').hline(22, m + 1, 5, 'r');
  } else if (mood === 'delight' || mood === 'smug') {
    px.line(19, m - 1, 22, m + 1, 'k').hline(22, m + 1, 5, 'k').line(27, m + 1, 31, m - 3, 'k');
  } else if (mood === 'shock') {
    px.ellipse(24, m, 2, 2, 'k');
  } else if (mood === 'solemn' || mood === 'bored') {
    px.hline(21, m + 1, 7, 'k');
  } else {
    px.line(19, m + 1, 27, m + 1, 'k').line(27, m + 1, 30, m - 2, 'k');
  }

  // cap band
  px.rect(12, 13, 24, 4, 'y').hline(12, 16, 24, 'o');
  for (let x = 13; x < 36; x += 4) px.set(x, 14, 'r');

  // cap lobes; they perk up when he is pleased
  const droop = mood === 'bored' || mood === 'solemn' ? 6 : mood === 'delight' ? -3 : mood === 'shock' ? -5 : 0;
  px.ellipse(16, 8, 6, 6, 'r').ellipse(32, 8, 6, 6, 'u');
  px.ellipse(14, 6, 2, 2, 'R').ellipse(30, 6, 2, 2, 'A');
  px.rect(19, 3, 5, 10, 'u').rect(24, 3, 5, 10, 'r');
  px.line(11, 10, 3, 14 + droop, 'r').line(12, 12, 4, 15 + droop, 'r').line(11, 8, 3, 13 + droop, 'r');
  px.line(37, 10, 45, 14 + droop, 'u').line(36, 12, 44, 15 + droop, 'u').line(37, 8, 45, 13 + droop, 'u');
  px.ellipse(3, 16 + droop, 2, 2, 'y').set(2, 15 + droop, 'Y').set(3, 17 + droop, 'o');
  px.ellipse(45, 16 + droop, 2, 2, 'y').set(44, 15 + droop, 'Y').set(45, 17 + droop, 'o');

  return px.outline('k');
}
