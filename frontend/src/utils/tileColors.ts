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
  512:   ["#edc850", "#f9f6f2"],
  1024:  ["#edc53f", "#f9f6f2"],
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

export function getTileColors(value: number, colorblind: boolean): [string, string] {
  const palette = colorblind ? CB_PALETTE : NORMAL_PALETTE;
  return palette[value] ?? ["#3e3933", "#f9f6f2"];
}

export function getTileFontSize(value: number): string {
  if (value < 100) return "2rem";
  if (value < 1000) return "1.6rem";
  if (value < 10000) return "1.2rem";
  return "0.9rem";
}
