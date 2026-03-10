import React from "react";
import type { GameMode } from "../../types";
import { useGame } from "../../context/GameContext";

const MODES: { id: GameMode; label: string }[] = [
  { id: "human",     label: "🎮 Human" },
  { id: "ai_watch",  label: "👁 AI Watch" },
  { id: "ai_assist", label: "🤝 AI Assist" },
];

export const ModeSelector: React.FC = () => {
  const { state, dispatch } = useGame();

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 12, justifyContent: "center" }}>
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => dispatch({ type: "SET_MODE", mode: id })}
          style={{
            padding: "7px 14px",
            borderRadius: 6,
            border: "none",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            background: state.mode === id ? "#f59563" : "#eee4da",
            color: state.mode === id ? "#fff" : "#776e65",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
