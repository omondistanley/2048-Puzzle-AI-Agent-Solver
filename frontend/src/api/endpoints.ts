import { apiGet, apiPost } from "./client";
import type { MoveResult, HintResult, AnalysisResult, GameGrid, Direction, Strategy } from "../types";

export const api = {
  newGame: (size: number, daily = false, seed?: number) =>
    apiPost<{ grid: GameGrid; seed: number | null }>("/api/game/new", { size, daily, seed }),

  move: (grid: GameGrid, direction: Direction, score: number, size: number) =>
    apiPost<MoveResult>("/api/game/move", { grid, direction, score, size }),

  hint: (grid: GameGrid, size: number, strategy: Strategy = "deep", wEmpty = 2.0, wMono = 1.0, wSmooth = 1.0) =>
    apiPost<HintResult>("/api/game/hint", { grid, size, strategy, w_empty: wEmpty, w_mono: wMono, w_smooth: wSmooth }),

  analysis: (grid: GameGrid, size: number) =>
    apiPost<AnalysisResult>("/api/game/analysis", { grid, size }),

  dailySeed: () =>
    apiGet<{ seed: number; date: string }>("/api/game/daily-seed"),
};
