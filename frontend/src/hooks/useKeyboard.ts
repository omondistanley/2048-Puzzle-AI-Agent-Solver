import { useEffect } from "react";
import type { Direction } from "../types";

const ARROW_MAP: Record<string, Direction> = {
  ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3,
  KeyW: 0, KeyS: 1, KeyA: 2, KeyD: 3,
  w: 0, s: 1, a: 2, d: 3,
};

export function useKeyboard(onMove: (dir: Direction) => void, enabled = true, wasd = true) {
  useEffect(() => {
    if (!enabled) return;

    // On touch-first devices, force swipe/touch controls and skip keyboard listeners.
    const isTouchFirstDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || window.matchMedia?.("(pointer: coarse)")?.matches);
    if (isTouchFirstDevice) return;

    const handler = (e: KeyboardEvent) => {
      const dir = ARROW_MAP[e.code] ?? (wasd ? ARROW_MAP[e.key] : undefined);
      if (dir !== undefined) {
        e.preventDefault();
        onMove(dir);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onMove, enabled, wasd]);
}
