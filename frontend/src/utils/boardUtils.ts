import type { GameGrid, TileData } from "../types";

let nextId = 1;
export function freshId() { return nextId++; }

export function emptyGrid(size: number): GameGrid {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function getMaxTile(grid: GameGrid): number {
  return Math.max(...grid.flat());
}

export function computeScore(grid: GameGrid): number {
  return grid.flat().reduce((a, b) => a + b, 0);
}

/** Build initial TileData list from a grid (new game). */
export function buildTiles(grid: GameGrid): TileData[] {
  const tiles: TileData[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== 0) {
        tiles.push({ id: freshId(), value: grid[r][c], row: r, col: c, isNew: true, isMerged: false });
      }
    }
  }
  return tiles;
}

/**
 * Reconcile existing tiles with a new grid after a move.
 * Returns the updated tile list with correct positions + animation flags.
 */
export function reconcileTiles(
  prev: TileData[],
  newGrid: GameGrid,
  mergedPositions: [number, number][],
  newTilePos: [number, number] | null,
  _newTileValue: number | null,
): TileData[] {
  const size = newGrid.length;
  const mergedSet = new Set(mergedPositions.map(([r, c]) => `${r},${c}`));
  const result: TileData[] = [];

  // Create a map from grid position → tile
  const posMap: Map<string, TileData> = new Map();
  for (const t of prev) {
    posMap.set(`${t.row},${t.col}`, t);
  }

  // For each non-zero cell in new grid, find or create tile
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = newGrid[r][c];
      if (val === 0) continue;
      const key = `${r},${c}`;
      const isMerged = mergedSet.has(key);
      const isNew = (newTilePos && newTilePos[0] === r && newTilePos[1] === c) ?? false;

      const existing = posMap.get(key);
      if (isNew) {
        result.push({ id: freshId(), value: val, row: r, col: c, isNew: true, isMerged: false });
      } else if (existing && existing.value === val) {
        result.push({ ...existing, row: r, col: c, isNew: false, isMerged });
      } else {
        result.push({ id: freshId(), value: val, row: r, col: c, isNew: false, isMerged });
      }
    }
  }

  return result;
}

export const DIRECTION_NAMES: Record<number, string> = {
  0: "Up", 1: "Down", 2: "Left", 3: "Right",
};

export const DIRECTION_ARROWS: Record<number, string> = {
  0: "↑", 1: "↓", 2: "←", 3: "→",
};
