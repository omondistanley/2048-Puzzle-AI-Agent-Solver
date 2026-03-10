import sys
import os
import random
import hashlib
from datetime import date
from copy import deepcopy
from typing import Optional

# Ensure root-level Python files are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from Grid import Grid


def grid_from_list(data: list[list[int]], size: int) -> Grid:
    g = Grid(size)
    g.map = [row[:] for row in data]
    return g


def daily_seed() -> int:
    d = date.today().strftime("%Y%m%d")
    return int(hashlib.md5(d.encode()).hexdigest()[:8], 16)


def new_game(size: int = 4, seed: Optional[int] = None) -> tuple[list[list[int]], Optional[int]]:
    """Create a fresh grid with 2 random tiles. Returns (grid_map, seed_used)."""
    rng = random.Random(seed) if seed is not None else random
    g = Grid(size)
    cells = g.getAvailableCells()
    for _ in range(2):
        if cells:
            pos = rng.choice(cells)
            cells.remove(pos)
            g.setCellValue(pos, 2 if rng.random() < 0.9 else 4)
    return g.map, seed


def apply_move(
    grid_data: list[list[int]], direction: int, score: int, size: int
) -> dict:
    """Apply a move + spawn a random tile. Returns full MoveResponse dict."""
    g = grid_from_list(grid_data, size)

    before = deepcopy(g.map)
    moved = g.move(direction)
    after = g.map

    merged_positions: list[list[int]] = []
    delta = 0
    if moved:
        for r in range(size):
            for c in range(size):
                if after[r][c] > before[r][c] and after[r][c] != 0:
                    merged_positions.append([r, c])
                    delta += after[r][c]

        # Spawn new tile (90% → 2, 10% → 4)
        cells = g.getAvailableCells()
        new_pos = None
        new_val = None
        if cells:
            new_pos = list(random.choice(cells))
            new_val = 2 if random.random() < 0.9 else 4
            g.setCellValue(new_pos, new_val)

    over = not g.canMove()
    won = g.getMaxTile() >= 2048

    return {
        "grid": g.map,
        "score": score + delta,
        "delta": delta,
        "over": over,
        "won": won,
        "moved": moved,
        "new_tile_pos": new_pos,
        "new_tile_value": new_val,
        "merged_positions": merged_positions,
    }
