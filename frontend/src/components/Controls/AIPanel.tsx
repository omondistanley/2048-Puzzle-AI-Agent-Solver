import React, { useEffect, useCallback, useRef, useState } from "react";
import { useGame } from "../../context/GameContext";
import { useSettings } from "../../context/SettingsContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { api } from "../../api/endpoints";
import { localHeuristicScores } from "../../engine/localEngine";
import type { WSMessage } from "../../types";

/**
 * Softmax confidence: converts raw heuristic scores into probabilities.
 * Uses temperature scaling so close scores don't all collapse to ~25%.
 * Only valid (finite) directions are included; invalid ones get 0%.
 */
function softmaxConfidence(scores: Record<string, number>): Record<string, number> {
  const valid = Object.entries(scores).filter(([, v]) => isFinite(v) && v > -Infinity);
  if (valid.length === 0) return { up: 0, down: 0, left: 0, right: 0 };

  // Temperature: lower = more decisive, higher = more uniform. 0.5 gives good spread.
  const T = 0.5;
  const shifted = valid.map(([k, v]) => [k, v] as [string, number]);
  const maxVal = Math.max(...shifted.map(([, v]) => v));
  const exps = shifted.map(([k, v]) => [k, Math.exp((v - maxVal) / T)] as [string, number]);
  const sum = exps.reduce((s, [, e]) => s + e, 0);

  const result: Record<string, number> = { up: 0, down: 0, left: 0, right: 0 };
  exps.forEach(([k, e]) => { result[k] = Math.round((e / sum) * 100); });
  return result;
}

const DIR_ARROWS: Record<string, string> = { up: "⬆", down: "⬇", left: "⬅", right: "➡" };
const DIR_LABELS: Record<string, string> = { up: "Up", down: "Down", left: "Left", right: "Right" };

