import { create } from 'zustand';
import type { Game } from '../../app/game';
import type { LocationId } from '../../narrative/content/map';

export type Selection = { kind: 'citizen'; id: string } | { kind: 'location'; id: LocationId } | null;

export interface Bubble {
  key: number;
  id: string;
  text: string;
}

export interface Status {
  day: number;
  weekday: string;
  phase: string;
  weather: string;
}

interface UiState {
  game: Game | null;
  selection: Selection;
  hover: { label: string; x: number; y: number } | null;
  bubbles: Bubble[];
  status: Status;
  setGame(game: Game): void;
  select(s: Selection): void;
  setHover(h: UiState['hover']): void;
  addBubble(id: string, text: string, ms: number): void;
  setStatus(s: Status): void;
}

let nextKey = 1;

export const useUi = create<UiState>((set, get) => ({
  game: null,
  selection: null,
  hover: null,
  bubbles: [],
  status: { day: 1, weekday: 'Monday', phase: 'Dawn', weather: 'clear' },
  setGame: (game) => set({ game }),
  select: (selection) => set({ selection }),
  setHover: (hover) => set({ hover }),
  addBubble: (id, text, ms) => {
    const key = nextKey++;
    // One bubble per head; the newest remark wins.
    set({ bubbles: [...get().bubbles.filter((b) => b.id !== id), { key, id, text }] });
    setTimeout(() => set({ bubbles: get().bubbles.filter((b) => b.key !== key) }), ms);
  },
  setStatus: (status) => {
    const now = get().status;
    if (now.day !== status.day || now.phase !== status.phase || now.weather !== status.weather || now.weekday !== status.weekday) set({ status });
  },
}));
