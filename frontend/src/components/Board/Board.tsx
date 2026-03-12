import React, { useRef, useMemo, useEffect, useState } from "react";
import "./Board.css";
import { Tile } from "./Tile";
import type { TileData, GameGrid, Direction, TileSkin } from "../../types";
import { useSwipe } from "../../hooks/useSwipe";
import { getTileColors } from "../../utils/tileColors";

interface Props {
  tiles: TileData[];
  size: number;
  onSwipe: (dir: Direction) => void;
  colorblind: boolean;
  tileSkin?: TileSkin;
  hintGrid?: GameGrid | null;
  hintDirection?: Direction | null;
  enabled?: boolean;
}

const GAP = 8;
const MAX_CELL_PX = 80;
const MIN_CELL_PX = 34;

export const Board: React.FC<Props> = ({
  tiles, size, onSwipe, colorblind, tileSkin = "classic", hintGrid, hintDirection, enabled = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useSwipe(ref, onSwipe, enabled);

  const [viewportWidth, setViewportWidth] = useState(
    typeof window === "undefined" ? 390 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cellPx = useMemo(() => {
    const chromeAllowance = 48;
    const maxBoardPx = Math.max(260, Math.min(520, viewportWidth - chromeAllowance));
    const raw = Math.floor((maxBoardPx - (size + 1) * GAP) / size);
    return Math.max(MIN_CELL_PX, Math.min(MAX_CELL_PX, raw));
  }, [size, viewportWidth]);

  const boardPx = size * cellPx + (size + 1) * GAP;

  const cells = useMemo(() => {
    const arr = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        arr.push({ r, c });
    return arr;
  }, [size]);

  const dirArrow: Record<number, string> = { 0: "↑", 1: "↓", 2: "←", 3: "→" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
      {/* Main board */}
      <div
        ref={ref}
        className="board-container"
        style={{ width: boardPx, height: boardPx }}
        role="grid"
        aria-label="2048 game board"
      >
        {/* Background cells */}
        <div className="board-grid" style={{ width: boardPx, height: boardPx }}>
          {cells.map(({ r, c }) => (
            <div
              key={`cell-${r}-${c}`}
                className="board-cell"
                style={{
                left: c * (cellPx + GAP) + GAP,
                top: r * (cellPx + GAP) + GAP,
                width: cellPx,
                height: cellPx,
              }}
            />
          ))}

          {/* Tiles */}
          {tiles.map((t) => (
            <Tile
              key={t.id}
              tile={{ ...t, col: t.col, row: t.row }}
              size={size}
              cellPx={cellPx}
              gap={GAP + GAP / size}
              colorblind={colorblind}
              tileSkin={tileSkin}
              style={{ left: t.col * (cellPx + GAP) + GAP, top: t.row * (cellPx + GAP) + GAP }}
            />
          ))}

          {/* Hint direction overlay */}
          {hintDirection !== null && hintDirection !== undefined && (
            <div style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 72, color: "rgba(255,255,255,0.35)", pointerEvents: "none",
              borderRadius: 8,
            }}>
              {dirArrow[hintDirection]}
            </div>
          )}
        </div>
      </div>

      {/* Ghost preview board */}
      {hintGrid && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
            Ghost preview — AI suggests <strong>{["Up","Down","Left","Right"][hintDirection ?? 0]}</strong>
          </div>
          <GhostBoard grid={hintGrid} size={size} colorblind={colorblind} tileSkin={tileSkin} cellPx={cellPx} />
        </div>
      )}
    </div>
  );
};

const GhostBoard: React.FC<{ grid: GameGrid; size: number; colorblind: boolean; tileSkin: TileSkin; cellPx: number }> = ({ grid, size, colorblind, tileSkin, cellPx }) => {
  const smallCell = Math.max(20, Math.round(cellPx * 0.56));
  const smallGap = Math.max(3, Math.round(GAP * 0.65));
  const boardPx = size * smallCell + (size + 1) * smallGap;
  return (
    <div className="board-container ghost-board" style={{ width: boardPx, height: boardPx }}>
      <div className="board-grid" style={{ width: boardPx, height: boardPx }}>
        {grid.map((row, r) =>
          row.map((val, c) => {
            const [bg, fg] = getTileColors(val, colorblind, tileSkin);
            return (
              <div key={`g-${r}-${c}`} style={{
                position: "absolute",
                left: c * (smallCell + smallGap) + smallGap,
                top: r * (smallCell + smallGap) + smallGap,
                width: smallCell, height: smallCell,
                background: val ? bg : "var(--board-cell-bg)",
                borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 760, fontSize: Math.max(10, Math.round(smallCell * 0.3)), color: fg,
              }}>
                {val || ""}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
