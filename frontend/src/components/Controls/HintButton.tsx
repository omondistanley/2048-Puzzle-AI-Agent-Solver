import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../../context/GameContext";
import { api } from "../../api/endpoints";
import { localMoveCore, bestLocalDirection } from "../../engine/localEngine";
import type { Direction } from "../../types";

function ghostGrid(grid: number[][], direction: Direction, size: number): number[][] {
  const { after } = localMoveCore(grid, direction, size);
  return after;
}

export const HintButton: React.FC = () => {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear hint after 3 seconds
  useEffect(() => {
    if (state.hintDirection !== null && state.hintDirection !== undefined) {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        dispatch({ type: "CLEAR_HINT" });
      }, 3000);
    }
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [state.hintDirection, dispatch]);

  const handleHint = async () => {
    if (state.over || state.grid.flat().every(v => v === 0)) return;
    setLoading(true);
    try {
      const hint = await api.hint(state.grid, state.size, state.strategy);
      const preview = ghostGrid(state.grid, hint.direction, state.size);
      dispatch({ type: "SET_HINT", hint, hintGrid: preview });
    } catch {
      const dir = bestLocalDirection(state.grid, state.size);
      if (dir !== null) {
        const preview = ghostGrid(state.grid, dir, state.size);
        dispatch({
          type: "SET_HINT",
          hint: { direction: dir, heuristic_scores: { up: 0, down: 0, left: 0, right: 0 }, empty: 0, monotonicity: 0, smoothness: 0 },
          hintGrid: preview,
        });
      }
    }
    setLoading(false);
  };

  return (
    <button
      className="btn btn-accent"
      onClick={handleHint}
      disabled={loading || state.over}
      style={{ minWidth: 90 }}
    >
      {loading
        ? <><span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span> Thinking…</>
        : "💡 Hint"
      }
    </button>
  );
};
