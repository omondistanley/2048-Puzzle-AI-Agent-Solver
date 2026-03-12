export type GameGrid = number[][];
export type Direction = 0 | 1 | 2 | 3; // 0=UP 1=DOWN 2=LEFT 3=RIGHT
export type GameMode = "human" | "ai_watch" | "ai_assist";
export type Strategy = "deep" | "greedy";
export type EngineMode = "server" | "local";
export type ChallengeMode = "classic" | "puzzle" | "speed_run" | "no_hint";
export type BoardTheme = "violet" | "midnight" | "sunrise";
export type TileSkin = "classic" | "glass" | "neon";

export interface DiagnosticEvent {
  id: string;
  ts: string;
  action: string;
  source: "api" | "ws" | "local";
  message: string;
}

export interface LocalRng {
  next: () => number;
  seed: string;
}

export interface TileData {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  isMerged: boolean;
  prevRow?: number;
  prevCol?: number;
}

export interface UndoEntry {
  grid: GameGrid;
  score: number;
}

export interface HeuristicScores {
  up: number;
  down: number;
  left: number;
  right: number;
}

export interface MoveResult {
  grid: GameGrid;
  score: number;
  delta: number;
  over: boolean;
  won: boolean;
  moved: boolean;
  new_tile_pos: [number, number] | null;
  new_tile_value: number | null;
  merged_positions: [number, number][];
}

export interface HintResult {
  direction: Direction;
  heuristic_scores: HeuristicScores;
  empty: number;
  monotonicity: number;
  smoothness: number;
}

export interface AnalysisResult {
  scores: HeuristicScores;
  best_direction: Direction;
}

export interface ReplayRecord {
  id: string;
  date: string;
  size: number;
  finalScore: number;
  maxTile: number;
  moves: Direction[];
  snapshots: GameGrid[];
  isDaily: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  scores: number[];
  maxTiles: number[];
  bestScore: number;
}

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface Settings {
  darkMode: boolean;
  colorblind: boolean;
  reducedMotion: boolean;
  sound: boolean;
  haptics: boolean;
  aiExplain: boolean;
  undoBudget: number;
  defaultSize: number;
  wasd: boolean;
  boardTheme: BoardTheme;
  tileSkin: TileSkin;
}

export interface WSMoveMessage {
  type: "move";
  direction: Direction;
  grid: GameGrid;
  score: number;
  delta: number;
  over: boolean;
  won: boolean;
  new_tile_pos: [number, number] | null;
  new_tile_value: number | null;
  merged_positions: [number, number][];
}

export interface WSStatusMessage {
  type: "status";
  status: "thinking" | "paused" | "done" | "stopped";
}

export interface WSErrorMessage {
  type: "error";
  message: string;
}

export type WSMessage = WSMoveMessage | WSStatusMessage | WSErrorMessage;
