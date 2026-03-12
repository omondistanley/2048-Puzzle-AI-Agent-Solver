export type MissionMetric = "max_tile" | "win_with_2_undos" | "games_played" | "daily_completions";
export type MissionScope = "daily" | "weekly";

export interface Mission {
  id: string;
  scope: MissionScope;
  title: string;
  desc: string;
  metric: MissionMetric;
  target: number;
  progress: number;
  done: boolean;
  rewardCoins: number;
}

export interface MissionState {
  dailyDate: string;
  weeklyKey: string;
  daily: Mission[];
  weekly: Mission[];
  totalCoinsAwarded: number;
}

export interface MissionRunContext {
  maxTile: number;
  won: boolean;
  undosUsed: number;
  isDaily: boolean;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekKey(input = new Date()) {
  const d = new Date(input);
  const day = (d.getUTCDay() + 6) % 7; // Monday=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function makeDailyMissions(dateIso: string): Mission[] {
  return [
    {
      id: `daily-max-1024-${dateIso}`,
      scope: "daily",
      title: "Reach 1024",
      desc: "Hit tile 1024 in any run today.",
      metric: "max_tile",
      target: 1024,
      progress: 0,
      done: false,
      rewardCoins: 20,
    },
    {
      id: `daily-win-undos-${dateIso}`,
      scope: "daily",
      title: "Precision Win",
      desc: "Win with 2 or fewer undos.",
      metric: "win_with_2_undos",
      target: 1,
      progress: 0,
      done: false,
      rewardCoins: 35,
    },
  ];
}

function makeWeeklyMissions(weekKey: string): Mission[] {
  return [
    {
      id: `weekly-games-${weekKey}`,
      scope: "weekly",
      title: "Weekly Grind",
      desc: "Finish 5 games this week.",
      metric: "games_played",
      target: 5,
      progress: 0,
      done: false,
      rewardCoins: 45,
    },
    {
      id: `weekly-daily-${weekKey}`,
      scope: "weekly",
      title: "Daily Devotion",
      desc: "Complete 3 daily challenge runs.",
      metric: "daily_completions",
      target: 3,
      progress: 0,
      done: false,
      rewardCoins: 60,
    },
  ];
}

export function createMissionState(now = new Date()): MissionState {
  const dailyDate = now.toISOString().slice(0, 10);
  const weeklyKey = getWeekKey(now);
  return {
    dailyDate,
    weeklyKey,
    daily: makeDailyMissions(dailyDate),
    weekly: makeWeeklyMissions(weeklyKey),
    totalCoinsAwarded: 0,
  };
}

export function normalizeMissionState(saved: MissionState | null): MissionState {
  const fresh = createMissionState();
  if (!saved) return fresh;
  const today = todayIso();
  const currentWeek = getWeekKey();
  return {
    ...saved,
    dailyDate: today,
    weeklyKey: currentWeek,
    daily: saved.dailyDate === today ? saved.daily : makeDailyMissions(today),
    weekly: saved.weeklyKey === currentWeek ? saved.weekly : makeWeeklyMissions(currentWeek),
    totalCoinsAwarded: saved.totalCoinsAwarded ?? 0,
  };
}

function updateMission(mission: Mission, run: MissionRunContext): Mission {
  if (mission.done) return mission;
  let progress = mission.progress;

  switch (mission.metric) {
    case "max_tile":
      progress = Math.max(progress, run.maxTile);
      break;
    case "win_with_2_undos":
      if (run.won && run.undosUsed <= 2) progress = 1;
      break;
    case "games_played":
      progress += 1;
      break;
    case "daily_completions":
      if (run.isDaily) progress += 1;
      break;
    default:
      break;
  }

  const done = progress >= mission.target;
  return { ...mission, progress, done };
}

export function applyRunToMissions(state: MissionState, run: MissionRunContext) {
  let coinsGained = 0;
  const completed: Mission[] = [];

  const daily = state.daily.map((mission) => {
    const before = mission.done;
    const next = updateMission(mission, run);
    if (!before && next.done) {
      coinsGained += mission.rewardCoins;
      completed.push(next);
    }
    return next;
  });

  const weekly = state.weekly.map((mission) => {
    const before = mission.done;
    const next = updateMission(mission, run);
    if (!before && next.done) {
      coinsGained += mission.rewardCoins;
      completed.push(next);
    }
    return next;
  });

  return {
    next: {
      ...state,
      daily,
      weekly,
      totalCoinsAwarded: state.totalCoinsAwarded + coinsGained,
    },
    completed,
    coinsGained,
  };
}
