import { indexedDbStore, SaveRepository } from '../persistence/repository';
import { useUi } from '../presentation/ui/store';
import { WorldRenderer } from '../presentation/world/renderer';
import { catchUp, SILENT_MS } from '../sim/away';
import { hourOf, phaseOf, weekday } from '../sim/clock';
import { Engine } from '../sim/engine';
import type { World } from '../sim/types';
import { createWorld } from '../sim/world';
import { claimKingdom } from './instance';
import { soundscape } from './sound';

export interface Game {
  engine: Engine;
  renderer: WorldRenderer;
  save(): void;
  restart(): Promise<void>;
  setMotion(motion: World['settings']['motion']): void;
  setSound(on: boolean): void;
  popOut(): Promise<void>;
}

interface PipHost {
  documentPictureInPicture: { requestWindow(size: { width: number; height: number }): Promise<Window> };
}

const params = new URLSearchParams(location.search);
const DEV = import.meta.env.DEV;
const AUTOSAVE_MS = 30_000;
const prefersCalm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Reading localStorage can throw when site data is blocked. */
function localStorageOrNull(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function newSeed() {
  return DEV && params.has('seed') ? Number(params.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
}

function freshWorld(): World {
  const world = createWorld(newSeed());
  if (prefersCalm()) world.settings.motion = 'calm';
  return world;
}

/** Wires the simulation to the screen and owns the only animation loop. */
export async function startGame(host: HTMLElement): Promise<Game> {
  await claimKingdom(useUi.getState().setElsewhere);
  const repo = new SaveRepository(indexedDbStore(), localStorageOrNull());
  if (DEV && params.has('fresh')) await repo.clear();

  const loaded = await repo.load().catch(() => null);
  const unreadable = Boolean(loaded?.recovered);
  const world = loaded?.world ?? freshWorld();
  const returning = Boolean(loaded?.world);

  if (returning) {
    const awayHours = DEV && params.has('away') ? Number(params.get('away')) : null;
    catchUp(world, awayHours !== null ? awayHours * 3_600_000 : Date.now() - world.savedAt);
  }
  if (DEV && params.has('hour')) world.clock.minute = Number(params.get('hour')) * 60;
  if (DEV && params.has('weather')) {
    world.weather = params.get('weather') as World['weather'];
    world.weatherUntil = 1e9;
  }
  if (DEV && params.has('pacing')) world.settings.pacing = params.get('pacing') as World['settings']['pacing'];
  const speed = DEV && params.has('speed') ? Number(params.get('speed')) : 1;

  const engine = new Engine(world);
  const renderer = await WorldRenderer.create(host);
  renderer.setLowMotion(world.settings.motion === 'calm');
  renderer.setCurtain(false, true);
  const sound = soundscape();
  sound.setEnabled(world.settings.sound);

  const ui = useUi.getState();
  ui.setDispatch(world.dispatch);

  let frameMs = 1000 / (world.settings.motion === 'calm' ? 12 : 24);
  let last = performance.now();
  let lastDraw = 0;
  let raf = 0;
  let hiddenAt = 0;
  let lastHour = -1;
  /** Whichever window is on screen paces the frames: this one, or the floating one. */
  let clock: Window = window;

  /** Set once this kingdom has been ended, so that it can't save itself back into being. */
  let ended = false;

  const persist = () => {
    if (!ended) void repo.save(world);
  };

  const showRecap = () => {
    const recap = world.recap;
    if (recap && recap.lines.length) {
      renderer.setCurtain(false, true);
      useUi.getState().setRecap(recap);
    } else {
      world.recap = null;
      renderer.setCurtain(true);
    }
  };

  const frame = (now: number) => {
    raf = clock.requestAnimationFrame(frame);
    if (now - lastDraw < frameMs - 2) return;
    lastDraw = now;
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    // Time stands still during the interval.
    const state = useUi.getState();
    if (!state.recap) {
      const paused = engine.world.tick === 0 && renderer.curtainMoving;
      if (!paused) engine.update(dt * speed);
    }
    for (const cue of engine.takeCues()) {
      if (cue.type === 'say') state.addBubble(cue.id, cue.text, cue.ms);
      else if (cue.type === 'quip') state.say(cue.text, cue.mood);
      else renderer.cue(cue);
      sound.cue(cue);
    }
    renderer.draw(world, dt);

    const hour = hourOf(world.clock);
    if (Math.floor(hour) !== lastHour) {
      if (lastHour >= 0) sound.hour(Math.floor(hour));
      lastHour = Math.floor(hour);
    }
    sound.ambience(world.weather);

    state.setDispatch(world.dispatch);
    state.setPending(world.pending?.event ?? null, Boolean(world.scene?.key.match(/^(choice|decree)/)) || world.queue.length > 0);
    state.setStatus({
      day: world.clock.day,
      weekday: weekday(world.clock.day, world.laws),
      phase: phaseOf(hour),
      weather: world.weather,
      holiday: world.holiday?.name ?? null,
    });
  };

  const run = () => {
    last = performance.now();
    raf = clock.requestAnimationFrame(frame);
  };

  document.addEventListener('visibilitychange', () => {
    // While floating, this tab can be hidden and the kingdom is still in full view.
    if (clock !== window) return;
    clock.cancelAnimationFrame(raf);
    if (document.hidden) {
      hiddenAt = Date.now();
      persist();
      sound.ambience(null);
      return;
    }
    // A hidden tab is simply a short absence, handled the same way as a closed one.
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    if (away > 10_000) {
      catchUp(world, away);
      if (away >= SILENT_MS) showRecap();
    }
    run();
  });
  addEventListener('pagehide', () => {
    if (!ended) repo.saveLastWords(world);
  });
  setInterval(() => {
    if (!document.hidden) persist();
  }, AUTOSAVE_MS);

  const game: Game = {
    engine,
    renderer,
    save: persist,
    restart: async () => {
      ended = true;
      await repo.clear();
      location.reload();
    },
    setMotion: (motion) => {
      world.settings.motion = motion;
      frameMs = 1000 / (motion === 'calm' ? 12 : 24);
      renderer.setLowMotion(motion === 'calm');
    },
    setSound: (on) => {
      world.settings.sound = on;
      sound.setEnabled(on);
    },
    popOut: async () => {
      const pip = await (window as unknown as PipHost).documentPictureInPicture.requestWindow({ width: 420, height: 640 });
      for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) pip.document.head.append(node.cloneNode(true));
      const root = document.getElementById('root')!;
      pip.document.body.append(root);
      renderer.showIn(pip.document);
      clock.cancelAnimationFrame(raf);
      clock = pip;
      run();
      pip.addEventListener('pagehide', () => {
        document.body.append(root);
        renderer.showIn(null);
        clock = window;
        run();
      });
    },
  };

  run();
  if (unreadable) {
    useUi.getState().setNotice(loaded?.world ? 'Mice got into the archives. We have restored an earlier copy, and the mice have been spoken to.' : 'Mice have eaten the archives. Everything before today is now a matter of opinion. Welcome to the new kingdom.');
  }
  if (DEV && params.has('nocurtain')) renderer.setCurtain(true, true);
  else if (returning) showRecap();
  else {
    setTimeout(() => renderer.setCurtain(true), 500);
    useUi.getState().say('Your Majesty! A clerical error has made you monarch of Elsewhere. Nobody here expects anything of you. Do sit down.', 'delight');
  }
  if (DEV) {
    (window as unknown as Record<string, unknown>).jester = { engine, renderer, world, repo };
  }
  return game;
}
