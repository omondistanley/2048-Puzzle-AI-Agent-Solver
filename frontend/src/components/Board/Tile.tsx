import React from "react";
import type { TileData } from "../../types";
import { getTileColors, getTileFontSize } from "../../utils/tileColors";

interface Props {
  tile: TileData;
  size: number;
  cellPx: number;
  gap: number;
  colorblind: boolean;
  style?: React.CSSProperties;
}

const GAP = 8;

export const Tile: React.FC<Props> = ({ tile, size: _size, cellPx, colorblind, style }) => {
  const [bg, fg] = getTileColors(tile.value, colorblind);
  const fontSize = getTileFontSize(tile.value);

  const left = tile.col * (cellPx + GAP) + GAP;
  const top  = tile.row * (cellPx + GAP) + GAP;

  const cls = ["tile", tile.isNew ? "is-new" : "", tile.isMerged ? "is-merged" : ""]
    .filter(Boolean).join(" ");

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
      }}
      aria-label={`Tile ${tile.value}`}
    >
      {tile.value}
    </div>
  );
};
