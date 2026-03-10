import React from "react";
import { useGame } from "../../context/GameContext";

export const UndoButton: React.FC = () => {
  const { state, dispatch } = useGame();
  const remaining = state.undoBudget - state.undosUsed;
  const canUndo = state.undoStack.length > 0 && remaining > 0;

  return (
    <button
      onClick={() => dispatch({ type: "UNDO" })}
      disabled={!canUndo}
      style={{
        padding: "8px 16px",
        borderRadius: 6,
        border: "none",
        background: canUndo ? "#8f7a66" : "#ccc",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: canUndo ? "pointer" : "not-allowed",
      }}
    >
      ↩ Undo {state.undoBudget > 0 ? `(${remaining})` : ""}
    </button>
  );
};
