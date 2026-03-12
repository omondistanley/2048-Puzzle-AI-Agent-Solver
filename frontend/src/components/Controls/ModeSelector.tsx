import React from "react";
import type { GameMode } from "../../types";
import { useGame } from "../../context/GameContext";

const MODES: { id: GameMode; label: string; icon: string }[] = [
  { id: "human",     label: "Human", icon: "person" },
  { id: "ai_watch",  label: "AI Watch", icon: "visibility" },
  { id: "ai_assist", label: "Assist", icon: "handshake" },
];

export const ModeSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { state, dispatch } = useGame();

  return (
    <div className={`mode-selector${compact ? " compact" : ""}`}>
      {MODES.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => dispatch({ type: "SET_MODE", mode: id })}
          className={`mode-button${state.mode === id ? " active" : ""}`}
          title={label}
        >
          <span className="material-symbols-outlined mode-icon" aria-hidden="true">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
};
