import React from "react";

interface Props {
  score: number;
  maxTile: number;
  moveCount?: number;
  onPlayAgain: () => void;
}

function shareScore(score: number, maxTile: number, moveCount?: number) {
  const text = `🎮 2048 AI Solver\nScore: ${score} | Max Tile: ${maxTile}${moveCount ? ` | Moves: ${moveCount}` : ""}\nPlay at 2048!`;
  if (navigator.share) {
    navigator.share({ title: "My 2048 Score", text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).then(() => {
      alert("Score copied to clipboard!");
    }).catch(() => {});
  }
}

export const GameOverModal: React.FC<Props> = ({ score, maxTile, moveCount, onPlayAgain }) => (
  <div className="modal-overlay">
    <div className="modal-card">
      <div style={{ fontSize: 48, marginBottom: 8 }}>🏁</div>
      <h2 style={{ margin: "0 0 8px", color: "var(--text)" }}>Game Over!</h2>
      <p style={{ color: "var(--muted)", margin: "0 0 4px" }}>Max tile: <strong>{maxTile}</strong></p>
      <p style={{ color: "var(--muted)", margin: "0 0 4px" }}>Score: <strong>{score}</strong></p>
      {moveCount !== undefined && (
        <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>Moves: <strong>{moveCount}</strong></p>
      )}
      {maxTile >= 2048 && (
        <div style={{
          background: "var(--surface-soft)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 14,
        }}>
          🏆 You reached 2048!
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-accent" onClick={onPlayAgain}>Play Again</button>
        <button
          className="btn btn-primary"
          onClick={() => shareScore(score, maxTile, moveCount)}
        >
          Share 📤
        </button>
      </div>
    </div>
  </div>
);
