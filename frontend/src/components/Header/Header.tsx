import React from "react";
import { ScoreBox } from "./ScoreBox";
import { useGame } from "../../context/GameContext";

interface Props {
  onNewGame: () => void;
  onDailyGame: () => void;
  onOpenSidebar: () => void;
  bestScore: number;
}

export const Header: React.FC<Props> = ({ onNewGame, onDailyGame, onOpenSidebar, bestScore }) => {
  const { state } = useGame();

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 8, marginBottom: 12,
    }}>
      {/* Logo */}
      <div style={{ fontSize: 40, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
        2048
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>AI Solver</span>
      </div>

      {/* Scores */}
      <div style={{ display: "flex", gap: 8 }}>
        <ScoreBox label="SCORE" score={state.score} />
        <ScoreBox label="BEST" score={bestScore} />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={onNewGame} style={btnStyle("#8f7a66")}>New Game</button>
        <button onClick={onDailyGame} style={btnStyle("#f59563")}>📅 Daily</button>
        <button onClick={onOpenSidebar} style={btnStyle("#bbada0")} aria-label="Open menu">☰</button>
      </div>
    </div>
  );
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#f9f6f2",
    border: "none",
    borderRadius: 6,
    padding: "8px 14px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(0,0,0,0.18)",
  };
}
