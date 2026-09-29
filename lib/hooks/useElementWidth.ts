'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Measured width of an element, so an SVG can be drawn at 1 user unit per
 * pixel. Scaling an SVG with preserveAspectRatio would distort the tick marks
 * and the type along with them.
 *
 * The fallback keeps server and first client render identical, and the height
 * of every consumer is fixed, so measuring never shifts layout.
 */
export function useElementWidth<T extends HTMLElement>(
  fallback: number,
): [React.RefObject<T | null>, number, boolean] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  const [measured, setMeasured] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const next = Math.round(node.getBoundingClientRect().width);
    if (next > 0) {
      setWidth(next);
      setMeasured(true);
    }
  }, []);

  useEffect(() => {
    measure();
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  return [ref, width, measured];
}
