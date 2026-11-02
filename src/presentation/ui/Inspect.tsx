import { useEffect, useRef, useState } from 'react';
import { CITIZEN_BY_ID } from '../../narrative/content/citizens';
import { LOCATIONS } from '../../narrative/content/map';
import { portraitCanvas } from '../world/sheets';
import { useUi } from './store';

function Cameo({ id }: { id: string }) {
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = portraitCanvas(id);
    canvas.className = 'cameo-art';
    slot.current?.replaceChildren(canvas);
  }, [id]);
  return <div className="cameo" ref={slot} aria-hidden="true" />;
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

  if (selection.kind === 'location') {
    const loc = LOCATIONS[selection.id];
    return (
      <aside className="card parchment" aria-label={loc.name}>
        <button className="card-close" onClick={() => select(null)} aria-label="Close">×</button>
        <h3>{loc.name}</h3>
        <p className="card-line">{loc.blurb}</p>
      </aside>
    );
  }

  const def = CITIZEN_BY_ID[selection.id];
  const state = game.engine.world.citizens[selection.id];
  return (
    <aside className="card parchment" aria-label={def.name}>
      <button className="card-close" onClick={() => select(null)} aria-label="Close">×</button>
      <div className="card-head">
        <Cameo id={def.id} />
        <div>
          <h3>{def.name}</h3>
          <p className="card-role">{def.role}</p>
          <p className="card-traits">{def.traits.join(' · ')}</p>
        </div>
      </div>
      <p className="card-doing">{state.inside ? `Indoors. ${state.plan.doing}.` : `${state.plan.doing}.`}</p>
      <p className="card-thought">“{state.plan.thought}”</p>
      <p className="card-line"><em>Ambition:</em> {def.ambition}</p>
      {state.deeds.length > 0 && (
        <ul className="card-deeds">
          {state.deeds.slice(0, 3).map((d, i) => (
            <li key={i}>Day {d.day}: {d.text}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
