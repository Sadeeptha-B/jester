import type { LocationId, Pt } from './map';
import type { SlotMode } from '../../sim/types';

export interface Slot {
  /** Hour of the fictional day this slot begins. */
  from: number;
  at: LocationId | 'home';
  doing: string;
  thought: string;
  mode?: SlotMode;
  /** A precise place to stand, for those who never leave it. */
  spot?: Pt;
}

export interface Citizen {
  id: string;
  name: string;
  role: string;
  traits: string[];
  ambition: string;
  /** Where they vanish to at night. */
  door: Pt;
  schedule: Slot[];
  /** Spoken when dropped by the Hand. */
  onLifted: string[];
  /** Percival's route, Wick's rounds and so on. */
  route?: Pt[];
  speed?: number;
  /** Shock response to being picked up. */
  faints?: boolean;
  animal?: 'chicken' | 'pigeon';
}

const TOWER_DOOR = { x: 38, y: 72 };
const CASTLE_DOOR = { x: 136, y: 66 };
const MINISTRY_DOOR = { x: 226, y: 74 };
const TAVERN_DOOR = { x: 44, y: 136 };

export const CITIZENS: Citizen[] = [
  {
    id: 'jester',
    name: 'The Jester',
    role: 'Court Fool',
    traits: ['mischievous', 'theatrical', 'insubordinate'],
    ambition: 'To be taken seriously, exactly once, as a prank.',
    door: CASTLE_DOOR,
    schedule: [
      { from: 7, at: 'square', doing: 'Rehearsing a speech to no one', thought: 'The pigeons laughed in the right places. Good crowd.', mode: 'pace' },
      { from: 11, at: 'market', doing: 'Auditing the vegetables for sedition', thought: 'That marrow knows something.' },
      { from: 14, at: 'tavern', doing: 'Collecting material', thought: 'Humphrey has seven secrets and I have eight.' },
      { from: 18, at: 'square', doing: 'Heckling the clock', thought: 'It is always the same joke with that clock. Twelve times.' },
      { from: 23, at: 'home', doing: 'Asleep, allegedly', thought: 'Do not disturb. Unless it is funny.', mode: 'inside' },
    ],
    onLifted: ['Ah. Your Majesty has hands.', 'Careful. These bells are load-bearing.', 'I shall tell the Council you were gentle. I shall be lying.'],
  },
  {
    id: 'archibald',
    name: 'Archibald',
    role: 'Royal Wizard',
    traits: ['brilliant', 'incompetent', 'needy'],
    ambition: 'One (1) spell that does what was written on the tin.',
    door: TOWER_DOOR,
    schedule: [
      { from: 6, at: 'tower', doing: 'Pacing, apparently troubled by a discovery', thought: 'If the decimal goes there, then what was that smell?', mode: 'pace' },
      { from: 12, at: 'market', doing: 'Inspecting vegetables for magical potential', thought: 'A cabbage has so much to give.' },
      { from: 15, at: 'tower', doing: 'Conducting experiments of no fixed outcome', thought: 'Pip says it is fine. Pip always says it is fine.', mode: 'pace' },
      { from: 22, at: 'home', doing: 'Reading by the light of something that should be out', thought: 'It is only humming a little.', mode: 'inside' },
    ],
    onLifted: ['I meant to do that!', 'A levitation! Mine! Witnesses, please!', 'Ah yes. As I predicted. In a paper I have yet to write.'],
  },
  {
    id: 'pip',
    name: 'Pip',
    role: "Wizard's Apprentice",
    traits: ['competent', 'overlooked', 'patient'],
    ambition: 'For someone to read the footnotes.',
    door: TOWER_DOOR,
    schedule: [
      { from: 6, at: 'tower', doing: 'Quietly correcting the spell book', thought: 'Page nine says "newt". He has been reading it as "now".' },
      { from: 10, at: 'market', doing: 'Buying the actual ingredients', thought: 'Somebody has to.' },
      { from: 13, at: 'tower', doing: 'Sweeping up last week', thought: 'This soot is older than I am.' },
      { from: 20, at: 'home', doing: 'Reinforcing the door', thought: 'Just in case.', mode: 'inside' },
    ],
    onLifted: ['Oh. Noted.', "This is going in the log.", 'Please put me back. I had a system.'],
  },
  {
    id: 'beatrice',
    name: 'Beatrice',
    role: 'Minister of Order',
    traits: ['bureaucratic', 'suspicious', 'tireless'],
    ambition: 'A kingdom in which nothing happens without a form.',
    door: MINISTRY_DOOR,
    schedule: [
      { from: 7, at: 'ministry', doing: 'Stamping things that have already been stamped', thought: 'A second stamp confirms the first.' },
      { from: 11, at: 'square', doing: 'Measuring the spontaneity of the public', thought: 'Far too many people standing about unlicensed.', mode: 'pace' },
      { from: 13, at: 'ministry', doing: 'Drafting a form for requesting forms', thought: 'Form 7B is a triumph. Form 7A was a mistake.' },
      { from: 19, at: 'home', doing: 'Filing, in private', thought: 'Alphabetically. Then again by regret.', mode: 'inside' },
    ],
    onLifted: ['This requires a Form of Elevation!', 'Who authorised this altitude?', 'Unlicensed. Entirely unlicensed.'],
  },
  {
    id: 'ignatius',
    name: 'Ignatius Fenn',
    role: 'Junior Clerk',
    traits: ['dutiful', 'resigned', 'optimistic'],
    ambition: 'To reach the front of the queue, which leads to his own desk.',
    door: MINISTRY_DOOR,
    schedule: [
      { from: 7, at: 'ministry', doing: 'Queueing. Year eleven', thought: 'It moved. I am almost sure it moved.', mode: 'fixed', spot: { x: 228, y: 80 } },
      { from: 18, at: 'home', doing: 'Holding his place in spirit', thought: 'Tomorrow. Possibly.', mode: 'inside' },
    ],
    onLifted: ['My place! You have lost me my place!', 'Eleven years!', 'Excuse me, was this the queue?'],
  },
  {
    id: 'humphrey',
    name: 'Humphrey',
    role: 'Tavern Keeper',
    traits: ['nosy', 'inventive', 'genial'],
    ambition: 'To know one thing about everyone, and to improve upon it.',
    door: TAVERN_DOOR,
    schedule: [
      { from: 8, at: 'tavern', doing: 'Polishing a tankard and listening hard', thought: 'Nobody ever looks at the man with the cloth.' },
      { from: 11, at: 'market', doing: 'Buying onions, selling gossip', thought: 'I got two for one and a scandal.' },
      { from: 13, at: 'tavern', doing: 'Improving a rumour', thought: 'It needs a goat in it.' },
      { from: 24, at: 'home', doing: 'Counting secrets', thought: 'Nine. No, ten, I forgot the bishop.', mode: 'inside' },
    ],
    onLifted: ['Well! That one goes straight in the rumour book.', 'Lovely view of everybody’s business from here.', 'Mind the apron. Mind the secrets.'],
  },
  {
    id: 'cornelius',
    name: 'Cornelius',
    role: 'Philosopher',
    traits: ['ponderous', 'contrary', 'serene'],
    ambition: 'To prove that something, anything, is not legitimate.',
    door: { x: 110, y: 190 },
    schedule: [
      { from: 8, at: 'square', doing: 'Doubting a bench', thought: 'It holds me up. But on whose authority?', mode: 'pace' },
      { from: 12, at: 'pond', doing: 'Questioning the depth of the pond', thought: 'Reasonable according to whom?' },
      { from: 16, at: 'tavern', doing: 'Debating a stool, and losing', thought: 'The stool made a strong point by saying nothing.' },
      { from: 21, at: 'home', doing: 'Asleep, or so it would appear', thought: 'Prove it.', mode: 'inside' },
    ],
    onLifted: ['Then free will is settled. How disappointing.', 'And who, I wonder, lifts the lifter?', 'If I am moved, was I ever here?'],
  },
  {
    id: 'turnip',
    name: 'Lady Turnip',
    role: 'Noblewoman',
    traits: ['ambitious', 'agrarian', 'patrician'],
    ambition: 'Political supremacy through agricultural reform.',
    door: { x: 222, y: 190 },
    schedule: [
      { from: 7, at: 'gardens', doing: 'Inspecting the root vegetables as troops', thought: 'Discipline in the third row is slipping.' },
      { from: 11, at: 'castle', doing: 'Lobbying an empty throne', thought: 'It listens better than the last one.' },
      { from: 14, at: 'gardens', doing: 'Drafting the Turnip Doctrine', thought: 'Article One: more turnips.' },
      { from: 19, at: 'home', doing: 'Plotting, with soil under her nails', thought: 'A monarchy is only a very large allotment.', mode: 'inside' },
    ],
    onLifted: ['Unhand me! Whoever you are!', 'I know a coup when I feel one.', 'How dare you. Mind the hat.'],
  },
  {
    id: 'percival',
    name: 'Percival',
    role: 'Royal Guard',
    traits: ['earnest', 'brave', 'terrified of birds'],
    ambition: 'One full patrol without meeting a bird.',
    door: CASTLE_DOOR,
    schedule: [{ from: 0, at: 'castle', doing: 'On patrol, watching the skies', thought: 'Was that a wing? I think that was a wing.', mode: 'patrol' }],
    route: [
      { x: 136, y: 76 },
      { x: 80, y: 88 },
      { x: 60, y: 142 },
      { x: 92, y: 150 },
      { x: 136, y: 160 },
      { x: 196, y: 136 },
      { x: 212, y: 90 },
      { x: 160, y: 84 },
    ],
    faints: true,
    onLifted: ['...', 'Is it a bird? Tell me it is not a bird.', 'I have secured the area. From above. Unconscious.'],
  },
  {
    id: 'mabel',
    name: 'Mabel Quill',
    role: 'Town Crier',
    traits: ['dramatic', 'hoarse', 'punctual'],
    ambition: 'To be heard at the back. Any back.',
    door: { x: 112, y: 164 },
    schedule: [
      { from: 7, at: 'square', doing: 'Warming up what remains of her voice', thought: 'Oyez. Oyez? Oy.', mode: 'pace' },
      { from: 10, at: 'castle', doing: 'Waiting for news of any kind', thought: 'Her Majesty is due a decree. Or his Majesty. Nobody has been told.' },
      { from: 14, at: 'market', doing: 'Announcing the price of parsnips', thought: 'The crowd is hanging on every whisper.' },
      { from: 20, at: 'home', doing: 'Gargling honey and regret', thought: 'Tomorrow, the full oyez.', mode: 'inside' },
    ],
    onLifted: ['OYEZ! ...oyez. Oy.', 'Hear ye! Up here!', 'Excellent projection from this altitude.'],
  },
  {
    id: 'wick',
    name: 'Wick',
    role: 'Lamplighter',
    traits: ['devout', 'methodical', 'mistaken'],
    ambition: 'To keep the sun away. It has worked so far.',
    door: { x: 196, y: 192 },
    schedule: [
      { from: 8, at: 'home', doing: 'Sleeping off a night of holding back the sun', thought: 'Zzz. Not on my watch. Zzz.', mode: 'inside' },
      { from: 14, at: 'market', doing: 'Buying wicks, naturally', thought: 'Eleven lamps stand between us and the day.' },
      { from: 18, at: 'square', doing: 'Lighting the lamps, one at a time', thought: 'Every night I win. Every morning it returns. Rude.', mode: 'lamps' },
    ],
    onLifted: ['My lamps! Who will hold back the sun?', 'Put me down, the dusk will not wait.', 'Is this what the sun feels like?'],
  },
  {
    id: 'nan',
    name: 'Nan Gristle',
    role: 'Market Seller',
    traits: ['ancient', 'unimpressed', 'veteran'],
    ambition: 'To outlive the kingdom, out of spite.',
    door: { x: 208, y: 190 },
    schedule: [
      { from: 7, at: 'market', doing: 'Selling vegetables at people', thought: 'Back in the war we ate the receipts.', mode: 'fixed', spot: { x: 220, y: 126 } },
      { from: 17, at: 'tavern', doing: 'Telling a war story nobody can verify', thought: 'That was when Tuesday still fought fair.' },
      { from: 21, at: 'home', doing: 'Not sleeping, on principle', thought: 'I will rest when it is over. They know what they did.', mode: 'inside' },
    ],
    onLifted: ['Seen worse. In the war.', 'Put me down or I raise the price of leeks.', 'Hmph.'],
  },
  {
    id: 'perpetua',
    name: 'Sister Perpetua',
    role: 'Priest of the Clock',
    traits: ['serene', 'punctual', 'zealous'],
    ambition: 'For everyone to be on time for eternity.',
    door: { x: 186, y: 100 },
    schedule: [
      { from: 6, at: 'square', doing: 'Tending the Holy Clock', thought: 'It said three. And it was three. Praise be.' },
      { from: 12, at: 'pond', doing: 'Timing the ripples', thought: 'Perfectly on schedule, each one.' },
      { from: 15, at: 'square', doing: 'Offering a brief, punctual sermon', thought: 'Four minutes. Not a second more. It is written.', mode: 'pace' },
      { from: 22, at: 'home', doing: 'Winding, in prayer', thought: 'Tick. Amen. Tick. Amen.', mode: 'inside' },
    ],
    onLifted: ['This was not in the schedule!', 'Unscheduled! Unscheduled!', 'I shall be late for this.'],
  },
  {
    id: 'chicken',
    name: 'Unidentified Chicken',
    role: 'Person of Interest',
    traits: ['fugitive', 'unidentified', 'chicken'],
    ambition: 'Unknown. The chicken refuses to be interviewed.',
    door: { x: 20, y: 150 },
    animal: 'chicken',
    speed: 24,
    schedule: [{ from: 0, at: 'gardens', doing: 'At large', thought: 'Bk.', mode: 'scurry' }],
    onLifted: ['BKAWK!', 'Bk. Bk bk. BK.', '(The chicken stares at you, as if taking notes.)'],
  },
  {
    id: 'gerald',
    name: 'Gerald',
    role: 'Pigeon',
    traits: ['ambitious', 'dignified', 'pigeon'],
    ambition: 'He has been reading about the Ministry of Weather.',
    door: { x: 150, y: 110 },
    animal: 'pigeon',
    speed: 10,
    schedule: [{ from: 0, at: 'square', doing: 'Walking about as though he owns the place', thought: 'Coo.', mode: 'idle' }],
    onLifted: ['Coo.', '(Gerald looks at you with quiet disapproval.)', 'Coo. Coo.'],
  },
];

export const CITIZEN_BY_ID: Record<string, Citizen> = Object.fromEntries(CITIZENS.map((c) => [c.id, c]));

/** Starting feelings. Reasons come later, once grudges have causes. */
export const INITIAL_RELATIONS: [string, string, number][] = [
  ['archibald', 'beatrice', -3],
  ['beatrice', 'jester', -4],
  ['humphrey', 'jester', 3],
  ['cornelius', 'perpetua', -3],
  ['turnip', 'nan', -2],
  ['percival', 'gerald', -5],
  ['mabel', 'jester', 2],
  ['pip', 'wick', 3],
  ['archibald', 'pip', 2],
  ['nan', 'humphrey', 2],
  ['ignatius', 'beatrice', 1],
  ['cornelius', 'humphrey', 2],
  ['turnip', 'archibald', 1],
];
