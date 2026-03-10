import { useEffect } from "react";
import type { RefObject } from "react";
import type { Direction } from "../types";

export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (dir: Direction) => void,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let tx: number | null = null;
    let ty: number | null = null;
    let tt: number | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      tx = t.clientX; ty = t.clientY; tt = Date.now();
    };

    const onMove = (e: TouchEvent) => {
      if (tx !== null) e.preventDefault();
    };

    const onEnd = (e: TouchEvent) => {
      if (tx === null || ty === null || tt === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tx;
      const dy = t.clientY - ty;
      const elapsed = Date.now() - tt;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 30 && elapsed < 700) {
        const dir: Direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0 ? 3 : 2
            : dy > 0 ? 1 : 0;
        onSwipe(dir);
      }
      tx = ty = tt = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [ref, onSwipe, enabled]);
}
