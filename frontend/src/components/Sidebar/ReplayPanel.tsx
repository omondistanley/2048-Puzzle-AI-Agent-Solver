import React, { useState } from "react";
import type { ReplayRecord, GameGrid, TileSkin } from "../../types";
import { getTileColors } from "../../utils/tileColors";

interface Props {
  replays: ReplayRecord[];
  colorblind: boolean;
  tileSkin?: TileSkin;
}

const MICRO_CELL = 32;
const MICRO_GAP = 3;

const MiniBoard: React.FC<{ grid: GameGrid; colorblind: boolean; tileSkin: TileSkin }> = ({ grid, colorblind, tileSkin }) => {
  const _size = grid.length; void _size;
  return (
    <div style={{ background: "var(--board-bg)", padding: MICRO_GAP, borderRadius: 5, display: "inline-block", border: "1px solid var(--border)" }}>
      {grid.map((row, r) => (
        <div key={r} style={{ display: "flex", gap: MICRO_GAP, marginBottom: MICRO_GAP }}>
          {row.map((val, c) => {
            const [bg, fg] = getTileColors(val, colorblind, tileSkin);
            return (
              <div key={c} style={{
                width: MICRO_CELL, height: MICRO_CELL, background: val ? bg : "rgba(238,228,218,0.35)",
                borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: "bold", color: fg,
              }}>
                {val || ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const ReplayPanel: React.FC<Props> = ({ replays, colorblind, tileSkin = "classic" }) => {
  const [sel, setSel] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [speed, setSpeed] = useState(550);

  const replay = sel !== null ? replays[sel] : null;

  React.useEffect(() => {
    if (!autoplay || !replay) return;
    if (step >= replay.snapshots.length - 1) {
      setAutoplay(false);
      return;
    }
    const id = window.setTimeout(() => {
      setStep(s => Math.min(replay.snapshots.length - 1, s + 1));
    }, speed);
    return () => window.clearTimeout(id);
  }, [autoplay, replay, step, speed]);

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", color: "var(--text)" }}>🎬 Replays</h3>
      {replays.length === 0
        ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Finish a game to unlock replays.</p>
        : (
          <>
            <select
              onChange={e => { setSel(Number(e.target.value)); setStep(0); setAutoplay(false); }}
              value={sel ?? ""}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 5, marginBottom: 12, fontSize: 13, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              <option value="" disabled>Select a game…</option>
              {replays.map((r, i) => (
                <option key={r.id} value={i}>
                  Game {i + 1} — Tile {r.maxTile} | Score {r.finalScore}
                </option>
              ))}
            </select>

            {replay && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  Step {step + 1}/{replay.snapshots.length}
                </div>
                <MiniBoard grid={replay.snapshots[step]} colorblind={colorblind} tileSkin={tileSkin} />

                <input
                  type="range"
                  min={0}
                  max={Math.max(0, replay.snapshots.length - 1)}
                  value={step}
                  onChange={e => {
                    setStep(Number(e.target.value));
                    setAutoplay(false);
                  }}
                  style={{ width: "100%", marginTop: 10 }}
                  aria-label="Replay step scrubber"
                />

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                  <button onClick={() => { setStep(0); setAutoplay(false); }} disabled={step === 0}
                    style={navBtn}>⏮⏮</button>
                  <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                    style={navBtn}>⏮</button>
                  <button onClick={() => setAutoplay(a => !a)} disabled={step >= replay.snapshots.length - 1}
                    style={navBtn}>{autoplay ? "⏸" : "▶"}</button>
                  <button onClick={() => setStep(s => Math.min(replay.snapshots.length - 1, s + 1))}
                    disabled={step >= replay.snapshots.length - 1} style={navBtn}>⏭</button>
                  <button onClick={() => { setStep(replay.snapshots.length - 1); setAutoplay(false); }} disabled={step >= replay.snapshots.length - 1}
                    style={navBtn}>⏭⏭</button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Playback</span>
                  <input
                    type="range"
                    min={150}
                    max={1200}
                    step={50}
                    value={speed}
                    onChange={e => setSpeed(Number(e.target.value))}
                    style={{ width: 140 }}
                    aria-label="Replay speed"
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 46 }}>{speed}ms</span>
                </div>
              </div>
            )}
          </>
        )
      }
    </div>
  );
};

const navBtn: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 5, border: "none",
  background: "var(--btn-primary-bg)", color: "#fff", cursor: "pointer", fontWeight: 700,
  boxShadow: "0 1px 0 rgba(0,0,0,0.18)",
};
