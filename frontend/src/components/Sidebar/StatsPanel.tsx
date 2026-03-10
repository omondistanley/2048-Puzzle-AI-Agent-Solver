import React from "react";
import type { PlayerStats } from "../../types";

interface Props { stats: PlayerStats; bestScore: number; }

export const StatsPanel: React.FC<Props> = ({ stats, bestScore }) => {
  const wr = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed * 100).toFixed(0) : "0";
  const avg = stats.scores.length > 0
    ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
    : 0;
  const avgTile = stats.maxTiles.length > 0
    ? Math.round(stats.maxTiles.reduce((a, b) => a + b, 0) / stats.maxTiles.length)
    : 0;

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", color: "var(--text)" }}>📊 Statistics</h3>
      {stats.gamesPlayed === 0
        ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No completed games yet.</p>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Games", stats.gamesPlayed],
              ["Win Rate", `${wr}%`],
              ["Avg Score", avg],
              ["Avg Tile", avgTile],
              ["Best Score", bestScore],
              ["Best Tile", Math.max(...stats.maxTiles)],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{val}</div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
};
