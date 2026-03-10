import { describe, expect, it } from "vitest";
import {
  bestLocalDirection,
  createLocalRng,
  localApplyMove,
  localMoveCore,
  localStarterGrid,
} from "./localEngine";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// Lightweight self-checks for local engine behavior. This can be invoked manually
// from browser devtools if needed: runLocalEngineSelfChecks()
export function runLocalEngineSelfChecks(): void {
  const rng = createLocalRng("seed-1");
  const grid = localStarterGrid(4, rng);
  const nonZero = grid.flat().filter((v) => v !== 0);
  assert(nonZero.length === 2, "starter grid should contain exactly two tiles");
  assert(nonZero.every((v) => v === 2 || v === 4), "starter tiles should be 2 or 4");

  const mergeGrid = [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const core = localMoveCore(mergeGrid, 2, 4);
  assert(core.moved, "left move should move tiles");
  assert(core.delta === 4, "left merge delta should be 4");
  assert(core.after[0][0] === 4, "merged tile should be at [0][0]");

  const seededA = createLocalRng("same-seed");
  const seededB = createLocalRng("same-seed");
  const moveInput = [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const a = localApplyMove(moveInput.map((r) => r.slice()), 3, 0, 4, seededA);
  const b = localApplyMove(moveInput.map((r) => r.slice()), 3, 0, 4, seededB);
  assert(JSON.stringify(a.grid) === JSON.stringify(b.grid), "seeded fallback should be deterministic");

  const dir = bestLocalDirection(moveInput, 4);
  assert(dir !== null, "best direction should exist for playable boards");
}

describe("localEngine", () => {
  it("creates deterministic starter grids for a given seed", () => {
    const a = localStarterGrid(4, createLocalRng("seed-1"));
    const b = localStarterGrid(4, createLocalRng("seed-1"));
    expect(a).toEqual(b);
    expect(a.flat().filter((v) => v !== 0).length).toBe(2);
  });

  it("merges tiles and updates delta/score correctly", () => {
    const result = localApplyMove(
      [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      2,
      0,
      4,
      createLocalRng("merge-seed"),
    );

    expect(result.moved).toBe(true);
    expect(result.delta).toBe(4);
    expect(result.score).toBe(4);
    expect(result.grid[0][0]).toBe(4);
  });

  it("returns null best direction when no moves are possible", () => {
    const blocked = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(bestLocalDirection(blocked, 4)).toBeNull();
  });
});