/** Template-based explanation for why a direction scores well or poorly. */
function buildExplanation(
  dir: string,
  score: number,
  confidence: number,
  isBest: boolean,
  isInvalid: boolean,
  allScores: Record<string, number>,
): string {
  if (isInvalid) return "This move is blocked — no tiles can slide in this direction.";

  const validScores = Object.values(allScores).filter(v => isFinite(v) && v > -Infinity);
  const maxScore = Math.max(...validScores);
  const minScore = Math.min(...validScores);
  const range = maxScore - minScore;
  const relPos = range > 0 ? (score - minScore) / range : 1;

  if (isBest) {
    if (confidence >= 70) return `Strong choice. Moving ${DIR_LABELS[dir]} scores ${score.toFixed(1)}, significantly better than all alternatives. The AI is ${confidence}% confident this is optimal.`;
    if (confidence >= 50) return `Best available move. Moving ${DIR_LABELS[dir]} (score ${score.toFixed(1)}) edges out the alternatives. ${confidence}% confidence — a few directions are competitive.`;
    return `Slight edge. Moving ${DIR_LABELS[dir]} scores ${score.toFixed(1)}, marginally better than other options. At ${confidence}% confidence, the board is fairly balanced — any of the top moves could work.`;
  }

  if (relPos < 0.25) return `Weak move. Moving ${DIR_LABELS[dir]} scores ${score.toFixed(1)}, near the bottom. It likely leaves fewer empty cells or breaks tile ordering.`;
  if (relPos < 0.6) return `Acceptable move (score ${score.toFixed(1)}), but ${confidence}% confidence means better options exist. Consider the ${DIR_LABELS[Object.entries(allScores).sort((a,b) => b[1]-a[1])[0][0]]} direction instead.`;
  return `Good move but not the best. Moving ${DIR_LABELS[dir]} scores ${score.toFixed(1)} with ${confidence}% confidence. Very close to optimal.`;
}

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

  // Cast once via unknown so all downstream uses are clean.
  const scores: Record<string, number> | undefined =
    state.analysisScores?.scores as unknown as Record<string, number> | undefined;

  const validScores = scores
    ? Object.entries(scores).filter(([, v]) => v > -Infinity && isFinite(v))
    : [];
  const maxScore = validScores.length ? Math.max(...validScores.map(([, v]) => v)) : 1;

  // Softmax-based confidence — meaningful relative probabilities.
  const confidence = scores ? softmaxConfidence(scores) : null;

  const [expandedDir, setExpandedDir] = useState<string | null>(null);

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

      {/* Analysis panel */}
      {settings.aiExplain && scores && validScores.length > 0 && confidence && (
        <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: 10, marginTop: 4, border: "1px solid var(--border)" }}>
          <button
            onClick={() => setAnalysisCollapsed(v => !v)}
            style={{
              width: "100%", textAlign: "left", background: "transparent", border: "none",
              color: "var(--text)", fontSize: 12, fontWeight: 700,
              marginBottom: analysisCollapsed ? 0 : 8, cursor: "pointer", padding: 0,
            }}
          >
            🧠 AI Analysis {analysisCollapsed ? "▸" : "▾"}
          </button>

          {!analysisCollapsed && (
            <>
              {/* Confidence legend */}
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, lineHeight: 1.4 }}>
                Confidence = softmax probability across valid moves.
                Tap a direction for an explanation.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {["up", "down", "left", "right"].map(d => {
                  const v = scores[d];
                  const isInvalid = !isFinite(v) || v <= -Infinity;
                  const isBest = !isInvalid && v === maxScore;
                  const conf = confidence[d] ?? 0;
                  const isExpanded = expandedDir === d;

                  return (
                    <div key={d} style={{ textAlign: "center" }}>
                      <button
                        onClick={() => setExpandedDir(isExpanded ? null : d)}
                        style={{
                          width: "100%", background: "transparent", border: "none",
                          cursor: "pointer", padding: "2px 0",
                        }}
                        title="Tap for explanation"
                      >
                        {/* Direction label */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: isBest ? "#f59563" : isInvalid ? "var(--muted)" : "var(--text)" }}>
                          {DIR_ARROWS[d]} {DIR_LABELS[d]}
                        </div>
                        {/* Confidence bar */}
                        <div style={{ background: "var(--border)", borderRadius: 3, height: 6, margin: "4px 0" }}>
                          <div style={{
                            width: isInvalid ? "0%" : `${conf}%`,
                            height: 6, borderRadius: 3,
                            background: isBest ? "#f59563" : isInvalid ? "transparent" : "#8f7a66",
                            transition: "width 300ms ease",
                          }} />
                        </div>
                        {/* Confidence % */}
                        <div style={{ fontSize: 10, fontWeight: 600, color: isBest ? "#f59563" : isInvalid ? "var(--muted)" : "var(--text)" }}>
                          {isInvalid ? "blocked" : `${conf}%`}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Explanation card — shown below grid when a direction is tapped */}
              {expandedDir && (() => {
                const v = scores[expandedDir];
                const isInvalid = !isFinite(v) || v <= -Infinity;
                const isBest = !isInvalid && v === maxScore;
                return (
                  <div style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    background: "var(--surface)",
                    border: `1px solid ${isBest ? "#f59563" : "var(--border)"}`,
                    borderRadius: 6,
                    fontSize: 11,
                    color: "var(--text)",
                    lineHeight: 1.5,
                  }}>
                    <strong>{DIR_ARROWS[expandedDir]} {DIR_LABELS[expandedDir]}</strong>
                    {" — "}
                    {buildExplanation(expandedDir, v, confidence[expandedDir] ?? 0, isBest, isInvalid, scores)}
                  </div>
                );
              })()}

              {/* Top recommendation summary */}
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
                {validScores
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([key], idx) => (
                    <div key={key}>
                      {idx === 0 ? "✅" : "🔹"}{" "}
                      <strong>{DIR_ARROWS[key]} {DIR_LABELS[key]}</strong>
                      {" "}— {confidence[key]}% confidence
                      {idx === 0 ? " (recommended)" : ""}
                    </div>
                  ))}
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
