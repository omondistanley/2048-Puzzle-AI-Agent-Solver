import React, { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  score: number;
}

export const ScoreBox: React.FC<Props> = ({ label, score }) => {
  const prev = useRef(score);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (score !== prev.current) {
      prev.current = score;
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <div style={{
      background: "var(--surface-soft)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "6px 14px",
      textAlign: "center",
      minWidth: 80,
      transition: bump ? "transform 0.15s" : undefined,
      transform: bump ? "scale(1.12)" : "scale(1)",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 22, color: "var(--text)", fontWeight: 800 }}>{score}</div>
    </div>
  );
};
