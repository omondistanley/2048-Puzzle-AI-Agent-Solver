import React from "react";

interface Props {
  score: number;
  maxTile: number;
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<Props> = ({ score, maxTile, onPlayAgain }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
  }}>
    <div style={{
      background: "var(--surface)", color: "var(--text)", borderRadius: 12, padding: 32, textAlign: "center",
      border: "1px solid var(--border)",
      maxWidth: 320, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
      <h2 style={{ margin: "0 0 8px", color: "var(--text)" }}>Game Over!</h2>
      <p style={{ color: "var(--muted)", margin: "0 0 4px" }}>Max tile: <strong>{maxTile}</strong></p>
      <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>Score: <strong>{score}</strong></p>
      {maxTile >= 2048 && (
        <div style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 14 }}>
          🏆 You reached 2048!
        </div>
      )}
      <button onClick={onPlayAgain} style={{
        background: "#f59563", color: "#fff", border: "none",
        padding: "12px 28px", borderRadius: 8, fontWeight: 800,
        fontSize: 16, cursor: "pointer",
      }}>
        Play Again
      </button>
    </div>
  </div>
);
