import { create } from 'zustand';
import type { Game } from '../../app/game';
import type { LocationId } from '../../narrative/content/map';
import type { Dispatch, Mood, Recap } from '../../sim/types';

export type Selection =
  | { kind: 'citizen'; id: string }
  | { kind: 'location'; id: LocationId }
  | { kind: 'landmark'; id: string }
  | null;

export type Panel = 'chronicle' | 'decree' | 'settings' | 'jester' | null;

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
  holiday: string | null;
}

interface UiState {
  game: Game | null;
  selection: Selection;
  hover: { label: string; x: number; y: number } | null;
  bubbles: Bubble[];
  status: Status;
  /** The latest thing worth saying, in the tray. */
  line: { text: string; mood: Mood; id: number } | null;
  dispatch: Dispatch | null;
  /** The event id of an open question, if any. */
  pending: string | null;
  sceneBusy: boolean;
  expanded: boolean;
  panel: Panel;
  recap: Recap | null;
  notice: string | null;
  /** The kingdom is running in another window, and this one is waiting its turn. */
  elsewhere: boolean;
  canInstall: boolean;
  setGame(game: Game): void;
  select(s: Selection): void;
  setHover(h: UiState['hover']): void;
  addBubble(id: string, text: string, ms: number): void;
  setStatus(s: Status): void;
  say(text: string, mood: Mood): void;
  setDispatch(d: Dispatch | null): void;
  setPending(p: string | null, busy: boolean): void;
  setExpanded(v: boolean): void;
  openPanel(p: Panel): void;
  setRecap(r: Recap | null): void;
  setNotice(n: string | null): void;
  setElsewhere(v: boolean): void;
  setCanInstall(v: boolean): void;
}

let nextKey = 1;

export const useUi = create<UiState>((set, get) => ({
  game: null,
  selection: null,
  hover: null,
  bubbles: [],
  status: { day: 1, weekday: 'Monday', phase: 'Morning', weather: 'clear', holiday: null },
  line: null,
  dispatch: null,
  pending: null,
  sceneBusy: false,
  expanded: false,
  panel: null,
  recap: null,
  notice: null,
  elsewhere: false,
  canInstall: false,
  setGame: (game) => set({ game }),
  select: (selection) => set({ selection, panel: selection ? null : get().panel }),
  setHover: (hover) => set({ hover }),
  addBubble: (id, text, ms) => {
    const key = nextKey++;
    // One bubble per head; the newest remark wins.
    set({ bubbles: [...get().bubbles.filter((b) => b.id !== id), { key, id, text }] });
    setTimeout(() => set({ bubbles: get().bubbles.filter((b) => b.key !== key) }), ms);
  },
  setStatus: (status) => {
    const now = get().status;
    if (now.day !== status.day || now.phase !== status.phase || now.weather !== status.weather || now.weekday !== status.weekday || now.holiday !== status.holiday) set({ status });
  },
  say: (text, mood) => set({ line: { text, mood, id: nextKey++ } }),
  setDispatch: (dispatch) => {
    if (dispatch?.id === get().dispatch?.id) return;
    set({ dispatch });
    if (dispatch) set({ line: { text: dispatch.text, mood: dispatch.mood, id: dispatch.id } });
  },
  setPending: (pending, sceneBusy) => {
    const now = get();
    if (now.pending !== pending || now.sceneBusy !== sceneBusy) set({ pending, sceneBusy });
  },
  setExpanded: (expanded) => set({ expanded }),
  openPanel: (panel) => set({ panel, selection: panel ? null : get().selection, expanded: false }),
  setRecap: (recap) => set({ recap }),
  setNotice: (notice) => set({ notice }),
  setElsewhere: (elsewhere) => set({ elsewhere }),
  setCanInstall: (canInstall) => set({ canInstall }),
}));
