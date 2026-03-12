import { useCallback } from "react";

/** Named haptic patterns (ms durations). */
export const HAPTIC = {
  SLIDE:    10,
  MERGE:    [12, 20, 12] as number[],
  MERGE_BIG:[20, 30, 20, 30, 20] as number[],
  NEW_BEST: [18, 40, 18] as number[],
  WIN:      [24, 45, 24, 45, 24] as number[],
  OVER:     [30, 35, 30] as number[],
  UNDO:     [8, 12] as number[],
  HINT:     [6] as number[],
  INVALID:  8,
};

/** Pattern scaled to tile value — bigger merges feel stronger. */
export function hapticForTile(value: number): number[] {
  const base = Math.min(Math.round(Math.log2(value) * 8), 96);
  return value >= 512 ? [base, Math.round(base * 0.6), base] : [base];
}

export function useHaptics(enabled: boolean) {
  const pulse = useCallback((pattern: number | number[] = 10) => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    // Defer by one frame so vibration isn't suppressed mid-animation on iOS/Android
    setTimeout(() => {
      try { navigator.vibrate(pattern); } catch {}
    }, 0);
  }, [enabled]);

  return { pulse };
}
