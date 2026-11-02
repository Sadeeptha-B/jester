import type { LandmarkDef } from '../schema';

export const LANDMARKS: LandmarkDef[] = [
  { id: 'cabbage', name: 'The Great Cabbage', art: 'cabbage', plot: 2, plaque: 'It is not known what the cabbage wants. It has been asked.' },
  { id: 'cabbage_throne', name: 'The Cabbage Regent', art: 'cabbage_crowned', plot: 2, plaque: 'Regent of Elsewhere. Has yet to veto anything. Has yet to do anything. Popular.' },
  { id: 'soup_pot', name: 'The Memorial Pot', art: 'pot', plot: 2, plaque: 'Here a contender for the throne was served with croutons.' },
  { id: 'regrowth', name: 'A Suspicious Green Shape', art: 'cabbage_shoot', plot: 4, plaque: 'It was exiled to the woods. It appears to be coming back.' },
  { id: 'embassy', name: 'The Pigeon Embassy', art: 'embassy', plot: 3, plaque: 'Sovereign pigeon soil. Do not feed the diplomats.' },
  { id: 'ballot', name: 'The Ballot Box', art: 'ballot', plot: 0, plaque: 'Contains the votes of the first free election in Elsewhere, and some seed.' },
  { id: 'calendar_stone', name: 'The Stone of the Missing Day', art: 'stone', plot: 5, plaque: 'To the memory of Tuesday, abolished. It was not much, but it was between things.' },
  { id: 'treaty_stone', name: 'The Tuesday Accord', art: 'stone', plot: 5, plaque: 'Tuesday shall henceforth occur, but only with prior notice.' },
  { id: 'monument', name: 'A Mysterious Monument', art: 'monument', plot: 1, plaque: 'It was not here yesterday. The Ministry has no record of yesterday.' },
  { id: 'artifact', name: 'The Unexplained Object', art: 'artifact', plot: 1, plaque: 'Hums in the key of a question. Do not lick.' },
  { id: 'statue_hand', name: 'Statue of the Hand', art: 'hand_statue', plot: 0, plaque: 'Raised by the Order of the Lifted. It has never once been dusted, for fear.' },
  { id: 'chair_shrine', name: 'The Accused Chair', art: 'chair', plot: 4, plaque: 'Acquitted, on a technicality, of being a chair.' },
];

export const LANDMARK_BY_ID: Record<string, LandmarkDef> = Object.fromEntries(LANDMARKS.map((l) => [l.id, l]));

export const LAWS: Record<string, { name: string; text: string }> = {
  umbrella_ban: { name: 'The Umbrella Act', text: 'Umbrellas are an act of aggression against the weather.' },
  no_tuesdays: { name: 'The Calendar (Amendment) Act', text: 'There is no Tuesday. There has never been a Tuesday.' },
  tuesday_notice: { name: 'The Tuesday Accord', text: 'Tuesday must give a week’s notice.' },
  soup_day: { name: 'The Soup Observance', text: 'Once a year, the kingdom shall feel bad about soup.' },
  jester_forecasts: { name: 'The Forecast Decree', text: 'Whatever the Jester predicts is, legally, the weather.' },
  vegetable_primogeniture: { name: 'The Vegetable Primogeniture', text: 'The largest vegetable outranks an absent monarch.' },
};
