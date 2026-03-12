import type { BoardTheme, TileSkin } from "../types";

export interface CosmeticMeta<T extends string> {
  id: T;
  name: string;
  cost: number;
}

export const BOARD_THEMES: CosmeticMeta<BoardTheme>[] = [
  { id: "violet", name: "Violet", cost: 0 },
  { id: "midnight", name: "Midnight", cost: 45 },
  { id: "sunrise", name: "Sunrise", cost: 90 },
];

export const TILE_SKINS: CosmeticMeta<TileSkin>[] = [
  { id: "classic", name: "Classic", cost: 0 },
  { id: "glass", name: "Glass", cost: 35 },
  { id: "neon", name: "Neon", cost: 75 },
];

export interface CosmeticInventory {
  coins: number;
  unlockedThemes: BoardTheme[];
  unlockedSkins: TileSkin[];
}

export const DEFAULT_COSMETICS: CosmeticInventory = {
  coins: 0,
  unlockedThemes: ["violet"],
  unlockedSkins: ["classic"],
};

export const ACHIEVEMENT_COSMETIC_REWARDS: Record<string, { themes?: BoardTheme[]; skins?: TileSkin[]; coins?: number }> = {
  tile_1024: { themes: ["midnight"], coins: 15 },
  tile_2048: { themes: ["sunrise"], coins: 30 },
  streak_7: { skins: ["glass"], coins: 20 },
  century: { skins: ["neon"], coins: 45 },
};

export function unlockCosmetics(
  prev: CosmeticInventory,
  rewards: { themes?: BoardTheme[]; skins?: TileSkin[]; coins?: number }[],
): { next: CosmeticInventory; unlockedThemeNames: BoardTheme[]; unlockedSkinNames: TileSkin[]; coinsGained: number } {
  const themeSet = new Set(prev.unlockedThemes);
  const skinSet = new Set(prev.unlockedSkins);
  const unlockedThemeNames: BoardTheme[] = [];
  const unlockedSkinNames: TileSkin[] = [];
  let coinsGained = 0;

  for (const reward of rewards) {
    for (const t of reward.themes ?? []) {
      if (!themeSet.has(t)) {
        themeSet.add(t);
        unlockedThemeNames.push(t);
      }
    }
    for (const s of reward.skins ?? []) {
      if (!skinSet.has(s)) {
        skinSet.add(s);
        unlockedSkinNames.push(s);
      }
    }
    coinsGained += reward.coins ?? 0;
  }

  return {
    next: {
      coins: prev.coins + coinsGained,
      unlockedThemes: [...themeSet],
      unlockedSkins: [...skinSet],
    },
    unlockedThemeNames,
    unlockedSkinNames,
    coinsGained,
  };
}
