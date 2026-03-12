import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ToastProvider, useToast } from "./components/shared/ToastManager";
import { Board } from "./components/Board/Board";
import { ModeSelector } from "./components/Controls/ModeSelector";
import { UndoButton } from "./components/Controls/UndoButton";
import { HintButton } from "./components/Controls/HintButton";
import { AIPanel } from "./components/Controls/AIPanel";
import { ReplayPanel } from "./components/Sidebar/ReplayPanel";
import { GameOverModal } from "./components/Modals/GameOverModal";
import { WinModal } from "./components/Modals/WinModal";
import { api } from "./api/endpoints";
import { useKeyboard } from "./hooks/useKeyboard";
import { useAudio } from "./hooks/useAudio";
import { useHaptics, HAPTIC, hapticForTile } from "./hooks/useHaptics";
import { lsGet, lsSet } from "./hooks/useLocalStorage";
import { checkAchievements, ACHIEVEMENT_DEFS } from "./utils/achievementDefs";
import {
  ACHIEVEMENT_COSMETIC_REWARDS,
  BOARD_THEMES,
  DEFAULT_COSMETICS,
  TILE_SKINS,
  unlockCosmetics,
  type CosmeticInventory,
} from "./utils/cosmetics";
import {
  applyRunToMissions,
  normalizeMissionState,
  type MissionState,
} from "./utils/missions";
import { getMaxTile } from "./utils/boardUtils";
import {
  bestLocalDirection,
  createLocalRng,
  localApplyMove,
  localMoveCore,
  localStarterGrid,
} from "./engine/localEngine";
import type { ChallengeMode, Direction, DiagnosticEvent, EngineMode, LocalRng, PlayerStats, ReplayRecord } from "./types";
import "./App.css";

type ScreenId = "gameplay" | "statistics" | "settings";
type StatsTab = "overview" | "replays";
type ChallengeCard = {
  id: ChallengeMode;
  label: string;
  icon: string;
  desc: string;
};
type HeatmapDay = { day: string; count: number };

const DAILY_HISTORY_KEY = "2048:daily-history";
const MISSIONS_KEY = "2048:missions";
const COSMETICS_KEY = "2048:cosmetics";

const CHALLENGES: ChallengeCard[] = [
  { id: "puzzle", label: "Puzzle", icon: "extension", desc: "Fixed starting board" },
  { id: "speed_run", label: "Speed Run", icon: "bolt", desc: "3-minute timer" },
  { id: "no_hint", label: "No-Hint", icon: "visibility_off", desc: "Hints disabled" },
];

const PUZZLE_BOARDS: number[][][] = [
  [
    [2, 0, 0, 2],
    [4, 8, 16, 0],
    [0, 32, 64, 0],
    [0, 0, 128, 256],
  ],
  [
    [0, 4, 0, 2],
    [2, 8, 16, 0],
    [4, 32, 64, 128],
    [0, 0, 256, 0],
  ],
  [
    [0, 2, 4, 8],
    [0, 16, 0, 32],
    [2, 64, 128, 0],
    [0, 256, 0, 0],
  ],
];

function getCurrentStreakCount() {
  const streakData = lsGet<{ count: number; lastDate: string }>("2048:streak", { count: 0, lastDate: "" });
  if (!streakData.lastDate) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return streakData.lastDate === today || streakData.lastDate === yesterday ? streakData.count : 0;
}

