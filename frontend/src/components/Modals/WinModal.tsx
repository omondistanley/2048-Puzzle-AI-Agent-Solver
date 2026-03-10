import React from "react";

interface Props {
  score: number;
  onKeepGoing: () => void;
  onEnd: () => void;
}

export const WinModal: React.FC<Props> = ({ score, onKeepGoing, onEnd }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
  }}>
    <div style={{
      background: "var(--surface)", color: "var(--text)", borderRadius: 12, padding: 32, textAlign: "center",
      border: "1px solid var(--border)",
      maxWidth: 320, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
    }}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
      <h2 style={{ margin: "0 0 8px", color: "#f59563" }}>You reached 2048!</h2>
      <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>Score: <strong>{score}</strong></p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={onKeepGoing} style={{
          background: "#f59563", color: "#fff", border: "none",
          padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Keep Going!</button>
        <button onClick={onEnd} style={{
          background: "#8f7a66", color: "#fff", border: "none",
          padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>End Game</button>
      </div>
    </div>
  </div>
);
