import React from "react";
import { ACHIEVEMENT_DEFS } from "../../utils/achievementDefs";

interface Props { unlocked: Set<string>; }

export const AchievementsPanel: React.FC<Props> = ({ unlocked }) => (
  <div>
    <h3 style={{ margin: "0 0 12px", color: "var(--text)" }}>🏆 Achievements</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ACHIEVEMENT_DEFS.map(a => {
        const done = unlocked.has(a.id);
        return (
          <div key={a.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            opacity: done ? 1 : 0.35,
          }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: done ? 700 : 400, color: "var(--text)" }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.desc}</div>
            </div>
            {done && <span style={{ marginLeft: "auto", fontSize: 11, color: "#2ecc71" }}>✓</span>}
          </div>
        );
      })}
    </div>
  </div>
);
