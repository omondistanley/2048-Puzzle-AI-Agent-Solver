import React, { useRef, useMemo } from "react";
import "./Board.css";
import { Tile } from "./Tile";
import type { TileData, GameGrid, Direction } from "../../types";
import { useSwipe } from "../../hooks/useSwipe";
import { getTileColors } from "../../utils/tileColors";

interface Props {
  tiles: TileData[];
  size: number;
  onSwipe: (dir: Direction) => void;
  colorblind: boolean;
  hintGrid?: GameGrid | null;
  hintDirection?: Direction | null;
  enabled?: boolean;
}

const GAP = 8;
const CELL_PX = 80;

export const Board: React.FC<Props> = ({
  tiles, size, onSwipe, colorblind, hintGrid, hintDirection, enabled = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useSwipe(ref, onSwipe, enabled);

  const boardPx = size * CELL_PX + (size + 1) * GAP;

  const cells = useMemo(() => {
    const arr = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        arr.push({ r, c });
    return arr;
  }, [size]);

  const dirArrow: Record<number, string> = { 0: "↑", 1: "↓", 2: "←", 3: "→" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
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
                left: c * (CELL_PX + GAP) + GAP,
                top: r * (CELL_PX + GAP) + GAP,
                width: CELL_PX,
                height: CELL_PX,
              }}
            />
          ))}

          {/* Tiles */}
          {tiles.map((t) => (
            <Tile
              key={t.id}
              tile={{ ...t, col: t.col, row: t.row }}
              size={size}
              cellPx={CELL_PX}
              gap={GAP + GAP / size}
              colorblind={colorblind}
              style={{ left: t.col * (CELL_PX + GAP) + GAP, top: t.row * (CELL_PX + GAP) + GAP }}
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
          <GhostBoard grid={hintGrid} size={size} colorblind={colorblind} />
        </div>
      )}
    </div>
  );
};

const SMALL_CELL = 48;
const SMALL_GAP = 5;

const GhostBoard: React.FC<{ grid: GameGrid; size: number; colorblind: boolean }> = ({ grid, size, colorblind }) => {
  const boardPx = size * SMALL_CELL + (size + 1) * SMALL_GAP;
  return (
    <div className="board-container ghost-board" style={{ width: boardPx, height: boardPx }}>
      <div className="board-grid" style={{ width: boardPx, height: boardPx }}>
        {grid.map((row, r) =>
          row.map((val, c) => {
            const [bg, fg] = getTileColors(val, colorblind);
            return (
              <div key={`g-${r}-${c}`} style={{
                position: "absolute",
                left: c * (SMALL_CELL + SMALL_GAP) + SMALL_GAP,
                top: r * (SMALL_CELL + SMALL_GAP) + SMALL_GAP,
                width: SMALL_CELL, height: SMALL_CELL,
                background: val ? bg : "rgba(238,228,218,0.35)",
                borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold", fontSize: 14, color: fg,
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
