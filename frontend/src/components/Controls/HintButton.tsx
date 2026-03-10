import React, { useState } from "react";
import { useGame } from "../../context/GameContext";
import { api } from "../../api/endpoints";

export const HintButton: React.FC = () => {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);

  const handleHint = async () => {
    if (state.over || state.grid.flat().every(v => v === 0)) return;
    setLoading(true);
    try {
      const hint = await api.hint(state.grid, state.size, state.strategy);
      // Compute ghost grid (apply move without tile spawn)
      const ghostGrid = await api.move(state.grid, hint.direction, state.score, state.size)
        .then(r => r.grid).catch(() => null);
      dispatch({ type: "SET_HINT", hint, hintGrid: ghostGrid ?? state.grid });
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={handleHint}
      disabled={loading || state.over}
      style={{
        padding: "8px 16px",
        borderRadius: 6,
        border: "none",
        background: loading ? "#ccc" : "#f59563",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Thinking…" : "💡 Hint"}
    </button>
  );
};
