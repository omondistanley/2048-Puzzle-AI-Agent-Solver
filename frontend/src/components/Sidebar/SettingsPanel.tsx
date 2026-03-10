import React from "react";
import { useSettings } from "../../context/SettingsContext";

export const SettingsPanel: React.FC = () => {
  const { settings, update } = useSettings();

  const toggle = (key: keyof typeof settings) => update({ [key]: !settings[key] } as any);

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", color: "var(--text)" }}>⚙️ Settings</h3>

      {/* Toggles */}
      {([
        ["darkMode",     "🌗 Dark mode"],
        ["colorblind",    "👁 Colorblind mode (blue-orange)"],
        ["reducedMotion", "🎭 Reduce animations"],
        ["sound",         "🔊 Sound"],
        ["haptics",       "📳 Haptics (mobile vibration)"],
        ["aiExplain",     "🧠 AI explain panel"],
        ["wasd",          "⌨️ WASD keys"],
      ] as [keyof typeof settings, string][]).map(([key, label]) => (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "var(--text)" }}>{label}</span>
          <button
            onClick={() => toggle(key)}
            style={{
              padding: "4px 12px", borderRadius: 12, border: "none",
              background: settings[key] ? "#f59563" : "#ddd",
              color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}
          >
            {settings[key] ? "ON" : "OFF"}
          </button>
        </div>
      ))}

      {/* Undo budget */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
          Undo budget: <strong>{settings.undoBudget === 0 ? "Purist (0)" : settings.undoBudget}</strong>
        </div>
        <input type="range" min={0} max={10} value={settings.undoBudget}
          onChange={e => update({ undoBudget: Number(e.target.value) })}
          style={{ width: "100%" }} />
      </div>

      {/* Board size */}
      <div>
        <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
          Default board size: <strong>{settings.defaultSize}×{settings.defaultSize}</strong>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[3, 4, 5, 6].map(s => (
            <button key={s}
              onClick={() => update({ defaultSize: s })}
              style={{
                padding: "4px 10px", borderRadius: 5, border: "none",
                background: settings.defaultSize === s ? "#f59563" : "#eee4da",
                color: settings.defaultSize === s ? "#fff" : "var(--text)",
                fontWeight: 600, cursor: "pointer",
              }}
            >{s}×{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
