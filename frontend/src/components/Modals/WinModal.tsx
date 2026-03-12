import React from "react";

const CONFETTI_COLORS = ["#f59563","#edc22e","#f65e3b","#27ae60","#3498db","#9b59b6"];

function Confetti() {
  const pieces = Array.from({ length: 22 }, (_, i) => {
    const left = 10 + Math.random() * 80;
    const top  = 10 + Math.random() * 60;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const delay = (Math.random() * 0.5).toFixed(2);
    const rotate = Math.round(Math.random() * 360);
    return (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          background: color,
          animationDelay: `${delay}s`,
          transform: `rotate(${rotate}deg)`,
        }}
      />
    );
  });
  return <>{pieces}</>;
}

interface Props {
  score: number;
  onKeepGoing: () => void;
  onEnd: () => void;
}

export const WinModal: React.FC<Props> = ({ score, onKeepGoing, onEnd }) => (
  <div className="modal-overlay">
    <div className="modal-card">
      <Confetti />
      <div style={{ fontSize: 56, marginBottom: 8, position: "relative", zIndex: 1 }}>🏆</div>
      <h2 style={{ margin: "0 0 8px", color: "#f59563", position: "relative", zIndex: 1 }}>
        You reached 2048!
      </h2>
      <p style={{ color: "var(--muted)", margin: "0 0 20px", position: "relative", zIndex: 1 }}>
        Score: <strong>{score}</strong>
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", position: "relative", zIndex: 1 }}>
        <button className="btn btn-accent" onClick={onKeepGoing}>Keep Going!</button>
        <button className="btn btn-primary" onClick={onEnd}>End Game</button>
      </div>
    </div>
  </div>
);
