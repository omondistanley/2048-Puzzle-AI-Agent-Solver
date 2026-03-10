import React, { useEffect, useCallback, useRef, useState } from "react";
import { useGame } from "../../context/GameContext";
import { useSettings } from "../../context/SettingsContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { api } from "../../api/endpoints";
import { localHeuristicScores } from "../../engine/localEngine";
import type { WSMessage } from "../../types";

export const AIPanel: React.FC = () => {
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  const wsEnabled = state.mode === "ai_watch" || state.mode === "ai_assist";
  const showAiControls = state.mode === "ai_watch" || state.mode === "ai_assist";
  const startedRef = useRef(false);
  const [analysisCollapsed, setAnalysisCollapsed] = useState(false);

  const handleMessage = useCallback((msg: WSMessage) => {
    if (msg.type === "move") {
      dispatch({ type: "AI_MOVE", msg });
    }
    if (msg.type === "status" && (msg.status === "done" || msg.status === "stopped")) {
      dispatch({ type: "AI_STOP" });
    }
  }, [dispatch]);

  const { send } = useWebSocket(handleMessage, wsEnabled);

  // When aiRunning changes to true, send start command
  useEffect(() => {
    if (state.aiRunning && !state.over && !state.won) {
      send({
        action: "start",
        grid: state.grid,
        size: state.size,
        strategy: state.strategy,
        speed_ms: state.aiSpeed,
        score: state.score,
      });
      startedRef.current = true;
    }
  }, [state.aiRunning]);

  // Sync speed changes mid-game
  useEffect(() => {
    if (state.aiRunning) send({ action: "speed", speed_ms: state.aiSpeed });
  }, [state.aiSpeed]);

  // Keep analysis data populated for explain UI.
  useEffect(() => {
    if (!settings.aiExplain) return;
    if (state.grid.flat().every(v => v === 0)) return;

    let cancelled = false;
    const load = async () => {
      try {
        const analysis = await api.analysis(state.grid, state.size);
        if (!cancelled) dispatch({ type: "SET_ANALYSIS", analysis });
      } catch {
        const scores = localHeuristicScores(state.grid, state.size);
        const entries = Object.entries(scores).filter(([, v]) => Number.isFinite(v));
        const bestKey = entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "up";
        const bestMap: Record<string, 0 | 1 | 2 | 3> = { up: 0, down: 1, left: 2, right: 3 };
        if (!cancelled) {
          dispatch({ type: "SET_ANALYSIS", analysis: { scores, best_direction: bestMap[bestKey] ?? 0 } });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [settings.aiExplain, state.mode, state.grid, state.size, dispatch]);

  const start = () => {
    dispatch({ type: "AI_START" });
  };

  const pause = () => {
    send({ action: "pause" });
    dispatch({ type: "AI_PAUSE" });
  };

  const stop = () => {
    send({ action: "stop" });
    dispatch({ type: "AI_STOP" });
  };

  const scores = state.analysisScores?.scores;
  const dirLabels: Record<string, string> = { up: "⬆ Up", down: "⬇ Down", left: "⬅ Left", right: "➡ Right" };

  const validScores = scores
    ? Object.entries(scores).filter(([, v]) => v > -Infinity && isFinite(v))
    : [];
  const maxScore = validScores.length ? Math.max(...validScores.map(([, v]) => v)) : 1;
  const minScore = validScores.length ? Math.min(...validScores.map(([, v]) => v)) : 0;
  const span = Math.max(maxScore - minScore, 1);

  return (
    <div style={{ marginTop: 12 }}>
      {showAiControls && (
        <>
          {/* Controls */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={start} disabled={state.aiRunning || state.over} style={btnStyle("#27ae60")}>▶ Start</button>
            <button onClick={pause} disabled={!state.aiRunning} style={btnStyle("#f39c12")}>⏸ Pause</button>
            <button onClick={stop} disabled={!state.aiRunning} style={btnStyle("#e74c3c")}>⏹ Stop</button>
          </div>

          {/* Speed slider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Fast</span>
            <input
              type="range" min={100} max={1500} step={100}
              value={state.aiSpeed}
              onChange={e => dispatch({ type: "SET_SPEED", speed: Number(e.target.value) })}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Slow</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{state.aiSpeed}ms</span>
          </div>

          {/* Strategy selector */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            {(["deep", "greedy"] as const).map(s => (
              <button
                key={s}
                onClick={() => dispatch({ type: "SET_STRATEGY", strategy: s })}
                style={{
                  padding: "5px 12px", borderRadius: 5, border: "none",
                  background: state.strategy === s ? "#8f7a66" : "var(--surface-soft)",
                  color: state.strategy === s ? "#fff" : "var(--text)",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}
              >
                {s === "deep" ? "🧠 Expectiminimax" : "⚡ Greedy"}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Analysis bar chart */}
      {settings.aiExplain && scores && validScores.length > 0 && (
        <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: 10, marginTop: 4, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setAnalysisCollapsed(v => !v)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: analysisCollapsed ? 0 : 8,
              cursor: "pointer",
              padding: 0,
            }}
          >
            🧠 AI Analysis {analysisCollapsed ? "▸" : "▾"}
          </button>

          {!analysisCollapsed && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {["up", "down", "left", "right"].map(d => {
              const v = (scores as unknown as Record<string, number>)[d];
              const valid = isFinite(v) && v > -Infinity;
              const pct = valid ? Math.round(100 * (v - minScore) / span) : 0;
              const isBest = valid && v === maxScore;
              return (
                <div key={d} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isBest ? "#f59563" : "#8f7a66" }}>
                    {dirLabels[d]}
                  </div>
                  <div style={{ background: "#ddd", borderRadius: 3, height: 6, margin: "4px 0" }}>
                    <div style={{
                      width: `${pct}%`, height: 6, borderRadius: 3,
                      background: isBest ? "#f59563" : "#8f7a66",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>
                    {valid ? v.toFixed(1) : "—"}
                  </div>
                </div>
              );
            })}
              </div>

              {/* Explain top 2 choices */}
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                {validScores
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([key, value], idx) => {
                    const confidence = Math.max(0, Math.min(100, Math.round(((value - minScore) / span) * 100)));
                    return (
                      <div key={key}>
                        {idx + 1}. Prefer <strong>{dirLabels[key]}</strong> ({value.toFixed(1)}) - confidence {confidence}%
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 6, border: "none",
    background: bg, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  };
}
