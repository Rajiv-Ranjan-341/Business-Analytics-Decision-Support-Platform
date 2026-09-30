import { useEffect, useRef, useState } from 'react';

/* The app's motion system.
 *
 * Two rules it is built around. Motion here either answers something the person
 * did, or shows that their numbers arrived — it never plays on scroll by itself.
 * And it is written straight to the DOM from one requestAnimationFrame pass, so
 * a figure counting up is not sixty React renders a second.
 *
 * Every timing below is in milliseconds and every one of them is skipped
 * entirely under prefers-reduced-motion. */
export const DURATION = {
  tick: 620, // a figure counting to its value
  feed: 520, // a panel feeding out like paper
  slide: 260, // the sidebar marker moving between items
  chart: 700, // a line drawing or a bar growing
};

/** Decelerating curve: fast off the mark, settles softly. Matches the receipt. */
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Props for a Recharts series so it draws in when its data lands. Recharts has
 * no idea about prefers-reduced-motion, so this checks it and hands back a
 * still chart when someone has asked for one. Spread it onto the series:
 *   <Bar dataKey="sold" {...chartAnim()} />
 */
export function chartAnim(extraDelay = 0) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    isAnimationActive: !reduced,
    animationDuration: DURATION.chart,
    animationBegin: extraDelay,
    animationEasing: 'ease-out',
  };
}

export function useReducedMotion() {
  // Read after mount: the server has no matchMedia, and branching on it during
  // render is a hydration mismatch.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);
  return reduced;
}

/**
 * A number that counts to its value when the data lands. Money counting up is
 * what a till does, which is why it belongs here rather than being decoration.
 *
 * The count is written to the node's textContent directly — the component does
 * not re-render while it runs. `format` turns the running number into the string
 * on screen, so the same ticker handles money, counts and percentages.
 */
export function useTicker(value, format) {
  const ref = useRef(null);
  const from = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || value == null || Number.isNaN(value)) return;

    if (reduced) {
      node.textContent = format(value);
      from.current = value;
      return;
    }

    const a = from.current;
    const b = value;
    if (a === b) {
      node.textContent = format(b);
      return;
    }

    let frame = 0;
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const p = Math.min(1, (now - start) / DURATION.tick);
      node.textContent = format(a + (b - a) * easeOut(p));
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = b;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, format, reduced]);

  return ref;
}

/**
 * True once, shortly after the thing it is attached to has data. Panels use it
 * to feed out like paper coming off a printer — one reveal per arrival, not one
 * per section on every scroll.
 */
export function useArrived(ready) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (!ready) {
      setArrived(false);
      return;
    }
    const id = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(id);
  }, [ready]);
  return arrived;
}