function isoDateDaysAgo(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

function GameApp() {
  const { state, dispatch } = useGame();
  const { settings, update } = useSettings();
  const { play } = useAudio(settings.sound);
  const { pulse } = useHaptics(settings.haptics);
  const { showToast } = useToast();
  const localRngRef = useRef<LocalRng>(createLocalRng("boot"));

  const [activeScreen, setActiveScreen] = useState<ScreenId>("gameplay");
  const [statsTab, setStatsTab] = useState<StatsTab>("overview");
  const [stats, setStats] = useState<PlayerStats>(() =>
    lsGet<PlayerStats>("2048:stats", { gamesPlayed: 0, wins: 0, scores: [], maxTiles: [], bestScore: 0 })
  );
  const [unlocked, setUnlocked] = useState<Set<string>>(() =>
    new Set(lsGet<string[]>("2048:achievements", []))
  );
  const [replays, setReplays] = useState<ReplayRecord[]>(() =>
    lsGet<ReplayRecord[]>("2048:replays", [])
  );
  const [hintUses, setHintUses] = useState(0);
  const [hintUsesThisGame, setHintUsesThisGame] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(() => getCurrentStreakCount());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>("server");
  const [diagnostics, setDiagnostics] = useState<DiagnosticEvent[]>([]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [dailyHistory, setDailyHistory] = useState<Record<string, number>>(() =>
    lsGet<Record<string, number>>(DAILY_HISTORY_KEY, {})
  );
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  const [missions, setMissions] = useState<MissionState>(() =>
    normalizeMissionState(lsGet<MissionState | null>(MISSIONS_KEY, null))
  );
  const [cosmetics, setCosmetics] = useState<CosmeticInventory>(() =>
    ({ ...DEFAULT_COSMETICS, ...lsGet<Partial<CosmeticInventory>>(COSMETICS_KEY, {}) })
  );
  // Track directions used this game for "Minimalist" achievement
  const directionsUsedRef = useRef<Set<number>>(new Set());
  // Track max merges in a single move for "Combinator" achievement
  const maxMergesInMoveRef = useRef(0);

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

  useEffect(() => {
    (window as Window & { __gameDiagnostics?: DiagnosticEvent[] }).__gameDiagnostics = diagnostics;
  }, [diagnostics]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.darkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-board-theme", settings.boardTheme);
    document.documentElement.setAttribute("data-tile-skin", settings.tileSkin);
  }, [settings.darkMode, settings.boardTheme, settings.tileSkin]);

  useEffect(() => {
    lsSet(DAILY_HISTORY_KEY, dailyHistory);
  }, [dailyHistory]);

  useEffect(() => {
    lsSet(MISSIONS_KEY, missions);
  }, [missions]);

  useEffect(() => {
    lsSet(COSMETICS_KEY, cosmetics);
  }, [cosmetics]);

  useEffect(() => {
    setMissions((prev) => normalizeMissionState(prev));
  }, []);

  // PWA app badge: show streak count on icon
  useEffect(() => {
    if ("setAppBadge" in navigator) {
      if (dailyStreak > 0) {
        (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(dailyStreak);
      } else {
        (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge?.();
      }
    }
  }, [dailyStreak]);

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

  const startGame = useCallback(async ({
    daily = false,
    timeAttack = false,
    challengeMode = "classic" as ChallengeMode,
    presetGrid,
  }: {
    daily?: boolean;
    timeAttack?: boolean;
    challengeMode?: ChallengeMode;
    presetGrid?: number[][];
  } = {}) => {
    const size = presetGrid ? presetGrid.length : settings.defaultSize;
    directionsUsedRef.current = new Set();
    maxMergesInMoveRef.current = 0;
    setHintUsesThisGame(0);
    let seed: number | undefined;

    if (daily) {
      try {
        const ds = await api.dailySeed();
        seed = ds.seed;
      } catch (err) {
        pushDiagnostic({
          action: "dailySeed", source: "api",
          message: `Daily seed failed. ${err instanceof Error ? err.message : "unknown error"}`,
        });
      }
    }

    const fallbackSeed = seed ?? Date.now();
    localRngRef.current = createLocalRng(fallbackSeed);

    if (presetGrid) {
      dispatch({
        type: "NEW_GAME",
        grid: presetGrid.map((row) => row.slice()),
        size,
        undoBudget: settings.undoBudget,
        isDaily: daily,
        seed: seed ?? null,
        timeAttack,
        challengeMode,
      });
      return;
    }

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
        challengeMode,
      });
    } catch (err) {
      switchToLocal("newGame", `New game API failed. ${err instanceof Error ? err.message : "unknown error"}`);
      dispatch({
        type: "NEW_GAME",
        grid: localStarterGrid(size, localRngRef.current),
        size,
        undoBudget: settings.undoBudget,
        isDaily: daily,
        seed: seed ?? null,
        timeAttack,
        challengeMode,
      });
    }
  }, [settings, dispatch, engineMode, markServerHealthy, pushDiagnostic, switchToLocal]);

  useEffect(() => {
    const hasRestorableGame = state.boardHistory.length > 0 && state.grid.some((row) => row.some((v) => v !== 0));
    if (!hasRestorableGame) {
      void startGame({});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doMove = useCallback(async (dir: Direction) => {
    if (state.over || (state.won && !state.wonAcknowledged)) return;
    directionsUsedRef.current.add(dir);

    // ── Optimistic update: apply slide locally right away ──────────────────
    const core = localMoveCore(state.grid, dir, state.size);
    if (!core.moved) { play("invalid"); pulse(HAPTIC.INVALID); return; }

    const mergeCount = core.merged_positions.length;
    if (mergeCount > maxMergesInMoveRef.current) maxMergesInMoveRef.current = mergeCount;

    // Build a local result without a new tile yet (tile will appear after server confirms)
    const optimisticResult = {
      grid: core.after,
      score: state.score + core.delta,
      delta: core.delta,
      over: false,
      won: Math.max(...core.after.flat()) >= 2048,
      moved: true,
      new_tile_pos: null as [number, number] | null,
      new_tile_value: null as number | null,
      merged_positions: core.merged_positions,
    };
    dispatch({ type: "MOVE_APPLIED", result: optimisticResult, direction: dir });

    if (optimisticResult.score > stats.bestScore) {
      play("newBest"); pulse(HAPTIC.NEW_BEST);
    } else if (mergeCount > 0) {
      play("merge", 2);
      pulse(HAPTIC.MERGE);
    } else {
      play("slide"); pulse(HAPTIC.SLIDE);
    }

    // ── Background: reconcile new tile from server (or local fallback) ─────
    if (engineMode === "server") {
      try {
        const result = await api.move(state.grid, dir, state.score, state.size);
        markServerHealthy("move");
        if (result.new_tile_pos && result.new_tile_value !== null) {
          dispatch({
            type: "PATCH_NEW_TILE",
            pos: result.new_tile_pos,
            value: result.new_tile_value,
            score: result.score,
            over: result.over,
            won: result.won,
          });
          // Update audio/haptic with real merged tile value now known
          if (mergeCount > 0) {
            const tileVal = result.new_tile_value ?? 2;
            pulse(tileVal >= 512 ? HAPTIC.MERGE_BIG : hapticForTile(tileVal));
          }
        }
        if (result.won && !state.won) { play("win"); pulse(HAPTIC.WIN); }
        if (result.over)              { play("over"); pulse(HAPTIC.OVER); }
      } catch (err) {
        switchToLocal("move", `Move API failed. ${err instanceof Error ? err.message : "unknown error"}`);
        // Spawn tile locally as fallback
        const localResult = localApplyMove(state.grid, dir, state.score, state.size, localRngRef.current);
        if (localResult.new_tile_pos && localResult.new_tile_value !== null) {
          dispatch({
            type: "PATCH_NEW_TILE",
            pos: localResult.new_tile_pos,
            value: localResult.new_tile_value,
            score: localResult.score,
            over: localResult.over,
            won: localResult.won,
          });
        }
        if (localResult.won && !state.won) { play("win"); pulse(HAPTIC.WIN); }
        if (localResult.over)              { play("over"); pulse(HAPTIC.OVER); }
      }
    } else {
      // Already in local mode — spawn tile from local RNG directly
      const localResult = localApplyMove(state.grid, dir, state.score, state.size, localRngRef.current);
      if (localResult.new_tile_pos && localResult.new_tile_value !== null) {
        dispatch({
          type: "PATCH_NEW_TILE",
          pos: localResult.new_tile_pos,
          value: localResult.new_tile_value,
          score: localResult.score,
          over: localResult.over,
          won: localResult.won,
        });
      }
      if (localResult.won && !state.won) { play("win"); pulse(HAPTIC.WIN); }
      if (localResult.over)              { play("over"); pulse(HAPTIC.OVER); }
    }
  }, [state, stats.bestScore, play, pulse, dispatch, engineMode, markServerHealthy, switchToLocal]);

  useKeyboard(
    doMove,
    activeScreen === "gameplay" && !state.over && (state.mode === "human" || state.mode === "ai_assist"),
    settings.wasd,
  );

  // AI local fallback loop
  useEffect(() => {
    if (engineMode !== "local") return;
    if (!state.aiRunning) return;
    if (!(state.mode === "ai_watch" || state.mode === "ai_assist")) return;
    if (state.over || (state.won && !state.wonAcknowledged)) return;

    const timer = window.setTimeout(() => {
      const next = bestLocalDirection(state.grid, state.size);
      if (next === null) { dispatch({ type: "AI_STOP" }); return; }
      void doMove(next);
    }, Math.max(80, state.aiSpeed));

    return () => window.clearTimeout(timer);
  }, [engineMode, state.aiRunning, state.mode, state.over, state.won, state.wonAcknowledged, state.grid, state.size, state.aiSpeed, dispatch, doMove]);

  // Health probe for server recovery
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
          if (okStreak >= 2) markServerHealthy("healthProbe");
        } else {
          okStreak = 0;
        }
      } catch { okStreak = 0; }
    };
    tick();
    const id = window.setInterval(tick, 8000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [engineMode, markServerHealthy]);

  // Sync hint uses
  useEffect(() => {
    setHintUses(state.hintUses);
    setHintUsesThisGame(h => state.hintUses > h ? state.hintUses : h);
  }, [state.hintUses]);

  // Save on game over + check achievements
  const savedRef = useRef(false);
  useEffect(() => {
    if (state.over && !savedRef.current && state.boardHistory.length > 0) {
      savedRef.current = true;
      const maxTile = getMaxTile(state.grid);
      const emptyCells = state.grid.flat().filter(v => v === 0).length;

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
        snapshots: state.boardHistory.slice(0, 200),
        isDaily: state.isDaily,
      };
      const newReplays = [...replays, replay].slice(-20);
      setReplays(newReplays);
      lsSet("2048:replays", newReplays);

      const newUnlocks = checkAchievements({
        maxTile,
        undosUsed: state.undosUsed,
        undoBudget: state.undoBudget,
        isTimeAttack: state.timeAttackEnd !== null,
        isDaily: state.isDaily,
        stats: newStats,
        hintUses,
        dailyStreak,
        moveCount: state.moveHistory.length,
        emptyCellsAtWin: emptyCells,
        directionsUsed: directionsUsedRef.current,
        maxMergesInMove: maxMergesInMoveRef.current,
        hintUsesThisGame,
      }, unlocked);

      const missionResult = applyRunToMissions(
        normalizeMissionState(missions),
        {
          maxTile,
          won: maxTile >= 2048,
          undosUsed: state.undosUsed,
          isDaily: state.isDaily,
        },
      );
      setMissions(missionResult.next);

      let nextCosmetics: CosmeticInventory = {
        ...cosmetics,
        coins: cosmetics.coins + missionResult.coinsGained,
      };

      if (missionResult.coinsGained > 0) {
        missionResult.completed.forEach((mission) => {
          showToast("🎯", `Mission Complete: ${mission.title}`, `+${mission.rewardCoins} coins`);
        });
      }

      if (newUnlocks.length > 0) {
        const next = new Set([...unlocked, ...newUnlocks]);
        setUnlocked(next);
        lsSet("2048:achievements", [...next]);
        // Show a toast for each new achievement
        newUnlocks.forEach(id => {
          const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
          if (def) showToast(def.icon, `Achievement: ${def.name}`, def.desc);
        });

        const cosmeticRewards = newUnlocks
          .map((id) => ACHIEVEMENT_COSMETIC_REWARDS[id])
          .filter((reward): reward is NonNullable<typeof reward> => !!reward);

        if (cosmeticRewards.length > 0) {
          const unlockResult = unlockCosmetics(nextCosmetics, cosmeticRewards);
          nextCosmetics = unlockResult.next;
          if (unlockResult.coinsGained > 0) {
            showToast("🪙", "Bonus Coins", `+${unlockResult.coinsGained} from achievements`);
          }
          unlockResult.unlockedThemeNames.forEach((theme) => {
            showToast("🎨", "Theme Unlocked", theme);
          });
          unlockResult.unlockedSkinNames.forEach((skin) => {
            showToast("🧩", "Tile Skin Unlocked", skin);
          });
        }
      }

      setCosmetics(nextCosmetics);

      const today = new Date().toISOString().slice(0, 10);
      const streakData = lsGet<{ count: number; lastDate: string }>("2048:streak", { count: 0, lastDate: "" });
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (streakData.lastDate !== today) {
        const newCount = streakData.lastDate === yesterday ? streakData.count + 1 : 1;
        lsSet("2048:streak", { count: newCount, lastDate: today });
        setDailyStreak(newCount);
      }
      setDailyHistory((prev) => ({ ...prev, [today]: (prev[today] ?? 0) + 1 }));
    }
    if (!state.over) savedRef.current = false;
  }, [state.over]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxTile = getMaxTile(state.grid);
  const bestTile = stats.maxTiles.length > 0 ? Math.max(...stats.maxTiles) : 0;

  const statsSummary = useMemo(() => {
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
    const avgScore = stats.scores.length > 0
      ? Math.round(stats.scores.reduce((sum, value) => sum + value, 0) / stats.scores.length)
      : 0;
    const avgTile = stats.maxTiles.length > 0
      ? Math.round(stats.maxTiles.reduce((sum, value) => sum + value, 0) / stats.maxTiles.length)
      : 0;
    return { winRate, avgScore, avgTile };
  }, [stats]);

  const heatmapDays = useMemo(() => {
    return Array.from({ length: 84 }, (_, idx) => {
      const day = isoDateDaysAgo(83 - idx);
      const count = dailyHistory[day] ?? 0;
      return { day, count };
    });
  }, [dailyHistory]);

  const missionCounts = useMemo(() => {
    const all = [...missions.daily, ...missions.weekly];
    const done = all.filter((m) => m.done).length;
    return { done, total: all.length };
  }, [missions]);
  const activePuzzleBoard = useMemo(
    () => ((puzzleIndex + PUZZLE_BOARDS.length - 1) % PUZZLE_BOARDS.length) + 1,
    [puzzleIndex],
  );

  const runNewGame = () => {
    setActiveScreen("gameplay");
    void startGame({ challengeMode: "classic" });
  };

  const runChallenge = (challenge: ChallengeMode) => {
    setActiveScreen("gameplay");
    if (challenge === "puzzle") {
      const nextPuzzle = (puzzleIndex + 1) % PUZZLE_BOARDS.length;
      const board = PUZZLE_BOARDS[puzzleIndex];
      setPuzzleIndex(nextPuzzle);
      void startGame({ challengeMode: "puzzle", presetGrid: board });
      return;
    }
    if (challenge === "speed_run") {
      void startGame({ challengeMode: "speed_run", timeAttack: true });
      return;
    }
    if (challenge === "no_hint") {
      const nextMode = !state.noHintMode;
      dispatch({ type: "TOGGLE_NO_HINT_MODE" });
      showToast(
        nextMode ? "🙈" : "👁️",
        nextMode ? "No-Hint Enabled" : "No-Hint Disabled",
        nextMode ? "Hints are now disabled for this run." : "Hints are available again.",
      );
      return;
    }
  };

  const saveAndBackToGame = () => {
    setActiveScreen("gameplay");
  };

  const equipOrUnlockTheme = (theme: (typeof BOARD_THEMES)[number]) => {
    const alreadyUnlocked = cosmetics.unlockedThemes.includes(theme.id);
    if (alreadyUnlocked) {
      update({ boardTheme: theme.id });
      return;
    }
    if (cosmetics.coins < theme.cost) {
      showToast("🔒", "Theme Locked", `${theme.cost - cosmetics.coins} more coins needed`);
      return;
    }
    setCosmetics((prev) => ({
      ...prev,
      coins: prev.coins - theme.cost,
      unlockedThemes: prev.unlockedThemes.includes(theme.id)
        ? prev.unlockedThemes
        : [...prev.unlockedThemes, theme.id],
    }));
    update({ boardTheme: theme.id });
    showToast("🎨", "Theme Unlocked", `${theme.name} equipped`);
  };

  const equipOrUnlockSkin = (skin: (typeof TILE_SKINS)[number]) => {
    const alreadyUnlocked = cosmetics.unlockedSkins.includes(skin.id);
    if (alreadyUnlocked) {
      update({ tileSkin: skin.id });
      return;
    }
    if (cosmetics.coins < skin.cost) {
      showToast("🔒", "Skin Locked", `${skin.cost - cosmetics.coins} more coins needed`);
      return;
    }
    setCosmetics((prev) => ({
      ...prev,
      coins: prev.coins - skin.cost,
      unlockedSkins: prev.unlockedSkins.includes(skin.id)
        ? prev.unlockedSkins
        : [...prev.unlockedSkins, skin.id],
    }));
    update({ tileSkin: skin.id });
    showToast("🧩", "Skin Unlocked", `${skin.name} equipped`);
  };

  return (
    <div className="app-shell">
      <div className="screen-scroll">
        {activeScreen === "gameplay" && (
          <section className="screen gameplay-screen">
            <header className="game-header">
              <button
                className="game-brand"
                onClick={() => window.location.reload()}
                aria-label="Reload game"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 10 }}
              >
                <div className="brand-icon"><Icon name="grid_view" /></div>
                <div style={{ textAlign: "left" }}>
                  <h1>2048 AI</h1>
                  <p>{engineMode === "local" ? "Local engine active" : "Server engine active"}</p>
                </div>
              </button>
              <button
                className="icon-pill icon-only"
                onClick={() => { setStatsTab("overview"); setActiveScreen("statistics"); }}
                aria-label="Open menu"
              >
                <Icon name="menu" />
              </button>
            </header>

            <div className="score-cards">
              <article className="score-card">
                <span>Score</span>
                <strong>{state.score.toLocaleString()}</strong>
              </article>
              <article className="score-card">
                <span>Best</span>
                <strong>{stats.bestScore.toLocaleString()}</strong>
              </article>
            </div>

            <div className="primary-actions single">
              <button className="btn game-btn game-btn-subtle" onClick={runNewGame}>
                <Icon name="replay" className="btn-icon" />
                New Game
              </button>
            </div>

            <section className="play-setup-card">
              <div className="setup-row">
                <span className="setup-label">Play Mode</span>
                <ModeSelector compact />
              </div>
              <div className="setup-row">
                <span className="setup-label">Challenge</span>
                <div className="challenge-strip compact">
                  {CHALLENGES.map((challenge) => {
                    const active = challenge.id === "no_hint"
                      ? state.noHintMode
                      : state.challengeMode === challenge.id;
                    const label = challenge.id === "puzzle" && active
                      ? `Puzzle ${activePuzzleBoard}`
                      : challenge.id === "no_hint" && active
                        ? "No-Hint On"
                        : challenge.label;
                    return (
                      <button
                        key={challenge.id}
                        className={`challenge-chip${active ? " active" : ""}`}
                        onClick={() => runChallenge(challenge.id)}
                        title={challenge.desc}
                      >
                        <Icon name={challenge.icon} className="challenge-icon" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {timeLeft !== null && (
              <div className={`time-attack ${timeLeft < 30 ? "urgent" : timeLeft < 60 ? "warn" : "ok"}`}>
                <Icon name="timer" className="timer-icon" />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
            )}

            <div aria-live="polite" aria-atomic="true" className="sr-only">
              Score: {state.score}, Max tile: {maxTile}
            </div>

            <div className="board-wrap">
              <Board
                tiles={state.tiles}
                size={state.size}
                onSwipe={doMove}
                colorblind={settings.colorblind}
                tileSkin={settings.tileSkin}
                hintGrid={state.hintGrid}
                hintDirection={state.hintDirection}
                enabled={activeScreen === "gameplay" && !state.over && (state.mode === "human" || state.mode === "ai_assist")}
              />
            </div>

            <div className="controls-wrap">
              {(state.mode === "human" || state.mode === "ai_assist") && (
                <div className="human-controls-row">
                  {!state.noHintMode && <HintButton />}
                  <UndoButton />
                </div>
              )}
              <AIPanel />
              {state.mode === "human" && (
                <p className="keyboard-hint">Arrow keys, WASD, or swipe</p>
              )}
            </div>
          </section>
        )}

        {activeScreen === "statistics" && (
          <section className="screen panel-screen">
            <header className="panel-header">
              <button className="icon-pill icon-only" onClick={() => setActiveScreen("gameplay")} aria-label="Back to gameplay">
                <Icon name="arrow_back" />
              </button>
              <h2>Statistics</h2>
              <button className="icon-pill icon-only" onClick={() => setActiveScreen("settings")} aria-label="Open settings">
                <Icon name="settings" />
              </button>
            </header>

            <div className="tab-switch">
              <button
                className={`tab-btn${statsTab === "overview" ? " active" : ""}`}
                onClick={() => setStatsTab("overview")}
              >
                <Icon name="monitoring" className="tab-icon" />
                Overview
              </button>
              <button
                className={`tab-btn${statsTab === "replays" ? " active" : ""}`}
                onClick={() => setStatsTab("replays")}
              >
                <Icon name="history" className="tab-icon" />
                Replays
              </button>
            </div>

            {statsTab === "overview" && (
              <>
                <section className="panel-card streak-card">
                  <span><Icon name="local_fire_department" />Consistency streak</span>
                  <strong>{dailyStreak} day{dailyStreak === 1 ? "" : "s"}</strong>
                </section>

                <section className="panel-card">
                  <h3 className="section-heading"><Icon name="task_alt" />Daily / Weekly Missions</h3>
                  <div className="mission-summary-row">
                    <div>
                      <strong>{missionCounts.done}/{missionCounts.total}</strong>
                      <span>completed</span>
                    </div>
                    <div>
                      <strong>{cosmetics.coins}</strong>
                      <span>coins</span>
                    </div>
                  </div>
                  <div className="mission-list">
                    {[...missions.daily, ...missions.weekly].map((mission) => (
                      <article key={mission.id} className={`mission-item${mission.done ? " done" : ""}`}>
                        <div className="mission-title-row">
                          <strong>{mission.title}</strong>
                          <span>{mission.scope}</span>
                        </div>
                        <p>{mission.desc}</p>
                        <div className="mission-progress-track">
                          <div
                            className="mission-progress-fill"
                            style={{ width: `${Math.min(100, Math.round((mission.progress / mission.target) * 100))}%` }}
                          />
                        </div>
                        <div className="mission-meta-row">
                          <span>{Math.min(mission.progress, mission.target)}/{mission.target}</span>
                          <span>+{mission.rewardCoins} coins</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel-card">
                  <div className="section-head-row">
                    <h3 className="section-heading"><Icon name="calendar_month" />Streak Heatmap</h3>
                    <button className="section-toggle" onClick={() => setHeatmapExpanded((prev) => !prev)}>
                      {heatmapExpanded ? "Collapse" : "Expand"}
                    </button>
                  </div>
                  {heatmapExpanded ? (
                    <StreakHeatmap days={heatmapDays} />
                  ) : (
                    <p className="collapsed-note">Heatmap is collapsed. Expand to view daily consistency.</p>
                  )}
                </section>

                <section className="panel-card">
                  <h3 className="section-heading"><Icon name="equalizer" />Performance</h3>
                  <div className="stats-grid">
                    <StatCard label="Games" value={stats.gamesPlayed.toLocaleString()} />
                    <StatCard label="Win Rate" value={`${statsSummary.winRate}%`} />
                    <StatCard label="Avg Score" value={statsSummary.avgScore.toLocaleString()} />
                    <StatCard label="Avg Tile" value={statsSummary.avgTile.toLocaleString()} />
                    <StatCard label="Best Score" value={stats.bestScore.toLocaleString()} />
                    <StatCard label="Best Tile" value={bestTile > 0 ? bestTile.toLocaleString() : "-"} />
                  </div>
                </section>

                <section className="panel-card">
                  <h3 className="section-heading"><Icon name="emoji_events" />Achievements</h3>
                  <div className="achievement-list">
                    {ACHIEVEMENT_DEFS.map((achievement) => {
                      const done = unlocked.has(achievement.id);
                      return (
                        <article key={achievement.id} className={`achievement-item${done ? " unlocked" : ""}`}>
                          <div className="achievement-icon">
                            <Icon name={done ? "check_circle" : "lock"} />
                          </div>
                          <div>
                            <strong>{achievement.name}</strong>
                            <p>{achievement.desc}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {statsTab === "replays" && (
              <section className="panel-card">
                <ReplayPanel replays={replays} colorblind={settings.colorblind} tileSkin={settings.tileSkin} />
              </section>
            )}
          </section>
        )}

        {activeScreen === "settings" && (
          <section className="screen panel-screen">
            <header className="panel-header">
              <button className="icon-pill icon-only" onClick={() => setActiveScreen("gameplay")} aria-label="Back to gameplay">
                <Icon name="arrow_back" />
              </button>
              <h2>Settings</h2>
              <button className="btn btn-accent compact-btn" onClick={saveAndBackToGame}>
                <Icon name="save" className="btn-icon" />
                Save
              </button>
            </header>

            <section className="panel-card">
              <h3 className="section-heading"><Icon name="tune" />Game Experience</h3>
              <ToggleRow label="Dark Mode" icon="dark_mode" enabled={settings.darkMode} onToggle={() => update({ darkMode: !settings.darkMode })} />
              <ToggleRow label="Colorblind Mode" icon="palette" enabled={settings.colorblind} onToggle={() => update({ colorblind: !settings.colorblind })} />
              <ToggleRow label="Sound Effects" icon="volume_up" enabled={settings.sound} onToggle={() => update({ sound: !settings.sound })} />
              <ToggleRow label="Haptic Feedback" icon="vibration" enabled={settings.haptics} onToggle={() => update({ haptics: !settings.haptics })} />
            </section>

            <section className="panel-card">
              <h3 className="section-heading"><Icon name="psychology" />AI Configuration</h3>
              <ToggleRow label="AI Explain Panel" icon="tips_and_updates" enabled={settings.aiExplain} onToggle={() => update({ aiExplain: !settings.aiExplain })} />
              <div className="setting-group">
                <label className="setting-label">AI Strategy</label>
                <div className="chip-grid two">
                  <button
                    className={`chip-btn${state.strategy === "deep" ? " active" : ""}`}
                    onClick={() => dispatch({ type: "SET_STRATEGY", strategy: "deep" })}
                  >
                    Expectiminimax
                  </button>
                  <button
                    className={`chip-btn${state.strategy === "greedy" ? " active" : ""}`}
                    onClick={() => dispatch({ type: "SET_STRATEGY", strategy: "greedy" })}
                  >
                    Greedy
                  </button>
                </div>
              </div>
            </section>

            <section className="panel-card">
              <h3 className="section-heading"><Icon name="sports_score" />Game Rules</h3>
              <div className="setting-group">
                <label className="setting-label">Undo Budget: {settings.undoBudget}</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={settings.undoBudget}
                  onChange={(event) => update({ undoBudget: Number(event.target.value) })}
                />
              </div>
              <div className="setting-group">
                <label className="setting-label">Default Board Size</label>
                <div className="chip-grid four">
                  {[3, 4, 5, 6].map((size) => (
                    <button
                      key={size}
                      className={`chip-btn${settings.defaultSize === size ? " active" : ""}`}
                      onClick={() => update({ defaultSize: size })}
                    >
                      {size}x{size}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel-card">
              <h3 className="section-heading"><Icon name="palette" />Cosmetics</h3>
              <div className="wallet-chip">
                <Icon name="paid" />
                <span>{cosmetics.coins} coins</span>
              </div>
              <div className="setting-group">
                <label className="setting-label">Board Theme</label>
                <div className="chip-grid three">
                  {BOARD_THEMES.map((theme) => {
                    const unlockedTheme = cosmetics.unlockedThemes.includes(theme.id);
                    const selected = settings.boardTheme === theme.id;
                    const canUnlock = !unlockedTheme && cosmetics.coins >= theme.cost;
                    return (
                      <button
                        key={theme.id}
                        className={`chip-btn${selected ? " active" : ""}${!unlockedTheme ? " locked" : ""}${canUnlock ? " can-unlock" : ""}`}
                        onClick={() => equipOrUnlockTheme(theme)}
                        title={unlockedTheme ? theme.name : `Locked (${theme.cost} coins)`}
                      >
                        {theme.name}
                        {!unlockedTheme && (
                          <span className="chip-lock">
                            <Icon name="lock" />
                            {theme.cost}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="setting-group">
                <label className="setting-label">Tile Skin</label>
                <div className="chip-grid three">
                  {TILE_SKINS.map((skin) => {
                    const unlockedSkin = cosmetics.unlockedSkins.includes(skin.id);
                    const selected = settings.tileSkin === skin.id;
                    const canUnlock = !unlockedSkin && cosmetics.coins >= skin.cost;
                    return (
                      <button
                        key={skin.id}
                        className={`chip-btn${selected ? " active" : ""}${!unlockedSkin ? " locked" : ""}${canUnlock ? " can-unlock" : ""}`}
                        onClick={() => equipOrUnlockSkin(skin)}
                        title={unlockedSkin ? skin.name : `Locked (${skin.cost} coins)`}
                      >
                        {skin.name}
                        {!unlockedSkin && (
                          <span className="chip-lock">
                            <Icon name="lock" />
                            {skin.cost}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="panel-card">
              <h3 className="section-heading"><Icon name="visibility" />Visuals &amp; Controls</h3>
              <ToggleRow label="Reduce Animations" icon="animation" enabled={settings.reducedMotion} onToggle={() => update({ reducedMotion: !settings.reducedMotion })} />
              <ToggleRow label="WASD Movement Keys" icon="keyboard" enabled={settings.wasd} onToggle={() => update({ wasd: !settings.wasd })} />
            </section>
          </section>
        )}
      </div>

      <BottomNav
        activeScreen={activeScreen}
        statsTab={statsTab}
        onGame={() => setActiveScreen("gameplay")}
        onStats={() => { setStatsTab("overview"); setActiveScreen("statistics"); }}
        onReplays={() => { setStatsTab("replays"); setActiveScreen("statistics"); }}
        onSettings={() => setActiveScreen("settings")}
      />

      {activeScreen === "gameplay" && state.over && (
        <GameOverModal
          score={state.score}
          maxTile={maxTile}
          moveCount={state.moveHistory.length}
          onPlayAgain={runNewGame}
        />
      )}
      {activeScreen === "gameplay" && state.won && !state.wonAcknowledged && !state.over && (
        <WinModal
          score={state.score}
          onKeepGoing={() => dispatch({ type: "ACKNOWLEDGE_WIN" })}
          onEnd={() => dispatch({ type: "TIME_ATTACK_EXPIRE" })}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StreakHeatmap({ days }: { days: HeatmapDay[] }) {
  const weeks = useMemo(() => {
    const chunks: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [days]);

  const maxCount = useMemo(() => days.reduce((max, item) => Math.max(max, item.count), 0), [days]);

  const levelFor = (count: number) => {
    if (count <= 0) return 0;
    if (maxCount <= 1) return 4;
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 4;
    if (ratio >= 0.55) return 3;
    if (ratio >= 0.3) return 2;
    return 1;
  };

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-month-row" aria-hidden="true">
        {weeks.map((week, idx) => {
          const month = new Date(`${week[0].day}T00:00:00`).toLocaleDateString(undefined, { month: "short" });
          const prevMonth = idx > 0
            ? new Date(`${weeks[idx - 1][0].day}T00:00:00`).toLocaleDateString(undefined, { month: "short" })
            : "";
          return <span key={`month-${week[0].day}`}>{idx === 0 || month !== prevMonth ? month : ""}</span>;
        })}
      </div>

      <div className="heatmap-grid" role="grid" aria-label="Daily consistency activity heatmap">
        {weeks.map((week) => (
          <div className="heatmap-column" role="row" key={`week-${week[0].day}`}>
            {week.map((item) => {
              const level = levelFor(item.count);
              return (
                <div
                  key={item.day}
                  role="gridcell"
                  className={`heatmap-cell level-${level}`}
                  aria-label={`${item.day}: ${item.count} daily challenge run${item.count === 1 ? "" : "s"}`}
                  title={`${item.day}: ${item.count} daily run${item.count === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="heatmap-legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={`legend-${level}`} className={`heatmap-swatch level-${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  icon,
  enabled,
  onToggle,
}: {
  label: string;
  icon?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="toggle-row">
      <span className="toggle-label">
        {icon ? <Icon name={icon} className="row-icon" /> : null}
        {label}
      </span>
      <button
        className={`toggle-switch${enabled ? " enabled" : ""}`}
        onClick={onToggle}
        aria-pressed={enabled}
      >
        <span />
      </button>
    </div>
  );
}

function BottomNav({
  activeScreen,
  statsTab,
  onGame,
  onStats,
  onReplays,
  onSettings,
}: {
  activeScreen: ScreenId;
  statsTab: StatsTab;
  onGame: () => void;
  onStats: () => void;
  onReplays: () => void;
  onSettings: () => void;
}) {
  const replayActive = activeScreen === "statistics" && statsTab === "replays";
  const statsActive = activeScreen === "statistics" && statsTab === "overview";

  return (
    <nav className="bottom-nav">
      <button className={`nav-btn${activeScreen === "gameplay" ? " active" : ""}`} onClick={onGame} aria-label="Gameplay">
        <Icon name="home" />
        <span>Game</span>
      </button>
      <button className={`nav-btn${statsActive ? " active" : ""}`} onClick={onStats} aria-label="Statistics">
        <Icon name="emoji_events" />
        <span>Stats</span>
      </button>
      <button className={`nav-btn${replayActive ? " active" : ""}`} onClick={onReplays} aria-label="Replays">
        <Icon name="history" />
        <span>Replay</span>
      </button>
      <button className={`nav-btn${activeScreen === "settings" ? " active" : ""}`} onClick={onSettings} aria-label="Settings">
        <Icon name="settings" />
        <span>Settings</span>
      </button>
    </nav>
  );
}

function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined${className ? ` ${className}` : ""}`} aria-hidden="true">{name}</span>;
}

export default function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <ToastProvider>
          <GameApp />
        </ToastProvider>
      </GameProvider>
    </SettingsProvider>
  );
}
