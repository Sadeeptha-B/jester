import { useEffect, useRef, useState } from 'react';
import { EVENT_BY_ID } from '../../narrative/registry';
import { jesterPortrait, PORTRAIT_SIZE } from '../world/art/portrait';
import type { Mood } from '../../sim/types';
import { useUi } from './store';

const portraits = new Map<string, string>();

function portrait(mood: Mood, talking: boolean): string {
  const key = `${mood}/${talking}`;
  let url = portraits.get(key);
  if (!url) {
    url = jesterPortrait(mood, talking).toCanvas().toDataURL();
    portraits.set(key, url);
  }
  return url;
}

/** The Jester rises like a puppet from below the stage, and talks while he is up. */
function Puppet({ mood, talkId, onClick }: { mood: Mood; talkId: number; onClick(): void }) {
  const [talking, setTalking] = useState(false);
  const [up, setUp] = useState(false);
  const [flap, setFlap] = useState(false);

  useEffect(() => {
    if (!talkId) return;
    setUp(true);
    setTalking(true);
    const flapper = setInterval(() => setFlap((f) => !f), 150);
    const stop = setTimeout(() => {
      clearInterval(flapper);
      setTalking(false);
      setFlap(false);
    }, 2200);
    const sink = setTimeout(() => setUp(false), 9000);
    return () => {
      clearInterval(flapper);
      clearTimeout(stop);
      clearTimeout(sink);
    };
  }, [talkId]);

  return (
    <button className={`puppet ${up ? 'up' : ''}`} onClick={onClick} aria-label="Speak to the Jester">
      <img src={portrait(mood, talking && flap)} width={PORTRAIT_SIZE * 2} height={PORTRAIT_SIZE * 2} alt="" draggable={false} />
    </button>
  );
}

function WaxSeal() {
  return <span className="seal" aria-hidden="true" />;
}

/** The bottom edge of the theatre: one quiet line that can open into a dispatch. */
export function Tray() {
  const line = useUi((s) => s.line);
  const dispatch = useUi((s) => s.dispatch);
  const pendingId = useUi((s) => s.pending);
  const busy = useUi((s) => s.sceneBusy);
  const expanded = useUi((s) => s.expanded);
  const setExpanded = useUi((s) => s.setExpanded);
  const game = useUi((s) => s.game);
  const openPanel = useUi((s) => s.openPanel);
  const panel = useUi((s) => s.panel);
  const [zoomed, setZoomed] = useState(false);
  const paper = useRef<HTMLDivElement>(null);

  const pending = game?.engine.world.pending ?? null;
  const showing = pendingId && pending ? { title: pending.title, text: pending.text, at: pending.at } : dispatch;
  const event = pendingId ? EVENT_BY_ID[pendingId] : null;

  useEffect(() => {
    if (expanded) paper.current?.focus();
  }, [expanded]);

  const decide = (id: string) => {
    game?.engine.send({ type: 'decide', choice: id });
    game?.save();
    setExpanded(false);
  };

  const showMe = () => {
    if (!game || !showing?.at) return;
    game.renderer.flyTo(showing.at);
    setZoomed(true);
    setExpanded(false);
  };

  const comeBack = () => {
    game?.renderer.flyHome();
    setZoomed(false);
  };

  const text = pendingId && pending ? pending.text : (line?.text ?? '');

  return (
    <footer className="tray">
      {expanded && showing && (
        <div className="dispatch parchment" ref={paper} tabIndex={-1} role="dialog" aria-label={showing.title}>
          <button className="card-close" onClick={() => setExpanded(false)} aria-label="Close">×</button>
          <h2>{showing.title}</h2>
          <p>{showing.text}</p>
          {event?.decision && (
            <div className="choices">
              {event.decision.choices.map((c) => (
                <button key={c.id} className="choice" disabled={busy} onClick={() => decide(c.id)}>
                  {c.label}
                </button>
              ))}
              <p className="choice-aside">Or do nothing, and let events take their course.</p>
            </div>
          )}
          {showing.at && (
            <button className="linkish" onClick={showMe}>Show me</button>
          )}
        </div>
      )}
      <Puppet mood={line?.mood ?? 'smug'} talkId={line?.id ?? 0} onClick={() => openPanel(panel === 'jester' ? null : 'jester')} />
      <button className="ticker" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-live="polite" disabled={!showing && !text}>
        {pendingId && <WaxSeal />}
        <span>{text}</span>
      </button>
      {zoomed && (
        <button className="come-back" onClick={comeBack}>Step back</button>
      )}
    </footer>
  );
}
