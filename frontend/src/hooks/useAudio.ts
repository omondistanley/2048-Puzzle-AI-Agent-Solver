import { useRef, useCallback } from "react";

export function useAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  const tone = useCallback((freq: number, dur: number, type: OscillatorType = "sine", vol = 0.18, delay = 0) => {
    if (!enabled) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, c.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + dur);
    } catch {}
  }, [enabled, getCtx]);

  const play = useCallback((event: string, tileVal?: number) => {
    if (!enabled) return;
    switch (event) {
      case "slide":
        tone(220, 0.04, "sine", 0.05);
        break;
      case "merge": {
        const freq = Math.min(110 * Math.log2(tileVal ?? 2), 1400);
        tone(freq, 0.15, "sine", 0.20);
        if ((tileVal ?? 0) >= 512) tone(freq * 1.5, 0.12, "sine", 0.08, 0.05);
        break;
      }
      case "invalid":
        tone(180, 0.08, "sawtooth", 0.08);
        break;
      case "newBest":
        [523, 659, 784].forEach((f, i) => tone(f, 0.12, "sine", 0.15, i * 0.10));
        break;
      case "win":
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, "sine", 0.20, i * 0.09));
        break;
      case "over":
        [440, 349, 294].forEach((f, i) => tone(f, 0.25, "sine", 0.18, i * 0.12));
        break;
    }
  }, [enabled, tone]);

  return { play };
}
