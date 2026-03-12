import type { TileSkin } from "../types";

export type Palette = Record<number, [string, string]>; // [bg, fg]

export const NORMAL_PALETTE: Palette = {
  0:     ["#cdc1b4", "#776e65"],
  2:     ["#eee4da", "#776e65"],
  4:     ["#ede0c8", "#776e65"],
  8:     ["#f2b179", "#f9f6f2"],
  16:    ["#f59563", "#f9f6f2"],
  32:    ["#f67c5f", "#f9f6f2"],
  64:    ["#f65e3b", "#f9f6f2"],
  128:   ["#edcf72", "#f9f6f2"],
  256:   ["#edcc61", "#f9f6f2"],
  512:   ["#edcf72", "#f9f6f2"],
  1024:  ["#edc948", "#f9f6f2"],
  2048:  ["#edc22e", "#f9f6f2"],
  4096:  ["#3e3933", "#f9f6f2"],
  8192:  ["#3e3933", "#f9f6f2"],
};

export const CB_PALETTE: Palette = {
  0:     ["#c8c8c8", "#555"],
  2:     ["#ddeeff", "#334"],
  4:     ["#aaccff", "#223"],
  8:     ["#88aaff", "#f9f6f2"],
  16:    ["#5577ee", "#f9f6f2"],
  32:    ["#3355cc", "#f9f6f2"],
  64:    ["#1133aa", "#f9f6f2"],
  128:   ["#ffcc44", "#333"],
  256:   ["#ffaa22", "#333"],
  512:   ["#ff8800", "#f9f6f2"],
  1024:  ["#dd6600", "#f9f6f2"],
  2048:  ["#bb4400", "#f9f6f2"],
  4096:  ["#882200", "#f9f6f2"],
  8192:  ["#550000", "#f9f6f2"],
};

const GLASS_PALETTE: Palette = {
  0: ["rgba(255,255,255,0.18)", "#f3e9ff"],
  2: ["rgba(234,225,255,0.35)", "#2b1f3d"],
  4: ["rgba(217,201,255,0.4)", "#2b1f3d"],
  8: ["rgba(202,173,255,0.5)", "#ffffff"],
  16: ["rgba(182,140,255,0.58)", "#ffffff"],
  32: ["rgba(167,119,255,0.62)", "#ffffff"],
  64: ["rgba(149,95,246,0.72)", "#ffffff"],
  128: ["rgba(243,196,102,0.74)", "#1f1532"],
  256: ["rgba(238,179,86,0.78)", "#1f1532"],
  512: ["rgba(236,160,69,0.82)", "#1f1532"],
  1024: ["rgba(231,145,56,0.87)", "#ffffff"],
  2048: ["rgba(225,131,43,0.94)", "#ffffff"],
  4096: ["rgba(89,64,133,0.94)", "#ffffff"],
  8192: ["rgba(67,47,108,0.96)", "#ffffff"],
};

const NEON_PALETTE: Palette = {
  0: ["#221833", "#f6ebff"],
  2: ["#3f2a64", "#f8f1ff"],
  4: ["#523680", "#f8f1ff"],
  8: ["#6a3ed0", "#ffffff"],
  16: ["#7f38f1", "#ffffff"],
  32: ["#932dff", "#ffffff"],
  64: ["#ad2bee", "#ffffff"],
  128: ["#ff8b3d", "#ffffff"],
  256: ["#ff7b2e", "#ffffff"],
  512: ["#ff6a1f", "#ffffff"],
  1024: ["#ff5912", "#ffffff"],
  2048: ["#ff4810", "#ffffff"],
  4096: ["#09b6ff", "#ffffff"],
  8192: ["#00a0e8", "#ffffff"],
};

export function getTileColors(value: number, colorblind: boolean, skin: TileSkin = "classic"): [string, string] {
  let palette = NORMAL_PALETTE;
  if (skin === "glass") palette = GLASS_PALETTE;
  if (skin === "neon") palette = NEON_PALETTE;
  if (colorblind) palette = CB_PALETTE;
  return palette[value] ?? ["#3e3933", "#f9f6f2"];
}

export function getTileFontSize(value: number): string {
  if (value < 128) return "1.9rem";
  if (value < 1024) return "1.55rem";
  if (value === 1024) return "1.34rem";
  if (value < 4096) return "1.2rem";
  if (value < 10000) return "1.02rem";
  return "0.9rem";
}

export function getTileFontWeight(value: number): number {
  if (value < 128) return 800;
  if (value < 2048) return 820;
  return 860;
}
