import { useCallback, useEffect, useRef, useState } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { Board } from "./components/Board/Board";
import { Header } from "./components/Header/Header";
import { ModeSelector } from "./components/Controls/ModeSelector";
import { UndoButton } from "./components/Controls/UndoButton";
import { HintButton } from "./components/Controls/HintButton";
import { AIPanel } from "./components/Controls/AIPanel";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { GameOverModal } from "./components/Modals/GameOverModal";
import { WinModal } from "./components/Modals/WinModal";
import { api } from "./api/endpoints";
import { useKeyboard } from "./hooks/useKeyboard";
import { useAudio } from "./hooks/useAudio";
import { useHaptics } from "./hooks/useHaptics";
import { lsGet, lsSet } from "./hooks/useLocalStorage";
import { checkAchievements } from "./utils/achievementDefs";
import { getMaxTile } from "./utils/boardUtils";
import {
  bestLocalDirection,
  createLocalRng,
  localApplyMove,
  localStarterGrid,
} from "./engine/localEngine";
import type { Direction, DiagnosticEvent, EngineMode, LocalRng, PlayerStats, ReplayRecord } from "./types";
import "./App.css";

function GameApp() {
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  const { play } = useAudio(settings.sound);
  const { pulse } = useHaptics(settings.haptics);
  const localRngRef = useRef<LocalRng>(createLocalRng("boot"));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<PlayerStats>(() =>
    lsGet<PlayerStats>("2048:stats", {
      gamesPlayed: 0, wins: 0, scores: [], maxTiles: [], bestScore: 0,
    })
  );
  const [unlocked, setUnlocked] = useState<Set<string>>(() =>
    new Set(lsGet<string[]>("2048:achievements", []))
  );
  const [replays, setReplays] = useState<ReplayRecord[]>(() =>
    lsGet<ReplayRecord[]>("2048:replays", [])
  );
  const [hintUses, setHintUses] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(() =>
    lsGet<{ count: number; lastDate: string }>("2048:streak", { count: 0, lastDate: "" }).count
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>("server");
  const [diagnostics, setDiagnostics] = useState<DiagnosticEvent[]>([]);

  const pushDiagnostic = useCallback((event: Omit<DiagnosticEvent, "id" | "ts">) => {
    const entry: DiagnosticEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      ...event,
    };
    setDiagnostics((prev) => [...prev.slice(-14), entry]);
  }, []);

  const switchToLocal = useCallback((action: string, message: string) => {
    setEngineMode("local");
    pushDiagnostic({ action, source: "local", message });
  }, [pushDiagnostic]);

  const markServerHealthy = useCallback((action: string) => {
    setEngineMode("server");
    pushDiagnostic({ action, source: "api", message: "Recovered to server mode" });
  }, [pushDiagnostic]);

  // Keep diagnostics available for debugging without surfacing mode switches in UI.
  useEffect(() => {
    (window as Window & { __gameDiagnostics?: DiagnosticEvent[] }).__gameDiagnostics = diagnostics;
  }, [diagnostics]);

  // Toggle app-wide theme tokens.
  useEffect(() => {
    const theme = settings.darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, [settings.darkMode]);

  // Time attack countdown
  useEffect(() => {
    if (!state.timeAttackEnd) { setTimeLeft(null); return; }
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((state.timeAttackEnd! - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) dispatch({ type: "TIME_ATTACK_EXPIRE" });
    }, 500);
    return () => clearInterval(id);
  }, [state.timeAttackEnd]);

  const startGame = useCallback(async (daily = false, timeAttack = false) => {
    const size = settings.defaultSize;
    let seed: number | undefined;
    if (daily) {
      try {
        const ds = await api.dailySeed();
        seed = ds.seed;
      } catch (err) {
        pushDiagnostic({
          action: "dailySeed",
          source: "api",
          message: `Daily seed failed, using local seed. ${err instanceof Error ? err.message : "unknown error"}`,
        });
      }
    }

    // Keep local fallback deterministic per game/session.
    const fallbackSeed = seed ?? Date.now();
    localRngRef.current = createLocalRng(fallbackSeed);

    try {
      const res = await api.newGame(size, daily, seed);
      if (engineMode !== "server") markServerHealthy("newGame");
      dispatch({
        type: "NEW_GAME",
        grid: res.grid,
        size,
        undoBudget: settings.undoBudget,
        isDaily: daily,
        seed: res.seed ?? null,
        timeAttack,
      });
    } catch (err) {
      // Fallback for mobile/local network hiccups so the board still initializes.
      switchToLocal(
        "newGame",
        `New game API failed, using local initializer. ${err instanceof Error ? err.message : "unknown error"}`,
      );
      dispatch({
        type: "NEW_GAME",
        grid: localStarterGrid(size, localRngRef.current),
        size,
        undoBudget: settings.undoBudget,
        isDaily: daily,
        seed: seed ?? null,
        timeAttack,
      });
    }
  }, [settings, dispatch, engineMode, markServerHealthy, pushDiagnostic, switchToLocal]);

  // Initial game
  useEffect(() => { startGame(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doMove = useCallback(async (dir: Direction) => {
    if (state.over || (state.won && !state.wonAcknowledged)) return;
    try {
      const result = await api.move(state.grid, dir, state.score, state.size);
      if (engineMode !== "server") markServerHealthy("move");
      if (!result.moved) { play("invalid"); pulse(8); return; }
      dispatch({ type: "MOVE_APPLIED", result, direction: dir });

      if (result.score > stats.bestScore) {
        play("newBest");
        pulse([18, 40, 18]);
      } else if (result.merged_positions.length > 0) {
        play("merge", result.new_tile_value ?? 2);
        pulse(12);
      } else {
        play("slide");
      }

      if (result.won && !state.won) {
        play("win");
        pulse([24, 45, 24, 45, 24]);
      }
      if (result.over) {
        play("over");
        pulse([30, 35, 30]);
      }
    } catch (err) {
      const result = localApplyMove(state.grid, dir, state.score, state.size, localRngRef.current);
      switchToLocal(
        "move",
        `Move API failed, using local engine. ${err instanceof Error ? err.message : "unknown error"}`,
      );
      if (!result.moved) { play("invalid"); pulse(8); return; }
      dispatch({ type: "MOVE_APPLIED", result, direction: dir });

      if (result.score > stats.bestScore) {
        play("newBest");
        pulse([18, 40, 18]);
      } else if (result.merged_positions.length > 0) {
        play("merge", result.new_tile_value ?? 2);
        pulse(12);
      } else {
        play("slide");
      }

      if (result.won && !state.won) {
        play("win");
        pulse([24, 45, 24, 45, 24]);
      }
      if (result.over) {
        play("over");
        pulse([30, 35, 30]);
      }
    }
  }, [state, stats.bestScore, play, pulse, dispatch, engineMode, markServerHealthy, switchToLocal]);

  useKeyboard(doMove, !state.over && (state.mode === "human" || state.mode === "ai_assist"), settings.wasd);

  // AI fallback loop for mobile/offline cases where backend/WebSocket is unavailable.
  useEffect(() => {
    if (engineMode !== "local") return;
    if (!state.aiRunning) return;
    if (!(state.mode === "ai_watch" || state.mode === "ai_assist")) return;
    if (state.over || (state.won && !state.wonAcknowledged)) return;

    const timer = window.setTimeout(() => {
      const next = bestLocalDirection(state.grid, state.size);
      if (next === null) {
        dispatch({ type: "AI_STOP" });
        return;
      }
      void doMove(next);
    }, Math.max(80, state.aiSpeed));

    return () => window.clearTimeout(timer);
  }, [
    engineMode,
    state.aiRunning,
    state.mode,
    state.over,
    state.won,
    state.wonAcknowledged,
    state.grid,
    state.size,
    state.aiSpeed,
    dispatch,
    doMove,
  ]);

  // Health probe: automatically recover to server mode after consecutive healthy checks.
  useEffect(() => {
    if (engineMode !== "local") return;

    let cancelled = false;
    let okStreak = 0;
    const tick = async () => {
      try {
        const ctrl = new AbortController();
        const t = window.setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch("/api/health", { signal: ctrl.signal });
        window.clearTimeout(t);
        if (!cancelled && res.ok) {
          okStreak += 1;
          if (okStreak >= 2) {
            markServerHealthy("healthProbe");
          }
        } else {
          okStreak = 0;
        }
      } catch {
        okStreak = 0;
      }
    };

    tick();
    const id = window.setInterval(tick, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [engineMode, markServerHealthy]);

  // Hint use counter
  useEffect(() => {
    setHintUses(state.hintUses);
  }, [state.hintUses]);

  // Save on game over
  const savedRef = useRef(false);
  useEffect(() => {
    if (state.over && !savedRef.current && state.boardHistory.length > 0) {
      savedRef.current = true;
      const maxTile = getMaxTile(state.grid);

      const newStats: PlayerStats = {
        gamesPlayed: stats.gamesPlayed + 1,
        wins: stats.wins + (maxTile >= 2048 ? 1 : 0),
        scores: [...stats.scores, state.score],
        maxTiles: [...stats.maxTiles, maxTile],
        bestScore: Math.max(stats.bestScore, state.score),
      };
      setStats(newStats);
      lsSet("2048:stats", newStats);

      const replay: ReplayRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        size: state.size,
        finalScore: state.score,
        maxTile,
        moves: state.moveHistory,
        snapshots: state.boardHistory.slice(0, 200), // cap size
        isDaily: state.isDaily,
      };
      const newReplays = [...replays, replay].slice(-20);
      setReplays(newReplays);
      lsSet("2048:replays", newReplays);

      const newUnlocks = checkAchievements({
        maxTile, undosUsed: state.undosUsed, undoBudget: state.undoBudget,
        isTimeAttack: state.timeAttackEnd !== null, isDaily: state.isDaily,
        stats: newStats, hintUses, dailyStreak,
      }, unlocked);

      if (newUnlocks.length > 0) {
        const next = new Set([...unlocked, ...newUnlocks]);
        setUnlocked(next);
        lsSet("2048:achievements", [...next]);
      }

      if (state.isDaily) {
        const today = new Date().toISOString().slice(0, 10);
        const streakData = lsGet<{ count: number; lastDate: string }>("2048:streak", { count: 0, lastDate: "" });
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newCount = streakData.lastDate === yesterday ? streakData.count + 1 : 1;
        lsSet("2048:streak", { count: newCount, lastDate: today });
        setDailyStreak(newCount);
      }
    }
    if (!state.over) savedRef.current = false;
  }, [state.over]);

  const maxTile = getMaxTile(state.grid);

  return (
    <div className="app-shell">
      <Header
        onNewGame={() => startGame()}
        onDailyGame={() => startGame(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
        bestScore={stats.bestScore}
      />

      {/* Time attack timer */}
      {timeLeft !== null && (
        <div className={`time-attack ${timeLeft < 30 ? "urgent" : timeLeft < 60 ? "warn" : "ok"}`}>
          ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      )}

      {/* ARIA live region */}
      <div aria-live="polite" aria-atomic="true"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
        Score: {state.score}, Max tile: {maxTile}
      </div>

      <ModeSelector />

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Board
          tiles={state.tiles}
          size={state.size}
          onSwipe={doMove}
          colorblind={settings.colorblind}
          hintGrid={state.hintGrid}
          hintDirection={state.hintDirection}
          enabled={!state.over && (state.mode === "human" || state.mode === "ai_assist")}
        />
      </div>

      {/* Human controls */}
      {(state.mode === "human" || state.mode === "ai_assist") && (
        <div className="human-controls-row">
          <UndoButton />
          <HintButton />
        </div>
      )}

      {/* AI panel */}
      <AIPanel />

      {/* Keyboard hint */}
      {state.mode === "human" && (
        <p className="keyboard-hint">
          Arrow keys · WASD · swipe to move
        </p>
      )}

      {/* Modals */}
      {state.over && (
        <GameOverModal score={state.score} maxTile={maxTile} onPlayAgain={() => startGame()} />
      )}
      {state.won && !state.wonAcknowledged && !state.over && (
        <WinModal
          score={state.score}
          onKeepGoing={() => dispatch({ type: "ACKNOWLEDGE_WIN" })}
          onEnd={() => dispatch({ type: "TIME_ATTACK_EXPIRE" })}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        stats={stats}
        bestScore={stats.bestScore}
        unlocked={unlocked}
        replays={replays}
        colorblind={settings.colorblind}
        dailyStreak={dailyStreak}
      />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <GameApp />
      </GameProvider>
    </SettingsProvider>
  );
}
