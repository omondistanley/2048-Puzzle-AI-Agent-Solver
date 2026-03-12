import React from "react";
import type { TileData } from "../../types";
import { getTileColors, getTileFontSize, getTileFontWeight } from "../../utils/tileColors";
import type { TileSkin } from "../../types";

interface Props {
  tile: TileData;
  size: number;
  cellPx: number;
  gap: number;
  colorblind: boolean;
  tileSkin?: TileSkin;
  style?: React.CSSProperties;
}

const GAP = 8;

export const Tile: React.FC<Props> = ({ tile, size: _size, cellPx, colorblind, tileSkin = "classic", style }) => {
  const [bg, fg] = getTileColors(tile.value, colorblind, tileSkin);
  const baseRem = parseFloat(getTileFontSize(tile.value));
  const scale = Math.max(0.56, Math.min(1, cellPx / 80));
  const fontSize = `${(baseRem * scale).toFixed(3)}rem`;
  const fontWeight = getTileFontWeight(tile.value);

  const left = tile.col * (cellPx + GAP) + GAP;
  const top  = tile.row * (cellPx + GAP) + GAP;

  const cls = [
    "tile",
    `tile-v-${tile.value}`,
    tile.value >= 2048 ? "tile-v-2048plus" : "",
    tile.isNew ? "is-new" : "",
    tile.isMerged ? "is-merged" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      style={{
        left: style?.left ?? left,
        top: style?.top ?? top,
        width: cellPx,
        height: cellPx,
        background: bg,
        color: fg,
        fontSize,
        fontWeight,
        letterSpacing: tile.value >= 1000 ? `${(-0.035 * scale).toFixed(3)}em` : `${(-0.012 * scale).toFixed(3)}em`,
        lineHeight: tile.value >= 1000 ? 1.05 : 1,
      }}
      aria-label={`Tile ${tile.value}`}
    >
      {tile.value}
    </div>
  );
};
