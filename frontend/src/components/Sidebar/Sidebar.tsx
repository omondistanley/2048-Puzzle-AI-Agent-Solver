import React from "react";
import { StatsPanel } from "./StatsPanel";
import { AchievementsPanel } from "./AchievementsPanel";
import { ReplayPanel } from "./ReplayPanel";
import { SettingsPanel } from "./SettingsPanel";
import type { PlayerStats, ReplayRecord } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  stats: PlayerStats;
  bestScore: number;
  unlocked: Set<string>;
  replays: ReplayRecord[];
  colorblind: boolean;
  dailyStreak: number;
}

export const Sidebar: React.FC<Props> = ({
  open, onClose, stats, bestScore, unlocked, replays, colorblind, dailyStreak,
}) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 320, maxWidth: "100vw",
        height: "100vh", background: "var(--surface)", color: "var(--text)", zIndex: 101, overflowY: "auto",
        padding: 20, boxSizing: "border-box",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: "var(--text)" }}>🧩 2048 Menu</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22,
            cursor: "pointer", color: "var(--text)",
          }}>✕</button>
        </div>

        {dailyStreak > 0 && (
          <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 13, border: "1px solid var(--border)" }}>
            🔥 Daily streak: <strong>{dailyStreak}</strong> day{dailyStreak !== 1 ? "s" : ""}
          </div>
        )}

        <section style={{ marginBottom: 24 }}><StatsPanel stats={stats} bestScore={bestScore} /></section>
        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0 0 24px" }} />
        <section style={{ marginBottom: 24 }}><AchievementsPanel unlocked={unlocked} /></section>
        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0 0 24px" }} />
        <section style={{ marginBottom: 24 }}><ReplayPanel replays={replays} colorblind={colorblind} /></section>
        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0 0 24px" }} />
        <section><SettingsPanel /></section>
      </div>
    </>
  );
};
