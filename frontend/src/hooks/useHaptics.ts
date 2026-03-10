import { useCallback } from "react";

export function useHaptics(enabled: boolean) {
  const pulse = useCallback((pattern: number | number[] = 10) => {
    if (!enabled) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }, [enabled]);

  return { pulse };
}
