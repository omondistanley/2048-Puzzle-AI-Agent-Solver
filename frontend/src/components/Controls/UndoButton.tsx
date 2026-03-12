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
      className="btn btn-primary"
      style={{ minWidth: 108 }}
    >
      ↩ Undo {state.undoBudget > 0 ? `(${remaining})` : ""}
    </button>
  );
};
