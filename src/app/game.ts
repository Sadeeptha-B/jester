import { hourOf, phaseOf, weekday } from '../sim/clock';
import { Engine } from '../sim/engine';
import { advance } from '../sim/clock';
import { createWorld } from '../sim/world';
import { useUi } from '../presentation/ui/store';
import { WorldRenderer } from '../presentation/world/renderer';

export interface Game {
  engine: Engine;
  renderer: WorldRenderer;
}

const params = new URLSearchParams(location.search);
const DEV = import.meta.env.DEV;

/** Wires the simulation to the screen and owns the only animation loop. */
export async function startGame(host: HTMLElement): Promise<Game> {
  const seed = DEV && params.has('seed') ? Number(params.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
  const world = createWorld(seed);
  if (DEV && params.has('hour')) world.clock.minute = Number(params.get('hour')) * 60;
  if (DEV && params.has('weather')) {
    world.weather = params.get('weather') as typeof world.weather;
    world.weatherUntil = 1e9;
  }
  const speed = DEV && params.has('speed') ? Number(params.get('speed')) : 1;

  const engine = new Engine(world);
  const renderer = await WorldRenderer.create(host);
  renderer.setCurtain(false, true);

  const fps = 24;
  const frameMs = 1000 / fps;
  let last = performance.now();
  let lastDraw = 0;
  let raf = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - lastDraw < frameMs - 2) return;
    lastDraw = now;
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    engine.update(dt * speed);
    for (const cue of engine.takeCues()) {
      if (cue.type === 'say') useUi.getState().addBubble(cue.id, cue.text, cue.ms);
      else renderer.cue(cue);
    }
    renderer.draw(world, dt);
    useUi.getState().setStatus({
      day: world.clock.day,
      weekday: weekday(world.clock.day),
      phase: phaseOf(hourOf(world.clock)),
      weather: world.weather,
    });
  };

  const run = () => {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) run();
  });
  run();

  setTimeout(() => renderer.setCurtain(true), DEV && params.has('nocurtain') ? 0 : 500);
  if (DEV) {
    (window as unknown as Record<string, unknown>).jester = { engine, renderer, world, skip: (m: number) => advance(world.clock, m) };
  }
  return { engine, renderer };
}
