import React from "react";
import { StatsPanel } from "./StatsPanel";
import { AchievementsPanel } from "./AchievementsPanel";
import { ReplayPanel } from "./ReplayPanel";
import { SettingsPanel } from "./SettingsPanel";
import type { PlayerStats, ReplayRecord } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onDailyGame: () => void;
  stats: PlayerStats;
  bestScore: number;
  unlocked: Set<string>;
  replays: ReplayRecord[];
  colorblind: boolean;
  dailyStreak: number;
}

export const Sidebar: React.FC<Props> = ({
  open, onClose, onDailyGame, stats, bestScore, unlocked, replays, colorblind, dailyStreak,
}) => {
  const hr = () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0 0 24px" }} />
  );

  return (
    <>
      {/* Backdrop — always mounted, animated via class */}
      <div
        className={`sidebar-backdrop${open ? " open" : ""}`}
        onClick={onClose}
      />

      {/* Drawer — always mounted, slides in/out */}
      <div className={`sidebar-drawer${open ? " open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: "var(--text)" }}>🧩 2048 Menu</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ minHeight: 36, fontSize: 20, padding: "0 8px" }}
            aria-label="Close menu"
          >✕</button>
        </div>

        {/* Daily Challenge entry + streak badge */}
        <button
          onClick={() => { onDailyGame(); onClose(); }}
          style={{
            width: "100%",
            background: dailyStreak > 0
              ? "linear-gradient(135deg, #ff9f43 0%, #ff6b00 100%)"
              : "var(--surface-soft)",
            border: dailyStreak > 0 ? "1px solid rgba(255,246,201,0.6)" : "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            color: dailyStreak > 0 ? "#fff" : "var(--text)",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: dailyStreak > 0 ? "0 0 12px rgba(255,140,0,0.4)" : "none",
          }}
        >
          <span>📅 Daily Challenge</span>
          {dailyStreak > 0 && (
            <span style={{ fontSize: 13, fontWeight: 800 }}>🔥 {dailyStreak}-day streak</span>
          )}
        </button>

        <section style={{ marginBottom: 24 }}><StatsPanel stats={stats} bestScore={bestScore} /></section>
        {hr()}
        <section style={{ marginBottom: 24 }}><AchievementsPanel unlocked={unlocked} /></section>
        {hr()}
        <section style={{ marginBottom: 24 }}><ReplayPanel replays={replays} colorblind={colorblind} /></section>
        {hr()}
        <section><SettingsPanel /></section>
      </div>
    </>
  );
};
