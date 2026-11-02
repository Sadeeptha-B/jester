# Architecture

## Layers

| Layer | Path | Responsibility |
|---|---|---|
| Simulation | `src/sim` | World state, citizens, scenes, the Director, effects, offline catch-up. No DOM, no Pixi, no timers. |
| Narrative | `src/narrative` | Schema and all content: citizens, map, events, arcs, decrees, jokes. Data, not behaviour. |
| Presentation | `src/presentation` | `world/` draws the kingdom with Pixi; `ui/` is React over the canvas. |
| Persistence | `src/persistence` | Saving, loading, migration, recovery. |
| App | `src/app` | Wires the above together; owns the only animation loop. |

The simulation is run directly by the tests, with no browser.

## How a moment happens

1. `Engine.tick()` runs at a fixed 5Hz, far below the render rate.
2. The Director (`sim/director.ts`) checks its rhythm and, when due, picks an eligible event and casts it.
3. `sim/scenes.ts` plays the event's *beats*: citizens walk, speak and emote. Beats change nothing lasting.
4. When the scene ends, its *effects* are applied through `sim/effects.ts`, and any dispatch or decision is posted.
5. The renderer draws state, and plays transient `Cue`s that the sim emits and forgets.

## Decisions

**Beats and effects are separate.** Beats are presentation and effects are consequence. An event therefore resolves identically on stage, offstage, or if the tab closes mid-scene: on load, unfinished scenes apply their effects and release their cast. A test enforces this for every event.

**Content is declarative.** Conditions, effects and beats are Zod-validated data, and `effects.ts` is the only route by which a story alters the world. An outcome is checked whole before any of it applies, and a scene whose outcome doesn't fit is dropped rather than crashing. This is the extension point for a future LLM: a proposer produces the same structures and passes through the same validation, so the simulation stays authoritative. No AI code ships now.

**Everything random is seeded in state.** Same seed and same commands give the same world, which is what makes the catch-up deterministic. Purely decorative randomness (pigeons, smoke, rain) lives in the renderer, uses `Math.random`, and is never saved.

**Scene keys, not scene objects, are saved.** `event:x`, `choice:x:y` and `decree:x` name content, so a save stays small and a scene can be finished after a reload.

**Art is code.** Everything is drawn into an indexed-colour `Px` surface and baked at boot, so nothing can leave the 32-colour palette and any state change (a hat, a landmark) can be composited. Pixi renders to a low-resolution buffer, and a shader upscales it with sharp-bilinear filtering and applies time-of-day grading in one pass. Fog and the stage vignette live in the same shader.

**The window size changes the theatre, not the town.** The logical canvas grows to fit the window, the slab stays fixed, and the set is rebaked. Text is DOM over the canvas, for crispness and accessibility.

**Time runs at two speeds.** Watched, a fictional day takes 15 minutes. Away, an hour is a day, capped at 7 days and 6 events. A hidden tab is treated as a short absence, so there is one code path and no background timer to throttle. Under 5 minutes it is silent.

**Saves alternate between two slots.** A bad write can cost at most one autosave. Saves are validated on load, and a save that fails falls back to the other slot, then to a new kingdom with an in-fiction apology.

**Floating copies frames rather than moving the canvas.** In Chromium, a WebGL canvas moved into a Document Picture-in-Picture window keeps a correct buffer but displays black on real GPUs, and the fault doesn't appear under software rendering. So the WebGL canvas stays hidden, and `renderer.showIn` copies each frame to a 2D canvas owned by the floating window. Frames are paced by that window's `requestAnimationFrame`, so hiding the original tab doesn't stop the kingdom. Automated tests cover the copy; floating itself needs a headed browser on a real GPU, so check it by hand after touching this code.

**Plain CSS instead of Tailwind.** The interface is bespoke parchment and woodwork rather than utility layout.

**Moving away from the brief's phases.** Save/load came with the first decision rather than in Phase 3, because a first implementation is required to persist.

## Known limitations

- **Content runs out.** On Balanced, the arcs and one-off incidents are spent in roughly five hours of watching. After that the kingdom keeps its ambient scenes and aftermath events, and nothing new breaks out. This is the most valuable thing to extend.
- **The Herald and scenes are one at a time.** A decision waits for any scene already playing, which can take up to a minute.
- **Citizens share space.** There is no collision avoidance, and bubbles can overlap in a crowded scene.
- **Sound is synthesised and basic,** and is off by default.
- **Floating is Chromium-only** and needs the original tab left open. It is not a desktop app.
- **The bundle is about 250KB gzipped,** mostly Pixi, and is not code-split.
- **Performance figures** were taken with software rendering: about 1.4% of a core for script and under 3% for all main-thread work at idle. GPU cost has not been measured on real hardware, and the extra frame copy while floating has not been measured at all.

## Next milestones

1. **More story.** More arcs and incidents, and ways for finished arcs to interact.
2. **Desktop app with Tauri.** Frameless, always on top, tray icon, background persistence. The web app should carry over unchanged, but IndexedDB data does not move between browser and webview, so add save export and import first. Requires Rust and the MSVC build tools.
3. **Optional language model.** A narrator and proposer that emits validated `EventDef`s, given a bounded summary of world state from `facts` and the Chronicle.
4. **Richer town life.** Holidays that change schedules, and citizens who react to landmarks.
