import seedrandom from "seedrandom";
import type { Direction, HeuristicScores, LocalRng, MoveResult } from "../types";

export function createLocalRng(seed?: string | number): LocalRng {
  const resolvedSeed = String(seed ?? Date.now());
  const rng = seedrandom(resolvedSeed);
  return {
    seed: resolvedSeed,
    next: () => rng(),
  };
}

export function emptyCells(grid: number[][]): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

export function localStarterGrid(size: number, rng: LocalRng): number[][] {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push([r, c]);
  }

  for (let i = 0; i < 2 && cells.length > 0; i++) {
    const pick = Math.floor(rng.next() * cells.length);
    const [r, c] = cells.splice(pick, 1)[0];
    grid[r][c] = rng.next() < 0.9 ? 2 : 4;
  }

  return grid;
}

function slideLine(line: number[]): { out: number[]; mergedAt: number[]; delta: number } {
  const compact = line.filter((v) => v !== 0);
  const out: number[] = [];
  const mergedAt: number[] = [];
  let delta = 0;

  for (let i = 0; i < compact.length; i++) {
    if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
      const v = compact[i] * 2;
      out.push(v);
      mergedAt.push(out.length - 1);
      delta += v;
      i++;
    } else {
      out.push(compact[i]);
    }
  }

  while (out.length < line.length) out.push(0);
  return { out, mergedAt, delta };
}

export function localMoveCore(grid: number[][], direction: Direction, size: number): {
  after: number[][];
  moved: boolean;
  merged_positions: [number, number][];
  delta: number;
} {
  const before = grid.map((row) => row.slice());
  const after = grid.map((row) => row.slice());
  const merged_positions: [number, number][] = [];
  let delta = 0;

  const writeRow = (r: number, vals: number[]) => {
    for (let c = 0; c < size; c++) after[r][c] = vals[c];
  };
  const writeCol = (c: number, vals: number[]) => {
    for (let r = 0; r < size; r++) after[r][c] = vals[r];
  };

  if (direction === 2 || direction === 3) {
    for (let r = 0; r < size; r++) {
      const src = direction === 2 ? before[r].slice() : before[r].slice().reverse();
      const res = slideLine(src);
      delta += res.delta;
      if (direction === 2) {
        writeRow(r, res.out);
        res.mergedAt.forEach((c) => merged_positions.push([r, c]));
      } else {
        const rev = res.out.slice().reverse();
        writeRow(r, rev);
        res.mergedAt.forEach((idx) => merged_positions.push([r, size - 1 - idx]));
      }
    }
  } else {
    for (let c = 0; c < size; c++) {
      const col = Array.from({ length: size }, (_, r) => before[r][c]);
      const src = direction === 0 ? col : col.slice().reverse();
      const res = slideLine(src);
      delta += res.delta;
      if (direction === 0) {
        writeCol(c, res.out);
        res.mergedAt.forEach((r) => merged_positions.push([r, c]));
      } else {
        const rev = res.out.slice().reverse();
        writeCol(c, rev);
        res.mergedAt.forEach((idx) => merged_positions.push([size - 1 - idx, c]));
      }
    }
  }

  const moved = JSON.stringify(before) !== JSON.stringify(after);
  return { after, moved, merged_positions, delta };
}

function hasMove(grid: number[][], size: number): boolean {
  if (emptyCells(grid).length > 0) return true;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if ((r + 1 < size && grid[r + 1][c] === v) || (c + 1 < size && grid[r][c + 1] === v)) {
        return true;
      }
    }
  }
  return false;
}

function localHeuristic(grid: number[][]): number {
  const empty = emptyCells(grid).length;
  const mx = Math.max(...grid.flat(), 1);
  return Math.log2(mx) + empty * 2;
}

export function localHeuristicScores(grid: number[][], size: number): HeuristicScores {
  const out: HeuristicScores = {
    up: Number.NEGATIVE_INFINITY,
    down: Number.NEGATIVE_INFINITY,
    left: Number.NEGATIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
  };
  const dirToKey: Record<Direction, keyof HeuristicScores> = {
    0: "up",
    1: "down",
    2: "left",
    3: "right",
  };

  for (const d of [0, 1, 2, 3] as Direction[]) {
    const core = localMoveCore(grid, d, size);
    if (!core.moved) continue;
    out[dirToKey[d]] = localHeuristic(core.after);
  }

  return out;
}

export function bestLocalDirection(grid: number[][], size: number): Direction | null {
  const scores = localHeuristicScores(grid, size);
  const entries = Object.entries(scores).filter(([, v]) => Number.isFinite(v));
  if (entries.length === 0) return null;
  const [bestKey] = entries.sort((a, b) => b[1] - a[1])[0];
  const keyToDir: Record<string, Direction> = { up: 0, down: 1, left: 2, right: 3 };
  return keyToDir[bestKey] ?? null;
}

export function localApplyMove(
  grid: number[][],
  direction: Direction,
  score: number,
  size: number,
  rng: LocalRng,
): MoveResult {
  const core = localMoveCore(grid, direction, size);
  const after = core.after;
  const moved = core.moved;
  const merged_positions = core.merged_positions;
  const delta = core.delta;
  let new_tile_pos: [number, number] | null = null;
  let new_tile_value: number | null = null;

  if (moved) {
    const cells = emptyCells(after);
    if (cells.length > 0) {
      new_tile_pos = cells[Math.floor(rng.next() * cells.length)];
      new_tile_value = rng.next() < 0.9 ? 2 : 4;
      after[new_tile_pos[0]][new_tile_pos[1]] = new_tile_value;
    }
  }

  const maxTile = Math.max(...after.flat());
  return {
    grid: after,
    score: score + delta,
    delta,
    over: !hasMove(after, size),
    won: maxTile >= 2048,
    moved,
    new_tile_pos,
    new_tile_value,
    merged_positions,
  };
}
