import React, { createContext, useContext, useReducer } from "react";
import type {
  GameGrid, Direction, GameMode, Strategy,
  UndoEntry, HintResult, AnalysisResult, TileData, WSMoveMessage,
  MoveResult,
} from "../types";
import { buildTiles, reconcileTiles } from "../utils/boardUtils";

// ── State ────────────────────────────────────────────────────────────────────
export interface GameState {
  grid: GameGrid;
  tiles: TileData[];
  score: number;
  size: number;
  over: boolean;
  won: boolean;
  wonAcknowledged: boolean;
  mode: GameMode;
  undoStack: UndoEntry[];
  undoBudget: number;
  hintDirection: Direction | null;
  hintGrid: GameGrid | null;
  analysisScores: AnalysisResult | null;
  moveHistory: Direction[];
  boardHistory: GameGrid[];
  isDaily: boolean;
  dailySeed: number | null;
  timeAttackEnd: number | null;   // unix ms timestamp
  aiRunning: boolean;
  aiSpeed: number;                // ms between moves
  strategy: Strategy;
  hintUses: number;
  undosUsed: number;
}

// ── Actions ───────────────────────────────────────────────────────────────────
type Action =
  | { type: "NEW_GAME"; grid: GameGrid; size: number; undoBudget: number; isDaily: boolean; seed: number | null; timeAttack: boolean }
  | { type: "MOVE_APPLIED"; result: MoveResult; direction: Direction }
  | { type: "AI_MOVE"; msg: WSMoveMessage }
  | { type: "UNDO" }
  | { type: "SET_HINT"; hint: HintResult; hintGrid: GameGrid }
  | { type: "CLEAR_HINT" }
  | { type: "SET_ANALYSIS"; analysis: AnalysisResult }
  | { type: "AI_START" }
  | { type: "AI_PAUSE" }
  | { type: "AI_STOP" }
  | { type: "SET_SPEED"; speed: number }
  | { type: "SET_MODE"; mode: GameMode }
  | { type: "SET_STRATEGY"; strategy: Strategy }
  | { type: "ACKNOWLEDGE_WIN" }
  | { type: "TIME_ATTACK_EXPIRE" };

// ── Reducer ───────────────────────────────────────────────────────────────────
function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "NEW_GAME": {
      const tiles = buildTiles(action.grid);
      return {
        ...state,
        grid: action.grid,
        tiles,
        score: 0,
        size: action.size,
        over: false,
        won: false,
        wonAcknowledged: false,
        undoStack: [],
        undoBudget: action.undoBudget,
        undosUsed: 0,
        hintDirection: null,
        hintGrid: null,
        analysisScores: null,
        moveHistory: [],
        boardHistory: [action.grid],
        isDaily: action.isDaily,
        dailySeed: action.seed,
        timeAttackEnd: action.timeAttack ? Date.now() + 3 * 60 * 1000 : null,
        aiRunning: false,
        hintUses: state.hintUses,
      };
    }

    case "MOVE_APPLIED": {
      const r = action.result;
      if (!r.moved) return state;
      const newStack = r.over || r.won
        ? state.undoStack
        : [...state.undoStack.slice(-(state.undoBudget - 1)), { grid: state.grid, score: state.score }];
      const newTiles = reconcileTiles(
        state.tiles, r.grid,
        r.merged_positions as [number, number][],
        r.new_tile_pos, r.new_tile_value,
      );
      return {
        ...state,
        grid: r.grid,
        tiles: newTiles,
        score: r.score,
        over: r.over,
        won: r.won && !state.won,
        undoStack: newStack,
        hintDirection: null,
        hintGrid: null,
        moveHistory: [...state.moveHistory, action.direction],
        boardHistory: [...state.boardHistory, r.grid],
      };
    }

    case "AI_MOVE": {
      const msg = action.msg;
      const newTiles = reconcileTiles(
        state.tiles, msg.grid,
        msg.merged_positions as [number, number][],
        msg.new_tile_pos, msg.new_tile_value,
      );
      return {
        ...state,
        grid: msg.grid,
        tiles: newTiles,
        score: msg.score,
        over: msg.over,
        won: msg.won && !state.won,
        moveHistory: [...state.moveHistory, msg.direction],
        boardHistory: [...state.boardHistory, msg.grid],
        aiRunning: !msg.over && !msg.won,
      };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      const newTiles = buildTiles(prev.grid);
      return {
        ...state,
        grid: prev.grid,
        tiles: newTiles,
        score: prev.score,
        over: false,
        undoStack: state.undoStack.slice(0, -1),
        undosUsed: state.undosUsed + 1,
        hintDirection: null,
        hintGrid: null,
      };
    }

    case "SET_HINT":
      return {
        ...state,
        hintDirection: action.hint.direction,
        hintGrid: action.hintGrid,
        hintUses: state.hintUses + 1,
      };

    case "CLEAR_HINT":
      return { ...state, hintDirection: null, hintGrid: null };

    case "SET_ANALYSIS":
      return { ...state, analysisScores: action.analysis };

    case "AI_START":
      return { ...state, aiRunning: true };
    case "AI_PAUSE":
      return { ...state, aiRunning: false };
    case "AI_STOP":
      return { ...state, aiRunning: false };

    case "SET_SPEED":
      return { ...state, aiSpeed: action.speed };

    case "SET_MODE":
      return { ...state, mode: action.mode, aiRunning: false };

    case "SET_STRATEGY":
      return { ...state, strategy: action.strategy };

    case "ACKNOWLEDGE_WIN":
      return { ...state, wonAcknowledged: true };

    case "TIME_ATTACK_EXPIRE":
      return { ...state, over: true };

    default:
      return state;
  }
}

// ── Initial state ──────────────────────────────────────────────────────────────
const emptyGrid4: GameGrid = Array.from({ length: 4 }, () => Array(4).fill(0));

const initialState: GameState = {
  grid: emptyGrid4,
  tiles: [],
  score: 0,
  size: 4,
  over: false,
  won: false,
  wonAcknowledged: false,
  mode: "human",
  undoStack: [],
  undoBudget: 3,
  hintDirection: null,
  hintGrid: null,
  analysisScores: null,
  moveHistory: [],
  boardHistory: [],
  isDaily: false,
  dailySeed: null,
  timeAttackEnd: null,
  aiRunning: false,
  aiSpeed: 500,
  strategy: "deep",
  hintUses: 0,
  undosUsed: 0,
};

// ── Context ───────────────────────────────────────────────────────────────────
interface GameCtx {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

const Ctx = createContext<GameCtx>({ state: initialState, dispatch: () => {} });

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
export type { Action };
