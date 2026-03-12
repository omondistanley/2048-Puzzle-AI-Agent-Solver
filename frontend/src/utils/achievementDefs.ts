import type { Achievement, PlayerStats } from "../types";

export const ACHIEVEMENT_DEFS: Omit<Achievement, "unlocked" | "unlockedAt">[] = [
  { id: "tile_512",      icon: "🥉", name: "Getting Warm",    desc: "Reach tile 512" },
  { id: "tile_1024",     icon: "🥈", name: "Half Way",        desc: "Reach tile 1024" },
  { id: "tile_2048",     icon: "🥇", name: "2048!",           desc: "Reach tile 2048" },
  { id: "tile_4096",     icon: "💎", name: "Beyond 2048",     desc: "Reach tile 4096" },
  { id: "purist",        icon: "🎯", name: "Purist",          desc: "Finish with 0 undos" },
  { id: "speed_demon",   icon: "⚡", name: "Speed Demon",     desc: "Reach 2048 in Time Attack" },
  { id: "streak_7",      icon: "🔥", name: "7-Day Streak",    desc: "Complete 7 daily challenges" },
  { id: "century",       icon: "💯", name: "Century",         desc: "Play 100 games" },
  { id: "ai_student",    icon: "🤖", name: "AI Student",      desc: "Use hint 10 times" },
  { id: "centurion",     icon: "🛡️", name: "Centurion",       desc: "Make 100 moves in one game" },
  { id: "comeback_kid",  icon: "🫀", name: "Comeback Kid",    desc: "Win with ≤3 empty cells" },
  { id: "minimalist",    icon: "✌️",  name: "Minimalist",      desc: "Win using only 2 directions" },
  { id: "no_hints",      icon: "🙈", name: "No Hints",        desc: "Win without using any hints" },
  { id: "blitz",         icon: "🌪️", name: "Blitz",           desc: "Complete a Time Attack game" },
  { id: "combinator",    icon: "💥", name: "Combinator",      desc: "Make 3+ merges in a single move" },
];

export interface AchievementCheckContext {
  maxTile: number;
  undosUsed: number;
  undoBudget: number;
  isTimeAttack: boolean;
  isDaily: boolean;
  stats: PlayerStats;
  hintUses: number;
  dailyStreak: number;
  moveCount?: number;
  emptyCellsAtWin?: number;
  directionsUsed?: Set<number>;
  maxMergesInMove?: number;
  hintUsesThisGame?: number;
}

export function checkAchievements(
  ctx: AchievementCheckContext,
  unlocked: Set<string>,
): string[] {
  const newUnlocks: string[] = [];
  const add = (id: string) => { if (!unlocked.has(id)) newUnlocks.push(id); };

  if (ctx.maxTile >= 512)  add("tile_512");
  if (ctx.maxTile >= 1024) add("tile_1024");
  if (ctx.maxTile >= 2048) add("tile_2048");
  if (ctx.maxTile >= 4096) add("tile_4096");
  if (ctx.undosUsed === 0 && ctx.undoBudget === 0) add("purist");
  if (ctx.isTimeAttack && ctx.maxTile >= 2048) add("speed_demon");
  if (ctx.isTimeAttack) add("blitz");
  if (ctx.dailyStreak >= 7) add("streak_7");
  if (ctx.stats.gamesPlayed >= 100) add("century");
  if (ctx.hintUses >= 10) add("ai_student");
  if ((ctx.moveCount ?? 0) >= 100) add("centurion");
  if (ctx.maxTile >= 2048 && (ctx.emptyCellsAtWin ?? 99) <= 3) add("comeback_kid");
  if (ctx.maxTile >= 2048 && (ctx.directionsUsed?.size ?? 4) <= 2) add("minimalist");
  if (ctx.maxTile >= 2048 && (ctx.hintUsesThisGame ?? 99) === 0) add("no_hints");
  if ((ctx.maxMergesInMove ?? 0) >= 3) add("combinator");

  return newUnlocks;
}
