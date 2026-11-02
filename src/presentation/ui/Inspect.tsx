import { useEffect, useRef, useState } from 'react';
import { CITIZEN_BY_ID, OFFICE_NAMES } from '../../narrative/content/citizens';
import { LANDMARK_BY_ID } from '../../narrative/content/landmarks';
import { LOCATIONS } from '../../narrative/content/map';
import { believes } from '../../sim/rumours';
import { displayName } from '../../sim/text';
import type { World } from '../../sim/types';
import { portraitCanvas } from '../world/sheets';
import { useUi } from './store';

function Cameo({ id, hat }: { id: string; hat: string | null | undefined }) {
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = portraitCanvas(id, hat);
    canvas.className = 'cameo-art';
    slot.current?.replaceChildren(canvas);
  }, [id, hat]);
  return <div className="cameo" ref={slot} aria-hidden="true" />;
}

function strongestTie(world: World, id: string): string | null {
  let best: { other: string; value: number; reason?: string } | null = null;
  for (const [key, r] of Object.entries(world.relations)) {
    const [a, b] = key.split('|');
    if (a !== id && b !== id) continue;
    if (!best || Math.abs(r.value) > Math.abs(best.value)) best = { other: a === id ? b : a, value: r.value, reason: r.reason };
  }
  if (!best || Math.abs(best.value) < 2) return null;
  const who = CITIZEN_BY_ID[best.other].name;
  const feeling = best.value >= 4 ? 'Devoted to' : best.value >= 2 ? 'Fond of' : best.value <= -4 ? 'Cannot abide' : 'Wary of';
  return `${feeling} ${who}${best.reason ? ` (${best.reason})` : ''}.`;
}

/** A calling card for whoever or whatever was clicked. */
export function Inspect() {
  const selection = useUi((s) => s.selection);
  const select = useUi((s) => s.select);
  const game = useUi((s) => s.game);
  const [, refresh] = useState(0);

  // Citizens move on; the card keeps up, but need not do so at sixty frames a second.
  useEffect(() => {
    if (!selection) return;
    const timer = setInterval(() => refresh((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [selection]);

  if (!selection || !game) return null;
  const { world } = game.engine;

  if (selection.kind === 'location') {
    const loc = LOCATIONS[selection.id];
    const present = Object.values(world.citizens).filter((c) => c.plan.at === selection.id && !c.inside && !c.absent);
    return (
      <aside className="card parchment" aria-label={loc.name}>
        <button className="card-close" onClick={() => select(null)} aria-label="Close">×</button>
        <h3>{loc.name}</h3>
        <p className="card-line">{loc.blurb}</p>
        {present.length > 0 && <p className="card-traits">Here now: {present.map((c) => CITIZEN_BY_ID[c.id].name).join(', ')}</p>}
      </aside>
    );
  }

  if (selection.kind === 'landmark') {
    const def = LANDMARK_BY_ID[selection.id];
    const placed = world.landmarks.find((l) => l.id === selection.id);
    return (
      <aside className="card parchment" aria-label={def.name}>
        <button className="card-close" onClick={() => select(null)} aria-label="Close">×</button>
        <h3>{def.name}</h3>
        <p className="card-line"><em>{def.plaque}</em></p>
        {placed && <p className="card-traits">Erected on Day {placed.day}</p>}
      </aside>
    );
  }

  const def = CITIZEN_BY_ID[selection.id];
  const state = world.citizens[selection.id];
  const office = Object.entries(world.offices).find(([, id]) => id === selection.id);
  const tie = strongestTie(world, selection.id);
  const rumour = believes(world, state);
  const react = (how: 'applaud' | 'tomato' | 'rumour') => game.engine.send({ type: 'react', id: selection.id, how });

  return (
    <aside className="card parchment" aria-label={def.name}>
      <button className="card-close" onClick={() => select(null)} aria-label="Close">×</button>
      <div className="card-head">
        <Cameo id={def.id} hat={state.hat} />
        <div>
          <h3>{displayName(world, def.id)}</h3>
          <p className="card-role">{office && office[0] !== 'wizard' ? OFFICE_NAMES[office[0]] : def.role}</p>
          <p className="card-traits">{def.traits.join(' · ')}</p>
        </div>
      </div>
      <p className="card-doing">{state.inside ? `Indoors. ${state.plan.doing}.` : `${state.plan.doing}.`}</p>
      <p className="card-thought">“{state.plan.thought}”</p>
      <p className="card-line"><em>Ambition:</em> {def.ambition}</p>
      {tie && <p className="card-line">{tie}</p>}
      {rumour && <p className="card-line"><em>Believes:</em> {rumour}.</p>}
      {state.deeds.length > 0 && (
        <ul className="card-deeds">
          {state.deeds.slice(0, 3).map((d, i) => (
            <li key={i}>Day {d.day}: {d.text}</li>
          ))}
        </ul>
      )}
      {!state.inside && !def.animal && (
        <div className="reactions">
          <button onClick={() => react('applaud')}>Applaud</button>
          <button onClick={() => react('rumour')}>Whisper a rumour</button>
          <button onClick={() => react('tomato')}>Throw a tomato</button>
        </div>
      )}
    </aside>
  );
}
