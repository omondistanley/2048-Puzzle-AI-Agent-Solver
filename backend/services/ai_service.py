import sys
import os
import asyncio
import math
import types

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from Grid import Grid
from IntelligentAgent import IntelligentAgent
from .game_service import grid_from_list


class GreedyAgent:
    def getMove(self, grid: Grid):
        best_move, best_val = None, float("-inf")
        for move, next_state in grid.getAvailableMoves():
            val = self._h(next_state)
            if val > best_val:
                best_val, best_move = val, move
        return best_move

    def _h(self, grid: Grid) -> float:
        empty = len(grid.getAvailableCells())
        mx = max(c for row in grid.map for c in row) or 1
        return math.log2(mx) + empty * 2


def _build_agent(
    strategy: str = "deep",
    w_empty: float = 2.0,
    w_mono: float = 1.0,
    w_smooth: float = 1.0,
):
    if strategy == "greedy":
        return GreedyAgent()
    agent = IntelligentAgent()
    _we, _wm, _ws = w_empty, w_mono, w_smooth

    def _patched(self, g, we=_we, wm=_wm, ws=_ws):
        empty = len(g.getAvailableCells())
        mx = max(c for row in g.map for c in row) or 1
        return math.log2(mx) + we * empty + wm * self.monotocity(g) + ws * self.smoothness(g)

    agent.heuristicValue = types.MethodType(_patched, agent)
    return agent


def _compute_move_sync(
    grid_data: list[list[int]], size: int, strategy: str, w_empty: float, w_mono: float, w_smooth: float
) -> int:
    g = grid_from_list(grid_data, size)
    agent = _build_agent(strategy, w_empty, w_mono, w_smooth)
    return agent.getMove(g)


async def compute_move_async(
    grid_data: list[list[int]], size: int,
    strategy: str = "deep",
    w_empty: float = 2.0, w_mono: float = 1.0, w_smooth: float = 1.0,
) -> int:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _compute_move_sync, grid_data, size, strategy, w_empty, w_mono, w_smooth
    )


def compute_heuristic_all_directions(
    grid_data: list[list[int]], size: int,
    w_empty: float = 2.0, w_mono: float = 1.0, w_smooth: float = 1.0,
) -> dict:
    """One-ply heuristic per direction. Fast (<5ms). Used for analysis panel."""
    dir_names = {0: "up", 1: "down", 2: "left", 3: "right"}
    agent = _build_agent("deep", w_empty, w_mono, w_smooth)
    scores: dict[str, float] = {}
    for d in range(4):
        g = grid_from_list(grid_data, size)
        moved = g.move(d)
        if moved:
            try:
                scores[dir_names[d]] = agent.heuristicValue(g)
            except Exception:
                scores[dir_names[d]] = float("-inf")
        else:
            scores[dir_names[d]] = float("-inf")
    return scores
