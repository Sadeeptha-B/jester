import { useEffect, useRef } from 'react';
import type { WorldRenderer } from '../world/renderer';
import { useUi } from './store';

/** Speech is DOM, so it stays crisp; only its position follows the canvas. */
export function BubbleLayer({ renderer }: { renderer: WorldRenderer }) {
  const bubbles = useUi((s) => s.bubbles);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    renderer.onFrame = () => {
      for (const [id, el] of refs.current) {
        const head = renderer.headOf(id);
        if (!head) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = 'visible';
        el.style.transform = `translate(${Math.round(head.x)}px, ${Math.round(head.y)}px) translate(-50%, -100%)`;
      }
    };
    return () => {
      renderer.onFrame = null;
    };
  }, [renderer]);

  return (
    <div className="bubbles" aria-hidden="true">
      {bubbles.map((b) => (
        <div
          key={b.key}
          className="bubble"
          ref={(el) => {
            if (el) refs.current.set(b.id, el);
            else refs.current.delete(b.id);
          }}
        >
          <span>{b.text}</span>
        </div>
      ))}
    </div>
  );
}
