import React, { createContext, useContext, useState, useCallback } from "react";
import type { Settings } from "../types";
import { lsGet, lsSet } from "../hooks/useLocalStorage";

const SETTINGS_KEY = "2048:settings";

const defaultSettings: Settings = {
  darkMode: false,
  colorblind: false,
  reducedMotion: false,
  sound: true,
  haptics: true,
  aiExplain: true,
  undoBudget: 3,
  defaultSize: 4,
  wasd: true,
  boardTheme: "violet",
  tileSkin: "classic",
};

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: defaultSettings, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = lsGet<Partial<Settings>>(SETTINGS_KEY, {});
    return { ...defaultSettings, ...saved };
  });

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      lsSet(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
