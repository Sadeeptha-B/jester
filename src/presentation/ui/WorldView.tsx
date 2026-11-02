import { useEffect, useRef, useState } from 'react';
import { startGame, type Game } from '../../app/game';
import { CITIZEN_BY_ID } from '../../narrative/content/citizens';
import { LOCATIONS } from '../../narrative/content/map';
import { handCursor } from '../world/art/icons';
import { useUi } from './store';
import { BubbleLayer } from './Bubbles';

function cursorUrl(closed: boolean): string {
  const px = handCursor(closed);
  const scale = 2;
  const c = document.createElement('canvas');
  c.width = px.w * scale;
  c.height = px.h * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(px.toCanvas(), 0, 0, c.width, c.height);
  return `url(${c.toDataURL()}) 14 8, ${closed ? 'grabbing' : 'grab'}`;
}

const DRAG_THRESHOLD = 4;

/** The diorama itself, and the Hand that reaches into it. */
export function WorldView() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !host.current) return;
    started.current = true;
    startGame(host.current).then((g) => {
      useUi.getState().setGame(g);
      setGame(g);
    });
  }, []);

  useEffect(() => {
    if (!game || !host.current) return;
    const el = host.current;
    const { engine, renderer } = game;
    const open = cursorUrl(false);
    const closed = cursorUrl(true);
    let press: { x: number; y: number; id?: string; lifted: boolean } | null = null;

    const move = (e: PointerEvent) => {
      const p = renderer.toWorld(e.clientX, e.clientY);
      renderer.setHand(p);
      if (press?.id) {
        if (!press.lifted && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_THRESHOLD) {
          press.lifted = true;
          engine.send({ type: 'lift', id: press.id });
          el.style.cursor = closed;
          useUi.getState().select(null);
          useUi.getState().setHover(null);
        }
        if (press.lifted) engine.send({ type: 'carry', id: press.id, x: p.x, y: p.y });
        return;
      }
      const hit = renderer.hit(engine.world, p);
      el.style.cursor = hit.citizen ? open : hit.location ? 'pointer' : 'default';
      const label = hit.citizen ? CITIZEN_BY_ID[hit.citizen].name : hit.location ? LOCATIONS[hit.location].name : null;
      const rect = el.getBoundingClientRect();
      useUi.getState().setHover(label ? { label, x: e.clientX - rect.left, y: e.clientY - rect.top - 12 } : null);
    };

    const down = (e: PointerEvent) => {
      const p = renderer.toWorld(e.clientX, e.clientY);
      const hit = renderer.hit(engine.world, p);
      press = { x: e.clientX, y: e.clientY, id: hit.citizen, lifted: false };
      if (hit.citizen) el.setPointerCapture(e.pointerId);
    };

    const up = (e: PointerEvent) => {
      if (!press) return;
      const p = renderer.toWorld(e.clientX, e.clientY);
      if (press.lifted && press.id) {
        engine.send({ type: 'drop', id: press.id, x: p.x, y: p.y });
        el.style.cursor = open;
      } else {
        const hit = renderer.hit(engine.world, p);
        const { select } = useUi.getState();
        if (hit.citizen) select({ kind: 'citizen', id: hit.citizen });
        else if (hit.location) select({ kind: 'location', id: hit.location });
        else select(null);
      }
      press = null;
    };

    const leave = () => {
      renderer.setHand(null);
      useUi.getState().setHover(null);
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', leave);
    };
  }, [game]);

  return (
    <div className="world" ref={host}>
      {game && <BubbleLayer renderer={game.renderer} />}
    </div>
  );
}
