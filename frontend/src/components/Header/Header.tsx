import React from "react";
import { ScoreBox } from "./ScoreBox";
import { useGame } from "../../context/GameContext";

interface Props {
  onNewGame: () => void;
  onDailyGame: () => void;
  onOpenSidebar: () => void;
  bestScore: number;
  dailyStreak: number;
}

export const Header: React.FC<Props> = ({ onNewGame, onOpenSidebar, bestScore, dailyStreak }) => {
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
        {dailyStreak > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700, marginLeft: 10,
            background: "linear-gradient(135deg,#ff9f43,#ff6b00)",
            color: "#fff", borderRadius: 20, padding: "2px 8px",
            verticalAlign: "middle",
          }}>
            🔥 {dailyStreak}
          </span>
        )}
      </div>

      {/* Scores */}
      <div style={{ display: "flex", gap: 8 }}>
        <ScoreBox label="SCORE" score={state.score} />
        <ScoreBox label="BEST" score={bestScore} />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-primary" onClick={onNewGame}>New Game</button>
        <button className="btn btn-menu" onClick={onOpenSidebar} aria-label="Open menu">☰</button>
      </div>
    </div>
  );
};
